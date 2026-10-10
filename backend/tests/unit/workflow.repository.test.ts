import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ getPrisma: vi.fn() }));

import { getPrisma } from '../../src/lib/prisma';
import { workflowRepository } from '../../src/modules/workflow/workflow.repository';

const attemptId = 'b87e8488-986c-4c06-bd12-bcc2fc49d928';
const callback = {
  type: 'generation' as const,
  generationId: attemptId,
  success: true as const,
  branchName: 'patch/header',
  baseCommitSha: 'a'.repeat(40),
  headCommitSha: 'b'.repeat(40),
  filesChanged: 1,
  additions: 2,
  deletions: 0,
};

describe('workflowRepository generation attempt binding', () => {
  beforeEach(() => vi.clearAllMocks());

  it('accepts a callback only for the active server-created attempt', async () => {
    const current = { id: 'patch-1', projectId: 'project-1', status: 'GENERATING', validationDetails: { workflow: { generationId: attemptId, outcome: 'PENDING' } } };
    const tx = {
      patch: {
        findFirst: vi.fn().mockResolvedValueOnce(current).mockResolvedValueOnce({ ...current, status: 'GENERATED' }),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    vi.mocked(getPrisma).mockReturnValue({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never);

    const result = await workflowRepository.recordGeneration('project-1', 'patch-1', callback);
    expect(result).toMatchObject({ status: 'GENERATED' });
    expect(tx.patch.updateMany).toHaveBeenCalledOnce();
  });

  it('rejects a stale callback before writing patch or audit records', async () => {
    const tx = {
      patch: {
        findFirst: vi.fn().mockResolvedValue({ id: 'patch-1', projectId: 'project-1', status: 'GENERATING', validationDetails: { workflow: { generationId: 'another-attempt', outcome: 'PENDING' } } }),
        updateMany: vi.fn(),
      },
      auditLog: { create: vi.fn() },
    };
    vi.mocked(getPrisma).mockReturnValue({ $transaction: (fn: (client: typeof tx) => unknown) => fn(tx) } as never);

    await expect(workflowRepository.recordGeneration('project-1', 'patch-1', callback)).resolves.toBeNull();
    expect(tx.patch.updateMany).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
});
