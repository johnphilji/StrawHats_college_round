import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ isPrismaConfigured: vi.fn(() => true) }));
vi.mock('../../src/modules/workflow/workflow.repository', () => ({
  workflowRepository: { findPatch: vi.fn(), recordGeneration: vi.fn(), recordValidation: vi.fn() },
}));

import { workflowRepository } from '../../src/modules/workflow/workflow.repository';
import { workflowService } from '../../src/modules/workflow/workflow.service';

const generation = {
  type: 'generation' as const,
  generationId: 'b87e8488-986c-4c06-bd12-bcc2fc49d928',
  success: true as const,
  branchName: 'patch/header',
  baseCommitSha: 'a'.repeat(40),
  headCommitSha: 'b'.repeat(40),
  filesChanged: 1,
  additions: 2,
  deletions: 0,
};

describe('workflowService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(workflowRepository.findPatch).mockResolvedValue({ id: 'patch-1', projectId: 'project-1' } as never);
  });

  it('records generated changes only for the patch identified by both path identifiers', async () => {
    vi.mocked(workflowRepository.recordGeneration).mockResolvedValue({ id: 'patch-1', status: 'GENERATED' } as never);
    await expect(workflowService.recordGeneration('project-1', 'patch-1', generation)).resolves.toMatchObject({ status: 'GENERATED' });
    expect(workflowRepository.findPatch).toHaveBeenCalledWith('project-1', 'patch-1');
    expect(workflowRepository.recordGeneration).toHaveBeenCalledWith('project-1', 'patch-1', generation);
  });

  it('hides cross-project patch IDs and rejects stale callbacks', async () => {
    vi.mocked(workflowRepository.findPatch).mockResolvedValue(null);
    await expect(workflowService.recordGeneration('other-project', 'patch-1', generation)).rejects.toMatchObject({ statusCode: 404 });
    expect(workflowRepository.recordGeneration).not.toHaveBeenCalled();

    vi.mocked(workflowRepository.findPatch).mockResolvedValue({ id: 'patch-1', projectId: 'project-1' } as never);
    vi.mocked(workflowRepository.recordGeneration).mockResolvedValue(null);
    await expect(workflowService.recordGeneration('project-1', 'patch-1', generation)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('requires a matching patch and forwards structured validation results', async () => {
    const validation = { type: 'validation' as const, generationId: generation.generationId, passed: true, results: [{ name: 'typecheck', status: 'PASSED' as const }] };
    vi.mocked(workflowRepository.recordValidation).mockResolvedValue({ id: 'patch-1', status: 'READY_FOR_REVIEW' } as never);
    await expect(workflowService.recordValidation('project-1', 'patch-1', validation)).resolves.toMatchObject({ status: 'READY_FOR_REVIEW' });
    expect(workflowRepository.recordValidation).toHaveBeenCalledWith('project-1', 'patch-1', validation);
  });
});
