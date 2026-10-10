import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const testConfig = vi.hoisted(() => ({ workerSecret: 'unit-test-worker-secret-minimum-thirty-two-bytes' }));
vi.mock('../../src/config/env', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/config/env')>();
  return { ...actual, getEnv: () => ({ ...actual.getEnv(), INTERNAL_WORKER_SECRET: testConfig.workerSecret }) };
});
vi.mock('../../src/modules/workflow/workflow.service', () => ({
  workflowService: { recordGeneration: vi.fn(), recordValidation: vi.fn() },
}));

import { createApp } from '../../src/app';
import { workerSignature } from '../../src/middleware/authenticate-worker';
import { workflowService } from '../../src/modules/workflow/workflow.service';

describe('trusted workflow callbacks', () => {
  const app = createApp();
  const path = '/api/internal/projects/project-1/patches/patch-1/generation-result';
  const payload = {
    type: 'generation',
    generationId: 'b87e8488-986c-4c06-bd12-bcc2fc49d928',
    success: true,
    branchName: 'patch/header',
    baseCommitSha: 'a'.repeat(40),
    headCommitSha: 'b'.repeat(40),
    filesChanged: 1,
    additions: 2,
    deletions: 0,
  };

  beforeEach(() => vi.clearAllMocks());

  it('accepts only signed worker requests and validates the callback contract', async () => {
    vi.mocked(workflowService.recordGeneration).mockResolvedValue({ id: 'patch-1', status: 'GENERATED' } as never);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(payload);
    const signature = workerSignature(testConfig.workerSecret, timestamp, 'POST', path, rawBody);
    const response = await request(app).post(path)
      .set('x-patchwork-timestamp', timestamp)
      .set('x-patchwork-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody);

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe('GENERATED');
    expect(workflowService.recordGeneration).toHaveBeenCalledWith('project-1', 'patch-1', payload);
  });

  it('rejects missing or invalid worker signatures', async () => {
    const response = await request(app).post(path).send(payload);
    expect(response.status).toBe(401);
    expect(workflowService.recordGeneration).not.toHaveBeenCalled();
  });

  it('rejects expired timestamps and compressed request bodies', async () => {
    const expiredTimestamp = String(Math.floor(Date.now() / 1000) - 301);
    const rawBody = JSON.stringify(payload);
    const expiredSignature = workerSignature(testConfig.workerSecret, expiredTimestamp, 'POST', path, rawBody);
    const expired = await request(app).post(path)
      .set('x-patchwork-timestamp', expiredTimestamp)
      .set('x-patchwork-signature', expiredSignature)
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(expired.status).toBe(401);

    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = workerSignature(testConfig.workerSecret, timestamp, 'POST', path, rawBody);
    const compressed = await request(app).post(path)
      .set('x-patchwork-timestamp', timestamp)
      .set('x-patchwork-signature', signature)
      .set('Content-Encoding', 'gzip')
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(compressed.status).not.toBe(200);
    expect(workflowService.recordGeneration).not.toHaveBeenCalled();
  });

  it('rejects malformed result bodies before recording anything', async () => {
    const invalid = { ...payload, headCommitSha: 'not-a-sha' };
    const timestamp = String(Math.floor(Date.now() / 1000));
    const rawBody = JSON.stringify(invalid);
    const signature = workerSignature(testConfig.workerSecret, timestamp, 'POST', path, rawBody);
    const response = await request(app).post(path)
      .set('x-patchwork-timestamp', timestamp)
      .set('x-patchwork-signature', signature)
      .set('Content-Type', 'application/json')
      .send(rawBody);
    expect(response.status).toBe(400);
    expect(workflowService.recordGeneration).not.toHaveBeenCalled();
  });
});
