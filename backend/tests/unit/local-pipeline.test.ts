import { describe, it, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  componentRegistry,
  validateRegistrySchema,
} from '../../src/config/component-registry';
import { ComponentResolverService } from '../../src/services/component-resolver.service';
import { LocalRepositoryProvider } from '../../src/services/repository-provider.service';
import {
  MockPatchProvider,
  getPatchProvider,
  sanitizeInstructionNote,
} from '../../src/integrations/llm/provider';
import {
  validatePatchDiff,
  applyParsedDiff,
  parseUnifiedDiff,
} from '../../src/services/patch-validation.service';
import { EditOrchestrationService } from '../../src/services/edit-orchestration.service';
import {
  ComponentNotFoundError,
  ComponentNotEditableError,
  SourceFileNotFoundError,
} from '../../src/errors/component.errors';
import type { ComponentRegistry } from '../../src/types/component.types';
import { patchesService } from '../../src/modules/patches/patches.service';
import { patchesRepository } from '../../src/modules/patches/patches.repository';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/patches/patches.repository', () => ({
  patchesRepository: {
    findOwnedProject: vi.fn(), create: vi.fn(), list: vi.fn(), findById: vi.fn(), updateStatus: vi.fn(),
  },
}) as never);

// IDs copied from the canonical target manifest
// (apps/react-website/component-registry.js / patchwork-registry.json).
const EXPECTED_REGISTRY_IDS = [
  'navbar-brand', 'navbar-cta',
  'hero-heading', 'hero-tagline', 'hero-description', 'hero-reservation-cta',
  'about-heading', 'about-description',
  'menu-section-heading',
  'menu-butter-chicken-darbari-name', 'menu-butter-chicken-darbari-price',
  'menu-dragon-chilli-prawns-name', 'menu-dragon-chilli-prawns-price',
  'menu-murgh-dum-biryani-name', 'menu-murgh-dum-biryani-price',
  'menu-hakka-noodles-supreme-name', 'menu-hakka-noodles-supreme-price',
  'chef-special-heading', 'chef-special-description', 'chef-special-price',
  'reservation-heading', 'reservation-submit',
  'contact-phone', 'opening-hours-text',
  'footer-about',
];

describe('backend registry mirrors the canonical target manifest', () => {
  it('contains exactly the 25 instrumented component IDs', () => {
    expect(Object.keys(componentRegistry).sort()).toEqual([...EXPECTED_REGISTRY_IDS].sort());
  });

  it('passes schema validation and marks every entry editable with a .jsx path', () => {
    expect(() => validateRegistrySchema(componentRegistry)).not.toThrow();
    for (const entry of Object.values(componentRegistry)) {
      expect(entry.editable).toBe(true);
      expect(entry.filePath.endsWith('.jsx')).toBe(true);
      expect(entry.componentName.trim().length).toBeGreaterThan(0);
    }
  });
});

const HERO_SOURCE = [
  'export function Hero() {',
  '  return (',
  '    <section>',
  '      <h1 data-patchwork-id="hero-heading">Persia Darbar</h1>',
  '    </section>',
  '  );',
  '}',
  '',
].join('\n');

function makeTempRepo(files: Record<string, string>): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'patchwork-local-pipe-'));
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content, 'utf8');
  }
  return dir;
}

describe('MockPatchProvider', () => {
  const provider = new MockPatchProvider();
  const contextOf = (sourceCode: string) => ({
    componentId: 'hero-heading',
    filePath: 'src/components/Hero.jsx',
    componentName: 'Hero',
    sourceCode,
  });

  it('produces deterministic output for identical inputs', async () => {
    const input = { componentId: 'hero-heading', instruction: 'Make it green', context: contextOf(HERO_SOURCE) };
    const a = await provider.generate(input);
    const b = await provider.generate(input);
    expect(a.diff).toBe(b.diff);
    expect(a.simulated).toBe(true);
    expect(a.provider).toBe('mock');
    expect(a.changedFiles).toEqual(['src/components/Hero.jsx']);
  });

  it('anchors the insertion on the data-patchwork-id line and labels it simulated', async () => {
    const out = await provider.generate({
      componentId: 'hero-heading',
      instruction: 'Rename to "Continue"',
      context: contextOf(HERO_SOURCE),
    });
    expect(out.diff).toContain('--- a/src/components/Hero.jsx');
    expect(out.diff).toContain('+++ b/src/components/Hero.jsx');
    expect(out.diff).toContain('PATCHWORK simulated edit');
    expect(out.summary).toMatch(/simulated/i);
    expect(out.warnings.join(' ')).toMatch(/no LLM was called/i);
  });

  it('returns an empty diff with a warning when the anchor is absent', async () => {
    const out = await provider.generate({
      componentId: 'hero-heading',
      instruction: 'x',
      context: contextOf('export const Hero = () => <h1>No anchor here</h1>;\n'),
    });
    expect(out.diff).toBe('');
    expect(out.changedFiles).toEqual([]);
    expect(out.warnings.length).toBeGreaterThan(0);
  });

  it('sanitizes instruction text embedded in the comment', () => {
    expect(sanitizeInstructionNote('a */ b\nc')).not.toContain('*/');
  });

  it('fails fast on an unknown provider name instead of silently falling back', () => {
    const previous = process.env.LLM_PROVIDER;
    process.env.LLM_PROVIDER = 'groq-not-yet-wired';
    try {
      expect(() => getPatchProvider()).toThrow(/Unknown patch provider/);
    } finally {
      if (previous === undefined) delete process.env.LLM_PROVIDER;
      else process.env.LLM_PROVIDER = previous;
    }
    expect(getPatchProvider()).toBeInstanceOf(MockPatchProvider);
  });
});

describe('validatePatchDiff', () => {
  const file = 'src/components/Hero.jsx';

  it('accepts a well-formed single-file insertion matching the source', async () => {
    const provider = new MockPatchProvider();
    const out = await provider.generate({
      componentId: 'hero-heading',
      instruction: 'demo',
      context: { componentId: 'hero-heading', filePath: file, componentName: 'Hero', sourceCode: HERO_SOURCE },
    });
    const result = validatePatchDiff(out.diff, file, HERO_SOURCE);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.changedFiles).toEqual([file]);
    const { parsed } = parseUnifiedDiff(out.diff);
    expect(() => applyParsedDiff(HERO_SOURCE, parsed!)).not.toThrow();
  });

  it('rejects malformed diffs without headers or hunks', () => {
    expect(validatePatchDiff('just some text', file, HERO_SOURCE).valid).toBe(false);
    expect(validatePatchDiff('--- a/x\n+++ b/x\nno hunks here', file, HERO_SOURCE).valid).toBe(false);
  });

  it('rejects diffs touching unregistered files', () => {
    const evil = [
      '--- a/src/components/Other.jsx',
      '+++ b/src/components/Other.jsx',
      '@@ -1,0 +2,1 @@',
      '+x',
      '',
    ].join('\n');
    const result = validatePatchDiff(evil, file, HERO_SOURCE);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toContain(file);
  });

  it('rejects file creation/deletion markers and traversal paths', () => {
    const created = ['--- /dev/null', `+++ b/${file}`, '@@ -0,0 +1,1 @@', '+x', ''].join('\n');
    expect(validatePatchDiff(created, file, HERO_SOURCE).valid).toBe(false);
    const traversal = ['--- a/../secret.js', '+++ b/../secret.js', '@@ -1,0 +1,1 @@', '+x', ''].join('\n');
    expect(validatePatchDiff(traversal, file, HERO_SOURCE).valid).toBe(false);
  });

  it('rejects removal lines that do not match the current source', () => {
    const bad = [
      `--- a/${file}`,
      `+++ b/${file}`,
      '@@ -4,1 +4,1 @@',
      '-<h1>Something else entirely</h1>',
      '+<h1>New</h1>',
      '',
    ].join('\n');
    const result = validatePatchDiff(bad, file, HERO_SOURCE);
    expect(result.valid).toBe(false);
    expect(result.errors.join(' ')).toMatch(/mismatch/);
  });
});

describe('EditOrchestrationService', () => {
  let tempRepo: string;

  const registry: ComponentRegistry = {
    'hero-heading': {
      id: 'hero-heading',
      filePath: 'src/components/Hero.jsx',
      componentName: 'Hero',
      editable: true,
      editableScope: 'content',
      allowedOperations: ['text'],
      framework: 'react',
    },
    'locked-note': {
      id: 'locked-note',
      filePath: 'src/components/Hero.jsx',
      componentName: 'Hero',
      editable: false,
      framework: 'react',
    },
    'missing-file': {
      id: 'missing-file',
      filePath: 'src/components/Gone.jsx',
      componentName: 'Gone',
      editable: true,
      framework: 'react',
    },
  };

  const serviceFor = (repoDir: string) =>
    new EditOrchestrationService({
      resolver: new ComponentResolverService(registry),
      repositoryProvider: new LocalRepositoryProvider(repoDir),
    });

  beforeEach(() => {
    tempRepo = makeTempRepo({ 'src/components/Hero.jsx': HERO_SOURCE });
  });

  it('runs select → resolve → generate → validate → isolated preview without touching the repo', async () => {
    const before = fs.readFileSync(path.join(tempRepo, 'src/components/Hero.jsx'), 'utf8');
    const proposal = await serviceFor(tempRepo).generateEditProposal('hero-heading', 'Make it green');

    expect(proposal.componentId).toBe('hero-heading');
    expect(proposal.filePath).toBe('src/components/Hero.jsx');
    expect(proposal.simulated).toBe(true);
    expect(proposal.validation.valid).toBe(true);
    expect(proposal.isolatedPreviewApplied).toBe(true);
    expect(proposal.targetUnchanged).toBe(true);

    const after = fs.readFileSync(path.join(tempRepo, 'src/components/Hero.jsx'), 'utf8');
    expect(after).toBe(before);
    expect(after).toBe(HERO_SOURCE);
  });

  it('rejects unknown component IDs before reading any file', async () => {
    await expect(serviceFor(tempRepo).generateEditProposal('nope', 'x')).rejects.toThrow(ComponentNotFoundError);
  });

  it('rejects read-only component IDs before reading any file', async () => {
    await expect(serviceFor(tempRepo).generateEditProposal('locked-note', 'x')).rejects.toThrow(
      ComponentNotEditableError,
    );
  });

  it('surfaces missing source files as controlled errors', async () => {
    await expect(serviceFor(tempRepo).generateEditProposal('missing-file', 'x')).rejects.toThrow(
      SourceFileNotFoundError,
    );
  });

  it('leaves the repository unchanged even when validation fails', async () => {
    const noAnchor = makeTempRepo({ 'src/components/Hero.jsx': 'export const Hero = () => null;\n' });
    const proposal = await serviceFor(noAnchor).generateEditProposal('hero-heading', 'x');
    expect(proposal.validation.valid).toBe(false);
    expect(proposal.isolatedPreviewApplied).toBe(false);
    expect(proposal.targetUnchanged).toBe(true);
    expect(fs.readFileSync(path.join(noAnchor, 'src/components/Hero.jsx'), 'utf8')).toBe(
      'export const Hero = () => null;\n',
    );
  });
});

describe('patch lifecycle forward chain', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(patchesRepository.findOwnedProject).mockResolvedValue({ id: 'project-1' } as never);
  });

  it('walks DRAFT → GENERATING → GENERATED → VALIDATING → READY_FOR_REVIEW → APPROVED → MERGED', async () => {
    const chain: Array<[string, string]> = [
      ['DRAFT', 'GENERATING'],
      ['GENERATING', 'GENERATED'],
      ['GENERATED', 'VALIDATING'],
      ['VALIDATING', 'READY_FOR_REVIEW'],
      ['READY_FOR_REVIEW', 'APPROVED'],
      ['APPROVED', 'MERGED'],
    ];
    for (const [from, to] of chain) {
      vi.mocked(patchesRepository.findById).mockResolvedValue({ id: 'patch-1', projectId: 'project-1', status: from } as never);
      vi.mocked(patchesRepository.updateStatus).mockResolvedValue({ status: to } as never);
      await expect(patchesService.updateStatus('project-1', 'patch-1', 'user-1', to as never)).resolves.toMatchObject({ status: to });
    }
  });

  it('still rejects skipped states and moves out of terminal states', async () => {
    vi.mocked(patchesRepository.findById).mockResolvedValue({ id: 'patch-1', projectId: 'project-1', status: 'DRAFT' } as never);
    await expect(patchesService.updateStatus('project-1', 'patch-1', 'user-1', 'APPROVED' as never)).rejects.toMatchObject({
      statusCode: 409,
      code: 'CONFLICT',
    });
    vi.mocked(patchesRepository.findById).mockResolvedValue({ id: 'patch-1', projectId: 'project-1', status: 'MERGED' } as never);
    await expect(patchesService.updateStatus('project-1', 'patch-1', 'user-1', 'CANCELLED' as never)).rejects.toMatchObject({
      statusCode: 409,
    });
  });
});

