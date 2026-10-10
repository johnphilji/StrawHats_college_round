import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../../src/app';
import { resetEnvCache } from '../../src/config/env';

describe('Component Routes API Integration', () => {
  const app = createApp();
  let tempRepoDir: string;
  let originalRepoPath: string | undefined;

  beforeAll(() => {
    originalRepoPath = process.env.TARGET_REPOSITORY_PATH;
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-route-test-'));
    const compDir = path.join(tempRepoDir, 'src', 'components');
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(
      path.join(compDir, 'Hero.jsx'),
      'export const Hero = () => <h1>Hero Component</h1>;\n',
      'utf8'
    );
    process.env.TARGET_REPOSITORY_PATH = tempRepoDir;
    // getEnv() caches on first use (e.g. at createApp time); re-read the override.
    resetEnvCache();
  });

  afterAll(() => {
    process.env.TARGET_REPOSITORY_PATH = originalRepoPath;
    resetEnvCache();
    try {
      fs.rmSync(tempRepoDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  describe('GET /api/components', () => {
    it('returns a list of registered editable components with safe metadata', async () => {
      const res = await request(app).get('/api/components');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(2);

      for (const comp of res.body.data) {
        expect(comp.id).toBeDefined();
        expect(comp.componentName).toBeDefined();
        expect(comp.editable).toBe(true);
        // Ensure no internal file paths are leaked
        expect(comp.filePath).toBeUndefined();
        expect(comp.sourceCode).toBeUndefined();
      }
    });
  });

  describe('GET /api/components/:componentId', () => {
    it('returns 200 and safe metadata for a registered editable component', async () => {
      const res = await request(app).get('/api/components/hero-heading');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({
        id: 'hero-heading',
        componentName: 'Hero',
        editable: true,
        editableScope: 'content',
        allowedOperations: ['text', 'typography', 'styling'],
        description: 'Main hero H1: restaurant name.',
        framework: 'react',
      });

      // Ensure no raw source code or server-side file paths are returned
      expect(res.body.data.filePath).toBeUndefined();
      expect(res.body.data.sourceCode).toBeUndefined();
    });

    it('returns 404 NOT_FOUND for an unknown component ID', async () => {
      const res = await request(app).get('/api/components/unknown-component-id');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toContain('unknown-component-id');
    });

    it('returns 404 NOT_FOUND for a rendered-but-unregistered element ID', async () => {
      // e.g. review cards on the target site carry no data-patchwork-id mapping
      const res = await request(app).get('/api/components/review-card-1');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('returns 400 BAD_REQUEST for an empty or whitespace component ID', async () => {
      const res = await request(app).get('/api/components/%20');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });
  });

  describe('GET /api/components/:componentId/source', () => {
    it('returns 200 with resolved component context including source code in dev/test', async () => {
      const res = await request(app).get('/api/components/hero-heading/source');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.componentId).toBe('hero-heading');
      expect(res.body.data.filePath).toBe('src/components/Hero.jsx');
      expect(res.body.data.sourceCode).toContain('Hero Component');
    });

    it('returns 404 for missing source file', async () => {
      // navbar-cta maps to Navbar.jsx, which is not created in tempRepoDir
      const res = await request(app).get('/api/components/navbar-cta/source');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
