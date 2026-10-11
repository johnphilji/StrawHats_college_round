import { afterEach, describe, expect, it, vi } from 'vitest';
import { PatchGenerationService } from '../../src/services/patch-generation.service';
import type { PatchProvider } from '../../src/integrations/llm/provider';
import type { PatchGenerationOptions } from '../../src/services/patch-generation.service';
import type { AuthenticatedUser } from '../../src/shared/types/api';

const generationId = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
const baseSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const filePath = 'src/components/Hero.jsx';
const source = [
  'export function Hero() {',
  '  return (',
  '    <section>',
  '      <h1 data-patchwork-id="hero-heading">Persia Darbar</h1>',
  '    </section>',
  '  );',
  '}',
  '',
].join('\n');
const validDiff = [
  `--- a/${filePath}`,
  `+++ b/${filePath}`,
  '@@ -4,1 +4,1 @@',
  '-      <h1 data-patchwork-id="hero-heading">Persia Darbar</h1>',
  '+      <h1 data-patchwork-id="hero-heading">Patchwork</h1>',
  '',
].join('\n');
const user = { id: 'user-1' } as AuthenticatedUser;

function makeService(diff = validDiff) {
  const draft = {
    id: 'patch-1', projectId: 'project-1', prompt: 'Change the hero title', status: 'DRAFT',
    validationDetails: null,
  };
  const generating = {
    ...draft,
    status: 'GENERATING',
    validationDetails: { workflow: { generationId, outcome: 'PENDING' } },
  };
  const validating = { ...generating, status: 'VALIDATING' };
  const readyForReview = { ...generating, status: 'READY_FOR_REVIEW' };
  const projects = { getProjectById: vi.fn().mockResolvedValue({
    id: 'project-1', ownerId: user.id, repositoryIdentifier: '12345', productionBranch: 'main',
  }) };
  const patches = {
    get: vi.fn().mockResolvedValue(draft),
    updateStatus: vi.fn().mockResolvedValueOnce(generating).mockResolvedValueOnce(validating),
  };
  const workflow = {
    recordProposal: vi.fn().mockResolvedValue(generating),
    recordGeneration: vi.fn().mockResolvedValue({ ...generating, status: 'GENERATED' }),
    recordValidation: vi.fn().mockResolvedValue(readyForReview),
  };
  const github = {
    createPatchBranch: vi.fn().mockResolvedValue({ branchName: `patchwork/hero-heading-${generationId.slice(0, 8)}`, baseCommitSha: baseSha, headCommitSha: baseSha, created: true }),
    readSource: vi.fn().mockResolvedValue({ path: filePath, ref: baseSha, source, size: Buffer.byteLength(source) }),
    commitPatchFiles: vi.fn().mockResolvedValue({ branchName: `patchwork/hero-heading-${generationId.slice(0, 8)}`, commitSha: headSha, committed: true }),
  };
  const provider: PatchProvider = {
    name: 'groq',
    generate: vi.fn().mockResolvedValue({
      provider: 'groq', simulated: false, diff, changedFiles: [filePath],
      summary: 'Change the hero title.', warnings: [],
    }),
  };
  const service = new PatchGenerationService({
    projects, patches, workflow, github, provider,
  } as unknown as PatchGenerationOptions);
  return { service, projects, patches, workflow, github, provider };
}

afterEach(() => {
  delete process.env.GROQ_API_KEY;
});

describe('PatchGenerationService', () => {
  it('validates source, commits only the registry file, and records real Git metadata', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const { service, patches, workflow, github, provider } = makeService();

    const result = await service.generate(user, 'project-1', 'patch-1', 'hero-heading');

    expect(patches.updateStatus).toHaveBeenCalledWith('project-1', 'patch-1', 'user-1', 'GENERATING');
    expect(provider.generate).toHaveBeenCalledWith(expect.objectContaining({
      componentId: 'hero-heading',
      instruction: 'Change the hero title',
      context: expect.objectContaining({ filePath, sourceCode: source }),
    }));
    expect(github.commitPatchFiles).toHaveBeenCalledWith(user, '12345', expect.objectContaining({
      branchName: `patchwork/hero-heading-${generationId.slice(0, 8)}`,
      expectedHeadSha: baseSha,
      idempotencyKey: generationId,
      files: [{ path: filePath, content: source.replace('Persia Darbar</h1>', 'Patchwork</h1>') }],
    }));
    expect(workflow.recordProposal).toHaveBeenCalledOnce();
    expect(workflow.recordGeneration).toHaveBeenCalledWith('project-1', 'patch-1', expect.objectContaining({
      generationId, success: true, headCommitSha: headSha, diff: validDiff,
    }));
    expect(workflow.recordValidation).toHaveBeenCalledWith('project-1', 'patch-1', expect.objectContaining({
      generationId, passed: true, results: expect.arrayContaining([expect.objectContaining({ name: 'application-build', status: 'SKIPPED' })]),
    }));
    expect(result).toMatchObject({ patch: { status: 'READY_FOR_REVIEW' }, provider: 'groq', simulated: false, headCommitSha: headSha, validation: { valid: true } });
  });

  it('records invalid model output as failed and never commits it', async () => {
    process.env.GROQ_API_KEY = 'test-key';
    const unsafeDiff = validDiff.replaceAll(filePath, '../other.jsx');
    const { service, workflow, github } = makeService(unsafeDiff);

    await expect(service.generate(user, 'project-1', 'patch-1', 'hero-heading'))
      .rejects.toMatchObject({ statusCode: 422, code: 'VALIDATION_ERROR' });

    expect(github.commitPatchFiles).not.toHaveBeenCalled();
    expect(workflow.recordGeneration).toHaveBeenCalledWith('project-1', 'patch-1', expect.objectContaining({
      generationId, success: false, failureCategory: 'VALIDATION_ERROR',
    }));
  });
});