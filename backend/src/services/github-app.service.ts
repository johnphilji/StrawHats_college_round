import { createHmac, randomBytes, sign as cryptoSign, timingSafeEqual } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../config/env';
import { badRequest, forbidden, notFound, AppError } from '../shared/errors/AppError';
import type { AuthenticatedUser } from '../shared/types/api';

const API = 'https://api.github.com';
const MAX_FILE_BYTES = 256 * 1024;
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.sass', '.less', '.json', '.html', '.svg', '.md', '.mdx', '.vue', '.svelte']);
const BLOCKED_NAMES = /^(\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|.*\.(?:pem|key|p12|pfx|keystore))$|(?:credential|secret|service[-_]?account|firebase-adminsdk|id_(?:rsa|ed25519|ecdsa))/i;
const BLOCKED_DIRECTORIES = new Set(['.ssh', 'credentials', 'secrets', 'private', 'keys']);

type GithubInstallation = { id: number; account?: { login: string; type: string }; repository_selection?: string };
type GithubRepository = { id: number; name: string; full_name: string; private: boolean; description: string | null; html_url: string; default_branch: string; owner: { login: string } };
type GithubContent = { type: string; size: number; encoding: string; content: string; path: string };

export type GithubAppOptions = {
  appId?: string;
  appSlug?: string;
  privateKey?: string;
  frontendUrl?: string;
  supabaseUrl?: string;
  supabaseSecretKey?: string;
  fetcher?: typeof fetch;
};

export class GithubAppService {
  private readonly options: GithubAppOptions;
  private readonly fetcher: typeof fetch;

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

  createSetupUrl(userId: string): string {
    const { appSlug } = this.assertConfigured();
    const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + 10 * 60_000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
    const signature = createHmac('sha256', this.stateSecret()).update(payload).digest('base64url');
    const url = new URL(`https://github.com/apps/${encodeURIComponent(appSlug)}/installations/new`);
    url.searchParams.set('state', `${payload}.${signature}`);
    return url.toString();
  }

  private verifyState(state: string): string {
    const [payload, signature, extra] = state.split('.');
    if (!payload || !signature || extra) throw badRequest('Invalid GitHub installation state.');
    const expected = createHmac('sha256', this.stateSecret()).update(payload).digest();
    let received: Buffer;
    try { received = Buffer.from(signature, 'base64url'); } catch { throw badRequest('Invalid GitHub installation state.'); }
    if (expected.length !== received.length || !timingSafeEqual(expected, received)) throw badRequest('Invalid GitHub installation state.');
    try {
      const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { userId?: string; exp?: number };
      if (!parsed.userId || !Number.isFinite(parsed.exp) || parsed.exp! < Date.now()) throw new Error('expired');
      return parsed.userId;
    } catch { throw badRequest('GitHub installation state has expired or is invalid.'); }
  }

  private async appJwt(): Promise<string> {
    const { appId, privateKey } = this.assertConfigured();
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(JSON.stringify({ iat: now - 60, exp: now + 540, iss: appId })).toString('base64url');
    const content = `${header}.${claims}`;
    return `${content}.${cryptoSign('RSA-SHA256', Buffer.from(content), privateKey).toString('base64url')}`;
  }

  private async github<T>(url: string, token: string): Promise<T> {
    const response = await this.fetcher(url, { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) {
      if (response.status === 404 || response.status === 403) throw forbidden('GitHub did not authorize this repository operation.');
      throw new AppError('GitHub repository service is temporarily unavailable.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    }
    return response.json() as Promise<T>;
  }

  async completeInstallation(state: string, installationIdInput: string): Promise<void> {
    const userId = this.verifyState(state);
    if (!/^\d{1,12}$/.test(installationIdInput)) throw badRequest('Invalid GitHub installation ID.');
    const installationId = Number(installationIdInput);
    const installation = await this.github<GithubInstallation>(`${API}/app/installations/${installationId}`, await this.appJwt());
    if (installation.id !== installationId) throw forbidden('GitHub installation could not be verified.');
    const { supabaseUrl, supabaseSecretKey } = this.options;
    if (!supabaseUrl || !supabaseSecretKey) throw new AppError('Supabase admin integration is not configured.', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
    const admin = createClient(supabaseUrl, supabaseSecretKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user) throw new AppError('Could not complete the GitHub connection.', { statusCode: 502, code: 'INTERNAL_ERROR' });
    const metadata = { ...data.user.app_metadata, patchwork_github_installation_id: installationId };
    const update = await admin.auth.admin.updateUserById(userId, { app_metadata: metadata });
    if (update.error) throw new AppError('Could not complete the GitHub connection.', { statusCode: 502, code: 'INTERNAL_ERROR' });
  }

  private async installationToken(user: AuthenticatedUser): Promise<string> {
    this.assertConfigured();
    const installationId = (user.app_metadata as Record<string, unknown> | undefined)?.patchwork_github_installation_id;
    if (!Number.isSafeInteger(installationId) || Number(installationId) < 1) throw forbidden('Connect a GitHub App installation before accessing repositories.');
    const response = await this.fetcher(`${API}/app/installations/${installationId}/access_tokens`, {
      method: 'POST', headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${await this.appJwt()}`, 'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    });
    if (!response.ok) throw forbidden('GitHub installation is unavailable or no longer authorized.');
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

  private async authorizedRepository(user: AuthenticatedUser, idInput: string): Promise<{ token: string; repo: GithubRepository }> {
    if (!/^\d{1,20}$/.test(idInput) || !Number.isSafeInteger(Number(idInput))) throw badRequest('Repository ID must be a numeric GitHub repository ID.');
    const token = await this.installationToken(user);
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
