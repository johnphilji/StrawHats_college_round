import { afterAll, describe, expect, it, vi } from 'vitest';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { GithubAppService } from '../../src/services/github-app.service';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const repo = { id: 7123, name: 'demo', full_name: 'acme/demo', private: true, description: 'Demo source', html_url: 'https://github.com/acme/demo', default_branch: 'main', owner: { login: 'acme' } };
const user = { id: 'supabase-user-1', app_metadata: { patchwork_github_installation_id: 456 } };

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeService(fetcher: typeof fetch, overrides: { resolveGithubAccountId?: (userId: string) => Promise<string | null>; saveInstallation?: (userId: string, installationId: number) => Promise<void> } = {}) {
  return new GithubAppService({ appId: '9876', appSlug: 'patchwork', privateKey, frontendUrl: 'http://localhost:5173', supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'server-secret', fetcher, resolveGithubAccountId: async () => '42', saveInstallation: async () => {}, ...overrides });
}

async function setupState(service: GithubAppService): Promise<string> {
  return new URL(await service.createSetupUrl(user.id)).searchParams.get('state')!;
}

describe('GithubAppService', () => {
  const original = { appId: process.env.GITHUB_APP_ID, slug: process.env.GITHUB_APP_SLUG, key: process.env.GITHUB_APP_PRIVATE_KEY, callback: process.env.GITHUB_APP_CALLBACK_URL, url: process.env.SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY };
  afterAll(() => {
    for (const [key, value] of Object.entries({ GITHUB_APP_ID: original.appId, GITHUB_APP_SLUG: original.slug, GITHUB_APP_PRIVATE_KEY: original.key, GITHUB_APP_CALLBACK_URL: original.callback, SUPABASE_URL: original.url, SUPABASE_SECRET_KEY: original.secret })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('creates a short lived signed installation URL bound to the requesting user and GitHub identity', async () => {
    const service = makeService(vi.fn() as unknown as typeof fetch);
    const url = new URL(await service.createSetupUrl(user.id));
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/apps/patchwork/installations/new');
    expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it('saves the installation only when its verified GitHub account matches the initiating user', async () => {
    const saveInstallation = vi.fn(async () => {});
    const fetcher = vi.fn(async () => response({ id: 456, account: { id: 42, login: 'patchwork-user', type: 'User' } }));
    const service = makeService(fetcher as unknown as typeof fetch, { saveInstallation });
    const state = await setupState(service);
    await service.completeInstallation(state, '456');
    expect(saveInstallation).toHaveBeenCalledWith(user.id, 456);
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('rejects an installation belonging to a different GitHub account', async () => {
    const saveInstallation = vi.fn(async () => {});
    const fetcher = vi.fn(async () => response({ id: 456, account: { id: 99, login: 'someone-else', type: 'User' } }));
    const service = makeService(fetcher as unknown as typeof fetch, { saveInstallation });
    const state = await setupState(service);
    await expect(service.completeInstallation(state, '456')).rejects.toMatchObject({ statusCode: 403 });
    expect(saveInstallation).not.toHaveBeenCalled();
  });

  it('rejects invalid state before calling GitHub', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const service = makeService(fetcher);
    const state = await setupState(service);
    await expect(service.completeInstallation(`invalid.${state}`, '456')).rejects.toMatchObject({ statusCode: 400 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects expired state', async () => {
    vi.useFakeTimers();
    try {
      const fetcher = vi.fn() as unknown as typeof fetch;
      const service = makeService(fetcher);
      const state = await setupState(service);
      vi.advanceTimersByTime(10 * 60_000 + 1);
      await expect(service.completeInstallation(state, '456')).rejects.toMatchObject({ statusCode: 400 });
      expect(fetcher).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('consumes setup state once and rejects replay', async () => {
    const fetcher = vi.fn(async () => response({ id: 456, account: { id: 42, login: 'patchwork-user', type: 'User' } }));
    const service = makeService(fetcher as unknown as typeof fetch);
    const state = await setupState(service);
    await service.completeInstallation(state, '456');
    await expect(service.completeInstallation(state, '456')).rejects.toMatchObject({ statusCode: 409 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('does not save an installation when GitHub verification fails', async () => {
    const saveInstallation = vi.fn(async () => {});
    const fetcher = vi.fn(async () => response({}, 502));
    const service = makeService(fetcher as unknown as typeof fetch, { saveInstallation });
    const state = await setupState(service);
    await expect(service.completeInstallation(state, '456')).rejects.toMatchObject({ statusCode: 502 });
    expect(saveInstallation).not.toHaveBeenCalled();
  });

  it('lists only repositories returned by the linked installation and never exposes its token', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'installation-secret' });
      if (url.includes('/installation/repositories')) return response({ total_count: 1, repositories: [repo] });
      throw new Error('Unexpected URL');
    });
    const result = await makeService(fetcher as unknown as typeof fetch).listRepositories(user);
    expect(result.repositories).toEqual([{ id: 7123, name: 'demo', fullName: 'acme/demo', owner: 'acme', private: true, description: 'Demo source', url: 'https://github.com/acme/demo', defaultBranch: 'main' }]);
    expect(JSON.stringify(result)).not.toContain('installation-secret');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('denies a repository that is outside the authorized installation', async () => {
    const fetcher = vi.fn(async (input: string | URL) => String(input).endsWith('/access_tokens') ? response({ token: 'temporary' }) : response({}, 404));
    await expect(makeService(fetcher as unknown as typeof fetch).getRepository(user, '9999')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('retrieves a single authorized source file with bounded size', async () => {
    const body = 'export const value = 42;';
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.includes('/contents/')) return response({ type: 'file', size: Buffer.byteLength(body), encoding: 'base64', content: Buffer.from(body).toString('base64'), path: 'src/App.tsx' });
      throw new Error('Unexpected URL');
    });
    const result = await makeService(fetcher as unknown as typeof fetch).readSource(user, '7123', 'src/App.tsx');
    expect(result.source).toBe(body);
    expect(result.ref).toBe('main');
    expect(JSON.stringify(result)).not.toContain('temporary');
  });

  it('blocks traversal and sensitive paths before requesting file content', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      throw new Error('Unexpected URL');
    });
    const service = makeService(fetcher as unknown as typeof fetch);
    await expect(service.readSource(user, '7123', '../.env')).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.readSource(user, '7123', 'config/.env.local')).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.readSource(user, '7123', 'keys/server.pem')).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher).toHaveBeenCalledTimes(6); // each attempt mints a token and checks repository access before file content
  });

  it('blocks oversized content files', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      return response({ type: 'file', size: 300_000, encoding: 'base64', content: '', path: 'src/large.ts' });
    });
    await expect(makeService(fetcher as unknown as typeof fetch).readSource(user, '7123', 'src/large.ts')).rejects.toMatchObject({ statusCode: 403 });
  });

  it('creates a patch branch only from a verified base and requests Contents write permission', async () => {
    const baseSha = 'a'.repeat(40);
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/main')) return response({ name: 'main', protected: true, commit: { sha: baseSha } });
      if (url.endsWith('/branches/patchwork/fix-header')) return response({}, 404);
      if (url.endsWith('/git/refs')) return response({ ref: 'refs/heads/patchwork/fix-header', object: { sha: baseSha } }, 201);
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await makeService(fetcher as unknown as typeof fetch).createPatchBranch(user, '7123', { branchName: 'patchwork/fix-header', baseRef: 'main' });
    expect(result).toMatchObject({ branchName: 'patchwork/fix-header', baseCommitSha: baseSha, created: true });
    const tokenRequest = calls.find((call) => call.url.endsWith('/access_tokens'))!;
    expect(JSON.parse(String(tokenRequest.init?.body))).toEqual({ permissions: { contents: 'write' } });
    const refRequest = calls.find((call) => call.url.endsWith('/git/refs'))!;
    expect(JSON.parse(String(refRequest.init?.body))).toEqual({ ref: 'refs/heads/patchwork/fix-header', sha: baseSha });
    expect(JSON.stringify(result)).not.toContain('temporary');
  });

  it('treats creating the same branch from the same base as a safe retry', async () => {
    const baseSha = 'a'.repeat(40);
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/main')) return response({ name: 'main', protected: true, commit: { sha: baseSha } });
      if (url.endsWith('/branches/patchwork/fix-header')) return response({ name: 'patchwork/fix-header', protected: false, commit: { sha: baseSha } });
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(makeService(fetcher as unknown as typeof fetch).createPatchBranch(user, '7123', { branchName: 'patchwork/fix-header', baseRef: 'main' }))
      .resolves.toMatchObject({ created: false, headCommitSha: baseSha });
  });

  it('rejects invalid branch and sensitive/traversal file paths before making GitHub requests', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    const service = makeService(fetcher);
    await expect(service.createPatchBranch(user, '7123', { branchName: 'main', baseRef: 'main' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha: 'a'.repeat(40), idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', message: 'update', files: [{ path: '../.env', content: 'bad' }] })).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha: 'a'.repeat(40), idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', message: 'update', files: [{ path: 'config/.env.local', content: 'bad' }] })).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('fails safely when the installation has no Contents write permission', async () => {
    const fetcher = vi.fn(async (input: string | URL) => String(input).endsWith('/access_tokens') ? response({ message: 'permission missing' }, 422) : response({}));
    await expect(makeService(fetcher as unknown as typeof fetch).createPatchBranch(user, '7123', { branchName: 'patchwork/fix', baseRef: 'main' })).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  it('fails safely when GitHub rejects a write API call', async () => {
    const baseSha = 'a'.repeat(40);
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/main')) return response({ name: 'main', protected: false, commit: { sha: baseSha } });
      if (url.endsWith('/branches/patchwork/fix')) return response({}, 404);
      if (url.endsWith('/git/refs')) return response({ message: 'GitHub internal error' }, 500);
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(makeService(fetcher as unknown as typeof fetch).createPatchBranch(user, '7123', { branchName: 'patchwork/fix', baseRef: 'main' }))
      .rejects.toMatchObject({ statusCode: 502, message: 'GitHub could not create the patch branch.' });
  });

  it('rejects the configured default branch even if it uses the patchwork namespace', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response({ ...repo, default_branch: 'patchwork/fix' });
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(makeService(fetcher as unknown as typeof fetch).commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha: 'a'.repeat(40), idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', message: 'update', files: [{ path: 'src/App.tsx', content: 'export {}' }] })).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher.mock.calls.some(([input]) => String(input).includes('/git/blobs'))).toBe(false);
  });

  it('does not write to protected branches and rejects repositories outside the installation', async () => {
    const protectedFetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/patchwork/fix')) return response({ name: 'patchwork/fix', protected: true, commit: { sha: 'a'.repeat(40) } });
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(makeService(protectedFetcher as unknown as typeof fetch).commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha: 'a'.repeat(40), idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', message: 'update', files: [{ path: 'src/App.tsx', content: 'export {}' }] })).rejects.toMatchObject({ statusCode: 403 });
    expect(protectedFetcher.mock.calls.some(([input]) => String(input).includes('/git/blobs'))).toBe(false);

    const outsideFetcher = vi.fn(async (input: string | URL) => String(input).endsWith('/access_tokens') ? response({ token: 'temporary' }) : response({}, 404));
    const outsideService = makeService(outsideFetcher as unknown as typeof fetch);
    await expect(outsideService.getRepository(user, '9999')).rejects.toMatchObject({ statusCode: 404 });
    await expect(outsideService.createPatchBranch(user, '9999', { branchName: 'patchwork/fix', baseRef: 'main' })).rejects.toMatchObject({ statusCode: 404 });
    expect(outsideFetcher.mock.calls.some(([input]) => String(input).endsWith('/git/refs'))).toBe(false);
  });

  it('creates bounded Git data objects and uses a non-forced ref update', async () => {
    const baseSha = 'a'.repeat(40);
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/patchwork/fix')) return response({ name: 'patchwork/fix', protected: false, commit: { sha: baseSha } });
      if (url.endsWith(`/git/commits/${baseSha}`)) return response({ sha: baseSha, tree: { sha: 'tree-base' }, message: 'base' });
      if (url.endsWith('/git/blobs')) return response({ sha: 'blob-1' });
      if (url.endsWith('/git/trees')) return response({ sha: 'tree-next' });
      if (url.endsWith('/git/commits')) return response({ sha: 'c'.repeat(40) });
      if (url.endsWith('/git/refs/heads/patchwork/fix')) return response({ ref: 'refs/heads/patchwork/fix' });
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await makeService(fetcher as unknown as typeof fetch).commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha: baseSha, idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', message: 'Update hero', files: [{ path: 'src/App.tsx', content: 'export const value = 1;' }] });
    expect(result).toMatchObject({ commitSha: 'c'.repeat(40), committed: true });
    const update = calls.find((call) => call.url.endsWith('/git/refs/heads/patchwork/fix'))!;
    expect(update.init?.method).toBe('PATCH');
    expect(JSON.parse(String(update.init?.body))).toEqual({ sha: 'c'.repeat(40), force: false });
    expect(calls.some((call) => call.url.includes('api.github.com'))).toBe(true);
    expect(JSON.stringify(result)).not.toContain('temporary');
  });

  it('returns an already-applied commit on retry without creating another commit', async () => {
    const expectedHeadSha = 'a'.repeat(40);
    const idempotencyKey = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
    const files = [{ path: 'src/App.tsx', content: 'export const value = 1;' }];
    const payload = JSON.stringify({ branchName: 'patchwork/fix', expectedHeadSha, message: 'Update hero', files });
    const payloadHash = createHash('sha256').update(payload).digest('hex');
    const currentSha = 'c'.repeat(40);
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/patchwork/fix')) return response({ name: 'patchwork/fix', protected: false, commit: { sha: currentSha } });
      if (url.endsWith(`/git/commits/${currentSha}`)) return response({ sha: currentSha, tree: { sha: 'tree' }, message: `Update hero\n\nPatchwork-Operation: ${idempotencyKey}\nPatchwork-Payload-SHA256: ${payloadHash}` });
      throw new Error(`Unexpected URL ${url}`);
    });
    await expect(makeService(fetcher as unknown as typeof fetch).commitPatchFiles(user, '7123', { branchName: 'patchwork/fix', expectedHeadSha, idempotencyKey, message: 'Update hero', files }))
      .resolves.toMatchObject({ commitSha: currentSha, committed: false });
    expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/git/blobs'))).toBe(false);
  });

  it('creates an idempotent pull request using separately requested pull request permission', async () => {
    const idempotencyKey = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
    const markerHash = createHash('sha256').update(JSON.stringify({ branchName: 'patchwork/fix', baseBranch: 'main', title: 'Update header', body: '' })).digest('hex');
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) {
        expect(JSON.parse(String(init?.body))).toEqual({ permissions: { contents: 'read', pull_requests: 'write' } });
        return response({ token: 'temporary' });
      }
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/patchwork/fix')) return response({ name: 'patchwork/fix', protected: false, commit: { sha: 'a'.repeat(40) } });
      if (url.endsWith('/branches/main')) return response({ name: 'main', protected: true, commit: { sha: 'b'.repeat(40) } });
      if (url.includes('/pulls?')) return response([{ number: 12, html_url: 'https://github.com/acme/demo/pull/12', state: 'open', title: 'Update header', body: `<!-- patchwork-operation:${idempotencyKey}:${markerHash} -->`, head: { ref: 'patchwork/fix' }, base: { ref: 'main' } }]);
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await makeService(fetcher as unknown as typeof fetch).createPullRequest(user, '7123', { branchName: 'patchwork/fix', baseBranch: 'main', idempotencyKey, title: 'Update header' });
    expect(result).toMatchObject({ number: 12, created: false, state: 'open' });
    expect(fetcher.mock.calls.some(([input]) => String(input).endsWith('/pulls'))).toBe(false);
  });

  it('creates a pull request only after validating the head and base branches', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = String(input); calls.push({ url, init });
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.endsWith('/branches/patchwork/fix')) return response({ name: 'patchwork/fix', protected: false, commit: { sha: 'a'.repeat(40) } });
      if (url.endsWith('/branches/main')) return response({ name: 'main', protected: true, commit: { sha: 'b'.repeat(40) } });
      if (url.includes('/pulls?')) return response([]);
      if (url.endsWith('/pulls') && init?.method === 'POST') return response({ number: 13, html_url: 'https://github.com/acme/demo/pull/13', state: 'open' }, 201);
      throw new Error(`Unexpected URL ${url}`);
    });
    const result = await makeService(fetcher as unknown as typeof fetch).createPullRequest(user, '7123', {
      branchName: 'patchwork/fix', baseBranch: 'main', idempotencyKey: 'b87e8488-986c-4c06-bd12-bcc2fc49d928', title: 'Update header',
    });
    expect(result).toMatchObject({ number: 13, state: 'open', created: true });
    const create = calls.find((call) => call.url.endsWith('/pulls') && call.init?.method === 'POST')!;
    const body = JSON.parse(String(create.init?.body));
    expect(body).toMatchObject({ head: 'patchwork/fix', base: 'main', title: 'Update header' });
    expect(body.body).toContain('patchwork-operation:');
    expect(JSON.stringify(result)).not.toContain('temporary');
  });
});

describe('GithubAppService configuration and identity', () => {
  const noConfig = { appId: undefined, appSlug: undefined, privateKey: undefined } as const;

  function unconfiguredService(fetcher?: typeof fetch) {
    return new GithubAppService({
      ...noConfig,
      frontendUrl: 'http://localhost:5173',
      supabaseUrl: 'https://example.supabase.co',
      supabaseSecretKey: 'server-secret',
      fetcher: fetcher ?? (vi.fn() as unknown as typeof fetch),
      resolveGithubAccountId: async () => '42',
      saveInstallation: async () => {},
    });
  }

  it('reports not-configured for setup, listing, and installation status without credentials', async () => {
    const service = unconfiguredService();
    await expect(service.createSetupUrl(user.id)).rejects.toMatchObject({ statusCode: 503, code: 'CONFIGURATION_ERROR' });
    await expect(service.listRepositories(user)).rejects.toMatchObject({ statusCode: 503, code: 'CONFIGURATION_ERROR' });
    await expect(service.getInstallation(user)).rejects.toMatchObject({ statusCode: 503, code: 'CONFIGURATION_ERROR' });
  });

  it('refuses setup when the Supabase user has no linked GitHub identity', async () => {
    const service = makeService(vi.fn() as unknown as typeof fetch, { resolveGithubAccountId: async () => null });
    await expect(service.createSetupUrl(user.id)).rejects.toMatchObject({ statusCode: 403 });
  });

  it('returns an empty page when the installation can access no repositories', async () => {
    const fetcher = vi.fn(async (input: string | URL) =>
      String(input).endsWith('/access_tokens')
        ? response({ token: 'temporary' })
        : response({ total_count: 0, repositories: [] }),
    );
    const result = await makeService(fetcher as unknown as typeof fetch).listRepositories(user);
    expect(result).toEqual({ repositories: [], page: 1, perPage: 50, hasMore: false });
  });

  it('maps GitHub rate-limit and transport failures to 502 without leaking tokens', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'installation-secret' });
      return response({ message: 'API rate limit exceeded' }, 429);
    });
    await expect(makeService(fetcher as unknown as typeof fetch).listRepositories(user)).rejects.toMatchObject({ statusCode: 502 });
  });

  it('rejects invalid refs before reading source', async () => {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      throw new Error('Unexpected URL');
    });
    const service = makeService(fetcher as unknown as typeof fetch);
    await expect(service.readSource(user, '7123', 'src/App.tsx', '../evil')).rejects.toMatchObject({ statusCode: 400 });
    await expect(service.readSource(user, '7123', 'src/App.tsx', '/abs')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('reports installation linkage without exposing tokens', async () => {
    const service = makeService(vi.fn() as unknown as typeof fetch);
    expect(await service.getInstallation(user)).toEqual({ connected: true, installationId: 456 });
    expect(await service.getInstallation({ id: 'supabase-user-2' })).toEqual({ connected: false });
    expect(JSON.stringify(await service.getInstallation(user))).not.toContain('secret');
  });

  it('isolates installations per user: a user without a linkage cannot list', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch;
    await expect(makeService(fetcher).listRepositories({ id: 'supabase-user-2' })).rejects.toMatchObject({ statusCode: 403 });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('mints per-installation tokens, never reusing another installation', async () => {
    const seen: string[] = [];
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      seen.push(url);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.includes('/installation/repositories')) return response({ total_count: 0, repositories: [] });
      throw new Error('Unexpected URL');
    });
    const other = { id: 'supabase-user-9', app_metadata: { patchwork_github_installation_id: 777 } };
    await makeService(fetcher as unknown as typeof fetch).listRepositories(other);
    expect(seen.some((url) => url.includes('/app/installations/777/access_tokens'))).toBe(true);
    expect(seen.some((url) => url.includes('/app/installations/456/'))).toBe(false);
  });
});

describe('GithubAppService PATCHWORK manifest support', () => {
  const manifest = JSON.stringify({ schemaVersion: 1, components: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] });

  function manifestService(manifestResponse: (url: string) => unknown) {
    const fetcher = vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      return manifestResponse(url) as Response;
    });
    return makeService(fetcher as unknown as typeof fetch);
  }

  it('reports supported repositories with a component count', async () => {
    const body = manifest;
    const service = manifestService((url) =>
      url.includes('/contents/patchwork-registry.json')
        ? response({ type: 'file', size: Buffer.byteLength(body), encoding: 'base64', content: Buffer.from(body).toString('base64'), path: 'patchwork-registry.json' })
        : response({}, 404),
    );
    const result = await service.checkPatchworkSupport(user, '7123');
    expect(result.supported).toBe(true);
    if (result.supported) expect(result.componentCount).toBe(3);
  });

  it('reports missing manifests instead of throwing', async () => {
    const service = manifestService(() => response({}, 404));
    const result = await service.checkPatchworkSupport(user, '7123');
    expect(result).toMatchObject({ supported: false, reason: 'no-manifest' });
  });

  it('reports invalid manifests instead of throwing', async () => {
    const bad = 'not json{{{';
    const service = manifestService(() =>
      response({ type: 'file', size: bad.length, encoding: 'base64', content: Buffer.from(bad).toString('base64'), path: 'patchwork-registry.json' }),
    );
    const result = await service.checkPatchworkSupport(user, '7123');
    expect(result).toMatchObject({ supported: false, reason: 'invalid-manifest' });
  });

  it('rejects repositories outside the authorized installation', async () => {
    const fetcher = vi.fn(async (input: string | URL) =>
      String(input).endsWith('/access_tokens') ? response({ token: 'temporary' }) : response({}, 404),
    );
    await expect(makeService(fetcher as unknown as typeof fetch).checkPatchworkSupport(user, '9999')).rejects.toMatchObject({ statusCode: 404 });
  });
});

describe('GithubRepositoryProvider via createRepositoryProvider', () => {
  const body = 'export const value = 42;';

  function providerService() {
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.includes('/contents/src/App.tsx')) {
        return response({ type: 'file', size: Buffer.byteLength(body), encoding: 'base64', content: Buffer.from(body).toString('base64'), path: 'src/App.tsx' });
      }
      return response({}, 404);
    });
    return makeService(fetcher as unknown as typeof fetch);
  }

  it('reads authorized files through the installation-bound provider', async () => {
    const provider = await providerService().createRepositoryProvider(user, '7123');
    expect(provider.getRepositoryRoot()).toBe('github:acme/demo@main');
    await expect(provider.readFile('src/App.tsx')).resolves.toBe(body);
    await expect(provider.fileExists('src/App.tsx')).resolves.toBe(true);
    await expect(provider.fileExists('src/Missing.tsx')).resolves.toBe(false);
  });

  it('rejects repositories outside the installation and invalid refs', async () => {
    const service = providerService();
    await expect(service.createRepositoryProvider(user, '9999')).rejects.toMatchObject({ statusCode: 404 });
    await expect(service.createRepositoryProvider(user, '7123', '../evil')).rejects.toMatchObject({ statusCode: 400 });
  });

  it('respects an explicit authorized ref in reads and labels', async () => {
    const seen: string[] = [];
    const fetcher = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      seen.push(url);
      if (url.endsWith('/access_tokens')) return response({ token: 'temporary' });
      if (url.endsWith('/repositories/7123')) return response(repo);
      if (url.includes('/contents/src/App.tsx')) {
        return response({ type: 'file', size: Buffer.byteLength(body), encoding: 'base64', content: Buffer.from(body).toString('base64'), path: 'src/App.tsx' });
      }
      return response({}, 404);
    });
    const provider = await makeService(fetcher as unknown as typeof fetch).createRepositoryProvider(user, '7123', 'develop');
    expect(provider.getRepositoryRoot()).toBe('github:acme/demo@develop');
    await provider.readFile('src/App.tsx');
    expect(seen.some((url) => url.includes('ref=develop'))).toBe(true);
  });
});
