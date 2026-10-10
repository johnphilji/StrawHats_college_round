import { afterAll, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { GithubAppService } from '../../src/services/github-app.service';

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048, privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });
const repo = { id: 7123, name: 'demo', full_name: 'acme/demo', private: true, description: 'Demo source', html_url: 'https://github.com/acme/demo', default_branch: 'main', owner: { login: 'acme' } };
const user = { id: 'supabase-user-1', app_metadata: { patchwork_github_installation_id: 456 } };

function response(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

function makeService(fetcher: typeof fetch) {
  return new GithubAppService({ appId: '9876', appSlug: 'patchwork', privateKey, frontendUrl: 'http://localhost:5173', supabaseUrl: 'https://example.supabase.co', supabaseSecretKey: 'server-secret', fetcher });
}

describe('GithubAppService', () => {
  const original = { appId: process.env.GITHUB_APP_ID, slug: process.env.GITHUB_APP_SLUG, key: process.env.GITHUB_APP_PRIVATE_KEY, callback: process.env.GITHUB_APP_CALLBACK_URL, url: process.env.SUPABASE_URL, secret: process.env.SUPABASE_SECRET_KEY };
  afterAll(() => {
    for (const [key, value] of Object.entries({ GITHUB_APP_ID: original.appId, GITHUB_APP_SLUG: original.slug, GITHUB_APP_PRIVATE_KEY: original.key, GITHUB_APP_CALLBACK_URL: original.callback, SUPABASE_URL: original.url, SUPABASE_SECRET_KEY: original.secret })) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it('creates a short lived signed installation URL bound to the requesting user', () => {
    const service = makeService(vi.fn() as unknown as typeof fetch);
    const url = new URL(service.createSetupUrl(user.id));
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/apps/patchwork/installations/new');
    expect(url.searchParams.get('state')).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
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
});
