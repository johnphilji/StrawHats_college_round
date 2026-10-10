import { createHash, createHmac, randomBytes, sign as cryptoSign, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env';
import { badRequest, conflict, forbidden, notFound, AppError } from '../shared/errors/AppError';
import type { AuthenticatedUser } from '../shared/types/api';

const API = 'https://api.github.com';
const MAX_FILE_BYTES = 256 * 1024;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.less', '.json', '.html', '.svg', '.md', '.mdx', '.vue', '.svelte']);
const BLOCKED_NAMES = /^(\.env(?:\..*|rc)?|\.npmrc|\.pypirc|\.netrc|.*\.(?:pem|key|p12|pfx|keystore))$|(?:credential|secret|password|private[-_]?key|access[-_]?token|service[-_]?account|firebase-adminsdk|id_(?:rsa|ed25519|ecdsa))/i;
const BLOCKED_DIRECTORIES = new Set(['.ssh', 'credentials', 'secrets', 'private', 'keys']);
const WRITE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.less', '.json', '.html', '.svg', '.md', '.mdx', '.vue', '.svelte']);
const MAX_WRITE_FILES = 25;
const MAX_WRITE_FILE_BYTES = 128 * 1024;
const MAX_WRITE_TOTAL_BYTES = 450 * 1024;

type GithubInstallation = { id: number; account?: { id: number; login: string; type: string }; repository_selection?: string };
type GithubRepository = { id: number; name: string; full_name: string; private: boolean; description: string | null; html_url: string; default_branch: string; owner: { login: string } };
type GithubContent = { type: string; size: number; encoding: string; content: string; path: string };
type SetupState = { userId: string; githubAccountId: string; exp: number; nonce: string };
type StoredSetupState = Omit<SetupState, 'nonce'> & { status: 'pending' | 'consumed' };
type SupabaseUser = { identities?: Array<{ provider?: string; identity_data?: Record<string, unknown> }>; app_metadata?: Record<string, unknown> };
type PatchFile = { path: string; content: string };
type GithubBranch = { name: string; protected: boolean; commit: { sha: string } };
type GithubGitCommit = { sha: string; message: string; tree: { sha: string } };
type GithubPullRequest = { number: number; html_url: string; state: string; title: string; body: string | null; head: { ref: string }; base: { ref: string } };

export type GithubAppOptions = {
  appId?: string;
  appSlug?: string;
  privateKey?: string;
  frontendUrl?: string;
  supabaseUrl?: string;
  supabaseSecretKey?: string;
  fetcher?: typeof fetch;
  resolveGithubAccountId?: (supabaseUserId: string) => Promise<string | null>;
  saveInstallation?: (supabaseUserId: string, installationId: number) => Promise<void>;
};

export class GithubAppService {
  private readonly options: GithubAppOptions;
  private readonly fetcher: typeof fetch;
  private readonly setupStates = new Map<string, StoredSetupState>();

  constructor(options: GithubAppOptions = {}) {
    const env = getEnv();
    this.options = {
      appId: env.GITHUB_APP_ID,
      appSlug: env.GITHUB_APP_SLUG,
      privateKey: env.GITHUB_APP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      frontendUrl: env.FRONTEND_URL,
      supabaseUrl: env.SUPABASE_URL,
      supabaseSecretKey: env.SUPABASE_SECRET_KEY,
      ...options,
    };
    this.fetcher = options.fetcher ?? fetch;
  }

  private assertConfigured(): Required<Pick<GithubAppOptions, 'appId' | 'appSlug' | 'privateKey'>> {
    const { appId, appSlug, privateKey } = this.options;
    if (!appId || !appSlug || !privateKey) {
      throw new AppError('GitHub App integration is not configured.', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
    }
    return { appId, appSlug, privateKey };
  }

  private stateSecret(): string {
    return this.assertConfigured().privateKey;
  }

  private async getSupabaseAdmin() {
    const { supabaseUrl, supabaseSecretKey } = this.options;
    if (!supabaseUrl || !supabaseSecretKey) throw new AppError('Supabase admin integration is not configured.', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
    return createClient(supabaseUrl, supabaseSecretKey, { auth: { autoRefreshToken: false, persistSession: false } });
  }

  private async githubAccountIdForUser(userId: string): Promise<string | null> {
    if (this.options.resolveGithubAccountId) return this.options.resolveGithubAccountId(userId);
    const admin = await this.getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw new AppError('Could not verify the PATCHWORK GitHub identity.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    const user = data.user as unknown as SupabaseUser;
    const identity = user.identities?.find((candidate) => candidate.provider === 'github');
    if (!identity?.identity_data) return null;
    for (const candidate of [identity.identity_data.sub, identity.identity_data.provider_id, identity.identity_data.id]) {
      if ((typeof candidate === 'number' && Number.isSafeInteger(candidate) && candidate > 0) || (typeof candidate === 'string' && /^\d{1,20}$/.test(candidate))) return String(candidate);
    }
    return null;
  }

  private pruneSetupStates(now = Date.now()): void {
    for (const [nonce, setupState] of this.setupStates) {
      if (setupState.exp <= now) this.setupStates.delete(nonce);
    }
  }

  async createSetupUrl(userId: string): Promise<string> {
    const { appSlug } = this.assertConfigured();
    const githubAccountId = await this.githubAccountIdForUser(userId);
    if (!githubAccountId) throw forbidden('Sign in to PATCHWORK with a linked GitHub account before connecting an installation.');
    const exp = Date.now() + 10 * 60_000;
    const nonce = randomBytes(16).toString('hex');
    this.pruneSetupStates();
    if (this.setupStates.size >= 10_000) throw new AppError('GitHub setup is temporarily unavailable. Try again shortly.', { statusCode: 503, code: 'INTERNAL_ERROR' });
    const payload = Buffer.from(JSON.stringify({ userId, githubAccountId, exp, nonce } satisfies SetupState)).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret()).update(payload).digest('base64url');
    this.setupStates.set(nonce, { userId, githubAccountId, exp, status: 'pending' });
    const url = new URL(`https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`);
    url.searchParams.set('state', `${payload}.${signature}`);
    return url.toString();
  }

  private verifyState(state: string): SetupState {
    if (typeof state !== 'string' || state.length > 4096) throw badRequest('Invalid GitHub installation state.');
    const [payload, signature, extra] = state.split('.');
    if (!payload || !signature || extra) throw badRequest('Invalid GitHub installation state.');
    const expected = createHmac('sha256', this.stateSecret()).update(payload).digest();
    let received: Buffer;
    try { received = Buffer.from(signature, 'base64url'); } catch { throw badRequest('Invalid GitHub installation state.'); }
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw badRequest('Invalid GitHub installation state.');
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as Partial<SetupState>;
      if (typeof parsed.userId !== 'string' || !parsed.userId || typeof parsed.githubAccountId !== 'string' || !/^\d{1,20}$/.test(parsed.githubAccountId) || !Number.isSafeInteger(parsed.exp) || typeof parsed.nonce !== 'string' || !/^[a-f0-9]{32}$/.test(parsed.nonce)) throw new Error('invalid');
      if (parsed.exp! <= Date.now()) {
        this.setupStates.delete(parsed.nonce);
        throw badRequest('GitHub installation state has expired. Start the connection again.');
      }
      const stored = this.setupStates.get(parsed.nonce);
      if (!stored || stored.userId !== parsed.userId || stored.githubAccountId !== parsed.githubAccountId || stored.exp !== parsed.exp) throw badRequest('Invalid or expired GitHub installation state. Start the connection again.');
      if (stored.status === 'consumed') throw conflict('GitHub installation state has already been used. Start the connection again.');
      stored.status = 'consumed';
      return parsed as SetupState;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw badRequest('GitHub installation state has expired or is invalid.');
    }
  }

  private async appJwt(): Promise<string> {
    const { appId, privateKey } = this.assertConfigured();
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })).toString('base64url');
    const content = `${header}.${claims}`;
    return `${content}.${cryptoSign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url')}`;
  }

  private async githubResponse(url: string, token: string, init: RequestInit = {}): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetcher(url, {
        ...init,
        headers: { Accept: 'application/vnd.github+json', ...init.headers, Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28', ...(init.body ? { 'Content-Type': 'application/json' } : {}) },
      });
    } catch {
      throw new AppError('GitHub repository service is temporarily unavailable.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    return response;
  }

  private async github<T>(url: string, token: string, init: RequestInit = {}): Promise<T> {
    const response = await this.githubResponse(url, token, init);
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) throw forbidden('GitHub did not authorize this repository operation.');
      if (response.status === 409 || response.status === 422) throw conflict('GitHub rejected the repository operation because its state or permissions do not allow it.');
      throw new AppError('GitHub repository service is temporarily unavailable.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    return response.json() as Promise<T>;
  }

  async completeInstallation(state: string, installationIdInput: string): Promise<void> {
    if (!/^\d{1,12}$/.test(installationIdInput)) throw badRequest('Invalid GitHub installation ID.');
    const setupState = this.verifyState(state);
    const installationId = Number(installationIdInput);
    const installation = await this.github<GithubInstallation>(`${API}/app/installations/${installationId}`, await this.appJwt());
    if (installation.id !== installationId || !Number.isSafeInteger(installation.account?.id) || String(installation.account?.id) !== setupState.githubAccountId || installation.account?.type !== 'User') {
      throw forbidden('The GitHub App installation account does not match the GitHub account that started setup.');
    }
    const currentGithubAccountId = await this.githubAccountIdForUser(setupState.userId);
    if (!currentGithubAccountId || currentGithubAccountId !== setupState.githubAccountId) throw forbidden('The PATCHWORK GitHub identity changed during setup. Start the connection again.');
    if (this.options.saveInstallation) {
      await this.options.saveInstallation(setupState.userId, installationId);
      return;
    }
    const admin = await this.getSupabaseAdmin();
    const { data, error } = await admin.auth.admin.getUserById(setupState.userId);
    if (error || !data.user) throw new AppError('Could not complete the GitHub connection.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    const metadata = { ...data.user.app_metadata, patchwork_github_installation_id: installationId };
    const update = await admin.auth.admin.updateUserById(setupState.userId, { app_metadata: metadata });
    if (update.error) throw new AppError('Could not complete the GitHub connection.', { statusCode: 502, code: 'INTERNAL_ERROR' });
  }

  private async installationToken(user: AuthenticatedUser, permissions?: Record<string, 'read' | 'write'>): Promise<string> {
    this.assertConfigured();
    const installationId = (user.app_metadata as Record<string, unknown> | undefined)?.patchwork_github_installation_id;
    if (!Number.isSafeInteger(installationId) || Number(installationId) < 1) throw forbidden('Connect a GitHub App installation before accessing repositories.');
    const response = await this.fetcher(`${API}/app/installations/${installationId}/access_tokens`, {
      method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${await this.appJwt()}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: JSON.stringify(permissions ? { permissions } : {}),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 422) throw forbidden('The GitHub App installation is missing the repository permissions required for this operation.');
      throw new AppError('GitHub installation is temporarily unavailable.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    const tokenData = await response.json() as { token?: string };
    if (!tokenData.token) throw new AppError('Could not authorize the GitHub installation.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    return tokenData.token;
  }

  async listRepositories(user: AuthenticatedUser, page = 1, perPage = 50) {
    const token = await this.installationToken(user);
    const result = await this.github<{ total_count: number; repositories: GithubRepository[] }>(`${API}/installation/repositories?per_page=${perPage}&page=${page}`, token);
    return { repositories: result.repositories.map((repo) => this.safeRepository(repo)), page, perPage, hasMore: page * perPage < result.total_count };
  }

  private safeRepository(repo: GithubRepository) {
    return { id: repo.id, name: repo.name, fullName: repo.full_name, owner: repo.owner.login, private: repo.private, description: repo.description, url: repo.html_url, defaultBranch: repo.default_branch };
  }

  private repositoryApiPath(repo: GithubRepository): string {
    return `/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`;
  }

  private validatePatchBranchName(branchName: string): void {
    if (typeof branchName !== 'string' || branchName.length > 255 || !branchName.startsWith('patchwork/') || branchName.split('/').some((part) => !part || part === '.' || part === '..') || branchName.includes('..') || branchName.includes('//') || branchName.includes('@{') || /[\x00-\x20~^:?*[\\\]]/.test(branchName) || branchName.endsWith('.') || branchName.toLowerCase().endsWith('.lock')) {
      throw badRequest('Branch names must be valid Git refs under patchwork/.');
    }
  }

  private validateWriteFiles(files: PatchFile[]): void {
    if (!Array.isArray(files) || files.length < 1 || files.length > MAX_WRITE_FILES) throw badRequest(`A commit must contain between 1 and ${MAX_WRITE_FILES} files.`);
    const seen = new Set<string>();
    let totalBytes = 0;
    for (const file of files) {
      const filePath = file?.path;
      if (typeof filePath !== 'string' || !filePath || filePath.length > 500 || /[\\:\u0000-\u001f\u007f]/.test(filePath) || filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath) || filePath.split('/').some((part) => !part || part === '.' || part === '..' || /[ .]$/.test(part) || /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$/i.test(part))) {
        throw badRequest('File paths must be safe relative paths within the repository.');
      }
      const parts = filePath.split('/');
      if (parts.some((part, index) => part.toLowerCase() === '.git' || part.toLowerCase() === '.github' || BLOCKED_NAMES.test(part) || (index < parts.length - 1 && BLOCKED_DIRECTORIES.has(part.toLowerCase()))) || !WRITE_EXTENSIONS.has(filePath.slice(filePath.lastIndexOf('.')).toLowerCase())) {
        throw forbidden('This file path is not allowed for repository writes.');
      }
      if (seen.has(filePath)) throw badRequest('File paths in a commit must be unique.');
      seen.add(filePath);
      if (typeof file.content !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(file.content)) throw badRequest('File content must be UTF-8 text without unsafe control characters.');
      const size = Buffer.byteLength(file.content, 'utf8');
      if (size > MAX_WRITE_FILE_BYTES) throw badRequest('A file exceeds the per-file write limit.');
      totalBytes += size;
    }
    if (totalBytes > MAX_WRITE_TOTAL_BYTES) throw badRequest('Combined file content exceeds the commit write limit.');
  }

  private async getBranch(token: string, repo: GithubRepository, name: string): Promise<GithubBranch | null> {
    const response = await this.githubResponse(`${API}${this.repositoryApiPath(repo)}/branches/${name.split('/').map(encodeURIComponent).join('/')}`, token);
    if (response.status === 404) return null;
    if (!response.ok) {
      if (response.status === 403) throw forbidden('The GitHub App installation is missing repository read/write access required for this operation.');
      throw new AppError('GitHub repository service is temporarily unavailable.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    return response.json() as Promise<GithubBranch>;
  }

  async createPatchBranch(user: AuthenticatedUser, repositoryId: string, input: { branchName: string; baseRef: string }) {
    this.validatePatchBranchName(input.branchName);
    if (typeof input.baseRef !== 'string' || !input.baseRef.trim() || input.baseRef.length > 255 || /[\x00-\x20\\]/.test(input.baseRef) || input.baseRef.includes('..') || input.baseRef.startsWith('/') || input.baseRef.endsWith('/')) throw badRequest('Invalid base branch or commit.');
    const { token, repo } = await this.authorizedRepository(user, repositoryId, { contents: 'write' });
    if (input.branchName === repo.default_branch) throw forbidden('The repository default branch is protected from PATCHWORK writes.');

    let baseCommitSha: string;
    if (/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(input.baseRef)) {
      const commit = await this.github<{ sha: string }>(`${API}${this.repositoryApiPath(repo)}/commits/${input.baseRef}`, token);
      if (commit.sha.toLowerCase() !== input.baseRef.toLowerCase()) throw badRequest('The requested base commit could not be verified.');
      baseCommitSha = commit.sha;
    } else {
      const baseBranch = await this.getBranch(token, repo, input.baseRef);
      if (!baseBranch || baseBranch.name !== input.baseRef || !/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(baseBranch.commit.sha)) throw badRequest('The requested base branch could not be verified.');
      baseCommitSha = baseBranch.commit.sha;
    }

    const existing = await this.getBranch(token, repo, input.branchName);
    if (existing) {
      if (existing.protected) throw forbidden('PATCHWORK cannot write to a protected branch.');
      if (existing.commit.sha === baseCommitSha) return { repository: this.safeRepository(repo), branchName: input.branchName, baseCommitSha, headCommitSha: existing.commit.sha, created: false };
      throw conflict('A branch with this name already exists at a different commit. Choose a new patch branch name.');
    }

    const response = await this.githubResponse(`${API}${this.repositoryApiPath(repo)}/git/refs`, token, {
      method: 'POST', body: JSON.stringify({ ref: `refs/heads/${input.branchName}`, sha: baseCommitSha }),
    });
    if (response.status === 201) {
      const data = await response.json() as { ref?: string; object?: { sha?: string } };
      return { repository: this.safeRepository(repo), branchName: input.branchName, baseCommitSha, headCommitSha: data.object?.sha ?? baseCommitSha, created: true };
    }
    if (response.status === 422 || response.status === 409) {
      const racedBranch = await this.getBranch(token, repo, input.branchName);
      if (racedBranch && !racedBranch.protected && racedBranch.commit.sha === baseCommitSha) return { repository: this.safeRepository(repo), branchName: input.branchName, baseCommitSha, headCommitSha: racedBranch.commit.sha, created: false };
      throw conflict('GitHub could not create the requested patch branch. It may already exist or be protected.');
    }
    if (response.status === 403) throw forbidden('The GitHub App installation is missing Contents: write permission.');
    throw new AppError('GitHub could not create the patch branch.', { statusCode: 502, code: 'INTERNAL_ERROR' });
  }

  async commitPatchFiles(user: AuthenticatedUser, repositoryId: string, input: { branchName: string; expectedHeadSha: string; idempotencyKey: string; message: string; files: PatchFile[] }) {
    this.validatePatchBranchName(input.branchName);
    this.validateWriteFiles(input.files);
    if (!/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/.test(input.expectedHeadSha) || !/^[0-9a-f-]{36}$/i.test(input.idempotencyKey) || !input.message.trim() || input.message.length > 200) throw badRequest('Commit metadata is invalid.');
    const { token, repo } = await this.authorizedRepository(user, repositoryId, { contents: 'write' });
    if (input.branchName === repo.default_branch) throw forbidden('The repository default branch is protected from PATCHWORK writes.');

    const expectedHeadSha = input.expectedHeadSha.toLowerCase();
    const operationPayload = JSON.stringify({ branchName: input.branchName, expectedHeadSha, message: input.message, files: [...input.files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) });
    const payloadHash = createHash('sha256').update(operationPayload).digest('hex');
    const branch = await this.getBranch(token, repo, input.branchName);
    if (!branch) throw notFound('Patch branch was not found in this repository.');
    if (branch.protected) throw forbidden('PATCHWORK cannot write to a protected branch.');
    if (branch.name === repo.default_branch) throw forbidden('The repository default branch is protected from PATCHWORK writes.');

    const operationMarker = `Patchwork-Operation: ${input.idempotencyKey}`;
    const payloadMarker = `Patchwork-Payload-SHA256: ${payloadHash}`;
    if (branch.commit.sha.toLowerCase() !== expectedHeadSha) {
      const latest = await this.github<GithubGitCommit>(`${API}${this.repositoryApiPath(repo)}/git/commits/${branch.commit.sha}`, token);
      if (latest.message.includes(operationMarker) && latest.message.includes(payloadMarker)) {
        return { repository: this.safeRepository(repo), branchName: input.branchName, commitSha: latest.sha, committed: false };
      }
      throw conflict('Patch branch changed since the expected head commit. Refresh it before retrying.');
    }

    const parent = await this.github<GithubGitCommit>(`${API}${this.repositoryApiPath(repo)}/git/commits/${expectedHeadSha}`, token);
    const blobs = await Promise.all(input.files.map(async (file) => {
      const blob = await this.github<{ sha: string }>(`${API}${this.repositoryApiPath(repo)}/git/blobs`, token, {
        method: 'POST', body: JSON.stringify({ content: file.content, encoding: 'utf-8' }),
      });
      return { path: file.path, mode: '100644', type: 'blob', sha: blob.sha };
    }));
    const tree = await this.github<{ sha: string }>(`${API}${this.repositoryApiPath(repo)}/git/trees`, token, {
      method: 'POST', body: JSON.stringify({ base_tree: parent.tree.sha, tree: blobs }),
    });
    const commit = await this.github<{ sha: string }>(`${API}${this.repositoryApiPath(repo)}/git/commits`, token, {
      method: 'POST', body: JSON.stringify({ message: `${input.message}\n\n${operationMarker}\n${payloadMarker}`, tree: tree.sha, parents: [expectedHeadSha] }),
    });
    const refPath = `${API}${this.repositoryApiPath(repo)}/git/refs/heads/${input.branchName.split('/').map(encodeURIComponent).join('/')}`;
    const update = await this.githubResponse(refPath, token, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
    if (!update.ok) {
      const current = await this.getBranch(token, repo, input.branchName);
      if (current?.commit.sha === commit.sha) return { repository: this.safeRepository(repo), branchName: input.branchName, commitSha: commit.sha, committed: false };
      if (update.status === 403) throw forbidden('The GitHub App installation is missing Contents: write permission.');
      if (update.status === 409 || update.status === 422) throw conflict('Patch branch changed concurrently; no non-fast-forward update was performed.');
      throw new AppError('GitHub could not update the patch branch.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    return { repository: this.safeRepository(repo), branchName: input.branchName, commitSha: commit.sha, committed: true };
  }

  async createPullRequest(user: AuthenticatedUser, repositoryId: string, input: { branchName: string; baseBranch: string; idempotencyKey: string; title: string; body?: string }) {
    this.validatePatchBranchName(input.branchName);
    if (!input.baseBranch || input.baseBranch.length > 255 || /[\x00-\x20\\]/.test(input.baseBranch) || input.baseBranch.includes('..') || input.baseBranch.startsWith('/') || input.baseBranch.endsWith('/') || !/^[0-9a-f-]{36}$/i.test(input.idempotencyKey) || !input.title.trim() || input.title.length > 200 || (input.body?.length ?? 0) > 10_000) throw badRequest('Pull request metadata is invalid.');
    const { token, repo } = await this.authorizedRepository(user, repositoryId, { contents: 'read', pull_requests: 'write' });
    if (input.branchName === input.baseBranch || input.branchName === repo.default_branch) throw badRequest('A pull request requires a distinct patch branch and base branch.');
    const [head, base] = await Promise.all([this.getBranch(token, repo, input.branchName), this.getBranch(token, repo, input.baseBranch)]);
    if (!head || !base || head.name !== input.branchName || base.name !== input.baseBranch) throw notFound('The pull request head or base branch is not available in this repository.');
    if (head.protected) throw forbidden('PATCHWORK cannot create a pull request from a protected head branch.');

    const marker = `<!-- patchwork-operation:${input.idempotencyKey}:${createHash('sha256').update(JSON.stringify({ branchName: input.branchName, baseBranch: input.baseBranch, title: input.title, body: input.body ?? '' })).digest('hex')} -->`;
    let previous: GithubPullRequest | undefined;
    for (let page = 1; page <= 10 && !previous; page += 1) {
      const listUrl = new URL(`${API}${this.repositoryApiPath(repo)}/pulls`);
      listUrl.searchParams.set('state', 'all');
      listUrl.searchParams.set('head', `${repo.owner.login}:${input.branchName}`);
      listUrl.searchParams.set('base', input.baseBranch);
      listUrl.searchParams.set('per_page', '100');
      listUrl.searchParams.set('page', String(page));
      const existing = await this.github<GithubPullRequest[]>(listUrl.toString(), token);
      previous = existing.find((pull) => pull.head.ref === input.branchName && pull.base.ref === input.baseBranch);
      if (existing.length < 100) break;
      if (page === 10 && !previous) throw conflict('Could not safely confirm pull request idempotency; review the repository before retrying.');
    }
    if (previous) {
      if (previous.body?.includes(marker)) return { repository: this.safeRepository(repo), number: previous.number, url: previous.html_url, state: previous.state, created: false };
      throw conflict('A pull request already exists for this branch and base with a different request.');
    }

    const response = await this.github<{ number: number; html_url: string; state: string }>(`${API}${this.repositoryApiPath(repo)}/pulls`, token, {
      method: 'POST', body: JSON.stringify({ title: input.title, head: input.branchName, base: input.baseBranch, body: [input.body?.trim(), marker].filter(Boolean).join('\n\n') }),
    });
    return { repository: this.safeRepository(repo), number: response.number, url: response.html_url, state: response.state, created: true };
  }

  private async authorizedRepository(user: AuthenticatedUser, idInput: string, permissions?: Record<string, 'read' | 'write'>): Promise<{ token: string; repo: GithubRepository }> {
    if (!/^\d{1,20}$/.test(idInput) || !Number.isSafeInteger(Number(idInput))) throw badRequest('Repository ID must be a numeric GitHub repository ID.');
    const token = await this.installationToken(user, permissions);
    let repo: GithubRepository;
    try {
      repo = await this.github<GithubRepository>(`${API}/repositories/${idInput}`, token);
    } catch (error) {
      if (error instanceof AppError && (error.statusCode === 403 || error.statusCode === 404)) throw notFound('Repository is not available to this GitHub App installation.');
      throw error;
    }
    if (repo.id !== Number(idInput)) throw notFound('Repository is not available to this GitHub App installation.');
    return { token, repo };
  }

  async getRepository(user: AuthenticatedUser, id: string) {
    const { repo } = await this.authorizedRepository(user, id);
    return this.safeRepository(repo);
  }

  async readSource(user: AuthenticatedUser, id: string, filePath: string, ref?: string) {
    const { token, repo } = await this.authorizedRepository(user, id);
    if (typeof filePath !== 'string' || !filePath.trim() || filePath.length > 500 || /[\\\u0000-\u001f\u007f]/.test(filePath) || filePath.startsWith('/') || filePath.split('/').some((part) => !part || part === '.' || part === '..')) throw badRequest('Source path must be a safe relative file path.');
    const parts = filePath.split('/');
    if (parts.some((part, index) => BLOCKED_NAMES.test(part) || (index < parts.length - 1 && BLOCKED_DIRECTORIES.has(part.toLowerCase()))) || !SOURCE_EXTENSIONS.has(filePath.slice(filePath.lastIndexOf('.') ).toLowerCase())) throw forbidden('This file type is not available for source retrieval.');
    if (ref !== undefined && (ref.length > 255 || !/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes('..') || ref.startsWith('/') || ref.endsWith('/'))) throw badRequest('Invalid repository ref.');
    const url = new URL(`${API}/repos/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}/contents/${parts.map(encodeURIComponent).join('/')}`);
    url.searchParams.set('ref', ref ?? repo.default_branch);
    const content = await this.github<GithubContent>(url.toString(), token);
    if (content.type !== 'file' || !Number.isSafeInteger(content.size) || content.size < 0 || content.size > MAX_FILE_BYTES || content.encoding !== 'base64' || typeof content.content !== 'string' || typeof content.path !== 'string') throw forbidden('File is not available or exceeds the source size limit.');
    const source = Buffer.from(content.content, 'base64').toString('utf8');
    if (Buffer.byteLength(source, 'utf8') > MAX_FILE_BYTES) throw forbidden('File exceeds the source size limit.');
    return { repository: this.safeRepository(repo), path: content.path, ref: ref ?? repo.default_branch, source, size: Buffer.byteLength(source, 'utf8') };
  }
}

export const githubAppService = new GithubAppService();
