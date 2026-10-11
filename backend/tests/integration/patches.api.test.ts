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
vi.mock('../../src/modules/patches/patches.service', () => ({
  patchesService: {
    create: vi.fn(), list: vi.fn(), get: vi.fn(), updateStatus: vi.fn(), createPullRequest: vi.fn(),
  },
}));

import { createApp } from '../../src/app';
import { patchesService } from '../../src/modules/patches/patches.service';
import { AppError } from '../../src/shared/errors/AppError';

describe('Patch API', () => {
  const app = createApp();
  beforeEach(() => { vi.clearAllMocks(); });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/projects/project-1/patches');
    expect(res.status).toBe(401);
  });

  it('creates patches with prompt and verified user identity', async () => {
    vi.mocked(patchesService.create).mockResolvedValue({ id: 'patch-1', validationDetails: { secret: 'private' } } as never);
    const res = await request(app).post('/api/projects/project-1/patches')
      .set('Authorization', 'Bearer valid').send({ prompt: 'Change the header' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ success: true, data: { id: 'patch-1' } });
    expect(patchesService.create).toHaveBeenCalledWith({
      projectId: 'project-1', prompt: 'Change the header', createdBy: 'user-1',
    });
  });

  it('rejects malformed input before calling the service', async () => {
    const res = await request(app).post('/api/projects/project-1/patches')
      .set('Authorization', 'Bearer valid').send({ prompt: ' ' });
    expect(res.status).toBe(422);
    expect(patchesService.create).not.toHaveBeenCalled();
  });

  it('returns an owner-scoped not found response for inaccessible patches', async () => {
    vi.mocked(patchesService.get).mockRejectedValue(new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' }));
    const res = await request(app).get('/api/projects/project-1/patches/guessed-id')
      .set('Authorization', 'Bearer valid');
    expect(res.status, JSON.stringify(res.body)).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(patchesService.get).toHaveBeenCalledWith('project-1', 'guessed-id', 'user-1');
  });

  const patch = (overrides: Record<string, unknown> = {}) => ({
    id: 'patch-1', projectId: 'project-1', prompt: 'Update header', summary: 'Blue header', status: 'DRAFT',
    branchName: 'patch/header', baseCommitSha: 'base-sha', headCommitSha: 'head-sha',
    pullRequestNumber: null, pullRequestUrl: null, filesChanged: 1, additions: 2, deletions: 1,
    validationPassed: null, validationDetails: { log: 'provider internal output' },
    createdBy: 'user-1', reviewedBy: null, reviewedAt: null, reviewComment: null,
    createdAt: '2026-10-10T00:00:00.000Z', updatedAt: '2026-10-10T00:00:00.000Z', ...overrides,
  });

  it('lists patches with public metadata while omitting raw validation details', async () => {
    vi.mocked(patchesService.list).mockResolvedValue([patch()] as never);
    const res = await request(app).get('/api/projects/project-1/patches').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data[0]).toMatchObject({ id: 'patch-1', branchName: 'patch/header', headCommitSha: 'head-sha' });
    expect(res.body.data[0]).not.toHaveProperty('validationDetails');
    expect(patchesService.list).toHaveBeenCalledWith('project-1', 'user-1');
    expect(getUser).toHaveBeenCalledTimes(1);
  });

  it('gets a patch with the public response shape', async () => {
    vi.mocked(patchesService.get).mockResolvedValue(patch() as never);
    const res = await request(app).get('/api/projects/project-1/patches/patch-1').set('Authorization', 'Bearer valid');
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: 'patch-1', prompt: 'Update header', status: 'DRAFT' });
    expect(res.body.data).not.toHaveProperty('validationDetails');
    expect(patchesService.get).toHaveBeenCalledWith('project-1', 'patch-1', 'user-1');
  });

  it('updates a permitted status and takes reviewer identity from authentication', async () => {
    vi.mocked(patchesService.updateStatus).mockResolvedValue(patch({
      status: 'APPROVED', reviewedBy: 'user-1', validationDetails: { log: 'private' },
    }) as never);
    const res = await request(app).patch('/api/projects/project-1/patches/patch-1/status')
      .set('Authorization', 'Bearer valid').send({ status: 'APPROVED', reviewComment: 'Looks good' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'APPROVED', reviewedBy: 'user-1' });
    expect(res.body.data).not.toHaveProperty('validationDetails');
    expect(patchesService.updateStatus).toHaveBeenCalledWith('project-1', 'patch-1', 'user-1', 'APPROVED', 'Looks good');
  });

  it('creates a pull request only through the owned approved patch service', async () => {
    vi.mocked(patchesService.createPullRequest).mockResolvedValue({
      number: 14, url: 'https://github.com/acme/site/pull/14', state: 'open', created: true,
      patch: patch({ status: 'APPROVED', pullRequestNumber: 14 }),
    } as never);
    const res = await request(app).post('/api/projects/project-1/patches/patch-1/pull-request')
      .set('Authorization', 'Bearer valid').send({});

    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe(14);
    expect(res.body.data.patch.pullRequestNumber).toBe(14);
    expect(patchesService.createPullRequest).toHaveBeenCalledWith('project-1', 'patch-1', expect.objectContaining({ id: 'user-1' }));
  });

  it('returns only the server-created generation correlation ID when generation starts', async () => {
    const generationId = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
    vi.mocked(patchesService.updateStatus).mockResolvedValue(patch({
      status: 'GENERATING',
      validationDetails: { workflow: { generationId, outcome: 'PENDING' }, validation: null, privateLog: 'hidden' },
    }) as never);
    const res = await request(app).patch('/api/projects/project-1/patches/patch-1/status')
      .set('Authorization', 'Bearer valid').send({ status: 'GENERATING' });

    expect(res.status).toBe(200);
    expect(res.body.data.generationId).toBe(generationId);
    expect(res.body.data).not.toHaveProperty('validationDetails');
    expect(JSON.stringify(res.body)).not.toContain('privateLog');
  });

  it('rejects a status payload that could claim a workflow result', async () => {
    const res = await request(app).patch('/api/projects/project-1/patches/patch-1/status')
      .set('Authorization', 'Bearer valid').send({ status: 'DEPLOYED', headCommitSha: 'forged-sha' });
    expect(res.status).toBe(422);
    expect(patchesService.updateStatus).not.toHaveBeenCalled();
  });
});
