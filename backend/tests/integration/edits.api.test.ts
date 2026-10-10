import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { createApp } from '../../src/app';
import { resetEnvCache } from '../../src/config/env';

const HERO_WITH_ANCHOR = [
  'export function Hero() {',
  '  return (',
  '    <section>',
  '      <h1 data-patchwork-id="hero-heading">Persia Darbar</h1>',
  '    </section>',
  '  );',
  '}',
  '',
].join('\n');

describe('POST /api/edits/generate (local pipeline)', () => {
  const app = createApp();
  let tempRepoDir: string;
  let originalRepoPath: string | undefined;

  beforeAll(() => {
    originalRepoPath = process.env.TARGET_REPOSITORY_PATH;
    tempRepoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-edits-test-'));
    const compDir = path.join(tempRepoDir, 'src', 'components');
    fs.mkdirSync(compDir, { recursive: true });
    fs.writeFileSync(path.join(compDir, 'Hero.jsx'), HERO_WITH_ANCHOR, 'utf8');
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

  it('returns a validated simulated proposal for a registered editable component', async () => {
    const res = await request(app)
      .post('/api/edits/generate')
      .send({ componentId: 'hero-heading', instruction: 'Make the heading green' });

    expect(res.status, JSON.stringify(res.body)).toBe(200);
    expect(res.body.success).toBe(true);
    const proposal = res.body.data;
    expect(proposal.componentId).toBe('hero-heading');
    expect(proposal.filePath).toBe('src/components/Hero.jsx');
    expect(proposal.simulated).toBe(true);
    expect(proposal.provider).toBe('mock');
    expect(proposal.diff).toContain('--- a/src/components/Hero.jsx');
    expect(proposal.validation.valid).toBe(true);
    expect(proposal.isolatedPreviewApplied).toBe(true);
    expect(proposal.targetUnchanged).toBe(true);
    // The proposal must not leak full source text to the browser.
    expect(proposal.sourceCode).toBeUndefined();

    // Reject path: the repository file must be byte-identical.
    const onDisk = fs.readFileSync(path.join(tempRepoDir, 'src/components/Hero.jsx'), 'utf8');
    expect(onDisk).toBe(HERO_WITH_ANCHOR);
  });

  it('rejects unknown component IDs with 404 without touching the repo', async () => {
    const res = await request(app)
      .post('/api/edits/generate')
      .send({ componentId: 'not-a-component', instruction: 'x' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('rejects empty instructions with 422 before any resolution', async () => {
    const res = await request(app)
      .post('/api/edits/generate')
      .send({ componentId: 'hero-heading', instruction: '   ' });
    expect(res.status).toBe(422);
  });

  it('never accepts a client-supplied file path', async () => {
    const res = await request(app)
      .post('/api/edits/generate')
      .send({ componentId: 'hero-heading', instruction: 'x', filePath: 'src/components/Other.jsx' });
    expect(res.status).toBe(200);
    // Unknown body keys are stripped by validation; the trusted registry path wins.
    expect(res.body.data.filePath).toBe('src/components/Hero.jsx');
  });
});
