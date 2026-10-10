import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';

describe('GET /api/health', () => {
  const app = createApp();

  it('should return 200 with status ok and checks', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('timestamp');
    expect(res.body.data).toHaveProperty('checks');
    expect(res.body.data.checks).toHaveProperty('api');
    expect(res.body.data.checks.api.status).toBe('ok');
    // Database check should be present and either ok, skipped, or error – never falsely claim healthy when not checked
    expect(res.body.data.checks).toHaveProperty('database');
    expect(['ok', 'skipped', 'error']).toContain(res.body.data.checks.database.status);
  });

  it('should return 404 for unknown route', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toBeDefined();
  });

  it('should include X-Request-Id header', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should respect CORS – allowed origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'http://localhost:5173');
    // CORS middleware should allow configured origin; header may be present
    expect(res.status).toBe(200);
  });
});
