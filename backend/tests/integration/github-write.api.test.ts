import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(() => true),
  getSupabaseClient: vi.fn(() => ({ auth: { getUser: getUser.mockImplementation(async (token: string) => token === 'valid'
    ? { data: { user: { id: 'user-1', aud: 'authenticated', app_metadata: { patchwork_github_installation_id: 456 } } }, error: null }
    : { data: { user: null }, error: { message: 'invalid' } }) } })),
}));
vi.mock('../../src/services/github-app.service', () => ({ githubAppService: {
  createPatchBranch: vi.fn(), commitPatchFiles: vi.fn(), createPullRequest: vi.fn(),
  createSetupUrl: vi.fn(), listRepositories: vi.fn(), getRepository: vi.fn(), readSource: vi.fn(), completeInstallation: vi.fn(),
} }));

import { createApp } from '../../src/app';
import { githubAppService } from '../../src/services/github-app.service';

describe('GitHub write API', () => {
  const app = createApp();
  beforeEach(() => vi.clearAllMocks());

  it('requires a verified Supabase bearer token for repository writes', async () => {
    const response = await request(app).post('/api/github/repositories/7123/branches').send({ branchName: 'patchwork/fix', baseRef: 'main' });
    expect(response.status).toBe(401);
    expect(githubAppService.createPatchBranch).not.toHaveBeenCalled();
  });

  it('rejects malformed file payloads before reaching the GitHub service', async () => {
    const response = await request(app).post('/api/github/repositories/7123/commits')
      .set('Authorization', 'Bearer valid')
      .send({ branchName: 'main', expectedHeadSha: 'not-a-sha', idempotencyKey: 'nope', message: '', files: [{ path: '../.env', content: 'secret' }] });
    expect(response.status).toBe(400);
    expect(githubAppService.commitPatchFiles).not.toHaveBeenCalled();
  });

  it('routes a valid branch request through the authorized user identity', async () => {
    vi.mocked(githubAppService.createPatchBranch).mockResolvedValue({ branchName: 'patchwork/fix', created: true } as never);
    const response = await request(app).post('/api/github/repositories/7123/branches')
      .set('Authorization', 'Bearer valid').send({ branchName: 'patchwork/fix', baseRef: 'main' });
    expect(response.status).toBe(201);
    expect(githubAppService.createPatchBranch).toHaveBeenCalledWith(expect.objectContaining({ id: 'user-1', app_metadata: { patchwork_github_installation_id: 456 } }), '7123', { branchName: 'patchwork/fix', baseRef: 'main' });
  });
});
