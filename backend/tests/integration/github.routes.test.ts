import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(() => ({
    auth: { getUser: getUser.mockImplementation(async (token: string) => token === 'valid'
      ? { data: { user: { id: 'user-1', aud: 'authenticated' } }, error: null }
      : { data: { user: null }, error: { message: 'invalid' } }) },
  })),
}));

const githubMocks = vi.hoisted(() => ({
  createSetupUrl: vi.fn(),
  getInstallation: vi.fn(),
  listRepositories: vi.fn(),
  getRepository: vi.fn(),
  readSource: vi.fn(),
  checkPatchworkSupport: vi.fn(),
  completeInstallation: vi.fn(),
}));
vi.mock('../../src/services/github-app.service', () => ({
  githubAppService: githubMocks,
}));

import { createApp } from '../../src/app';
import { AppError } from '../../src/shared/errors/AppError';

describe('GitHub routes', () => {
  const app = createApp();
  beforeEach(() => { vi.clearAllMocks(); });

  it.each([
    ['POST', '/api/github/installation/setup'],
    ['GET', '/api/github/installation'],
    ['GET', '/api/github/repositories'],
    ['GET', '/api/github/repositories/123'],
    ['GET', '/api/github/repositories/123/source?path=a.ts'],
    ['GET', '/api/github/repositories/123/patchwork'],
  ])('%s %s requires authentication', async (method, url) => {
    const res = await (request(app) as unknown as Record<string, (u: string) => request.Test>)[method.toLowerCase()](url);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('rejects an invalid bearer token', async () => {
    const res = await request(app).get('/api/github/repositories').set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(401);
  });

  it('starts installation setup and returns the GitHub URL', async () => {
    githubMocks.createSetupUrl.mockResolvedValue('https://github.com/apps/patchwork/installations/new?state=x.y');
    const res = await request(app).post('/api/github/installation/setup').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { url: expect.stringContaining('https://github.com/apps/') } });
    expect(githubMocks.createSetupUrl).toHaveBeenCalledWith('user-1');
  });

  it('surfaces unconfigured integration as an explicit error', async () => {
    githubMocks.listRepositories.mockRejectedValue(
      new AppError('GitHub App integration is not configured.', { statusCode: 503, code: 'CONFIGURATION_ERROR' }),
    );
    const res = await request(app).get('/api/github/repositories').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('CONFIGURATION_ERROR');
  });

  it('returns the linked installation status', async () => {
    githubMocks.getInstallation.mockResolvedValue({ connected: true, installationId: 456 });
    const res = await request(app).get('/api/github/installation').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, data: { connected: true, installationId: 456 } });
    expect(githubMocks.getInstallation).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }));
  });

  it('lists repositories with validated pagination', async () => {
    githubMocks.listRepositories.mockResolvedValue({ repositories: [], page: 2, perPage: 10, hasMore: false });
    const res = await request(app).get('/api/github/repositories?page=2&per_page=10').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(githubMocks.listRepositories).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), 2, 10);
  });

  it('rejects invalid pagination before reaching the service', async () => {
    const res = await request(app).get('/api/github/repositories?page=0').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(400);
    expect(githubMocks.listRepositories).not.toHaveBeenCalled();
  });

  it('requires a source path for file retrieval', async () => {
    const res = await request(app).get('/api/github/repositories/123/source').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(400);
    expect(githubMocks.readSource).not.toHaveBeenCalled();
  });

  it('checks PATCHWORK manifest support for a repository', async () => {
    githubMocks.checkPatchworkSupport.mockResolvedValue({ supported: false, reason: 'no-manifest' });
    const res = await request(app).get('/api/github/repositories/123/patchwork').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ supported: false, reason: 'no-manifest' });
    expect(githubMocks.checkPatchworkSupport).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1' }), '123', undefined);
  });

  it('rejects an incomplete installation callback', async () => {
    const res = await request(app).get('/api/github/callback?installation_id=1&setup_action=cancelled&state=x');
    expect(res.status).toBe(400);
    expect(githubMocks.completeInstallation).not.toHaveBeenCalled();
  });

  it('completes the callback and redirects to the frontend', async () => {
    process.env.FRONTEND_URL = 'http://localhost:5173';
    githubMocks.completeInstallation.mockResolvedValue(undefined);
    const res = await request(app).get('/api/github/callback?installation_id=456&setup_action=install&state=x.y');
    expect(res.status).toBe(303);
    expect(res.headers.location).toContain('github_connected=1');
    expect(githubMocks.completeInstallation).toHaveBeenCalledWith('x.y', '456');
  });
});
