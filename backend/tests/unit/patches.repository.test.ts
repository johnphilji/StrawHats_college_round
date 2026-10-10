import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/lib/prisma', () => ({ getPrisma: vi.fn() }));

import { getPrisma } from '../../src/lib/prisma';
import { patchesRepository } from '../../src/modules/patches/patches.repository';
import { AppError } from '../../src/shared/errors/AppError';

const currentPatch = { id: 'patch-1', projectId: 'project-1', status: 'DRAFT' };

describe('patchesRepository', () => {
  beforeEach(() => vi.clearAllMocks());

  it('scopes patch retrieval to both patch and project IDs', async () => {
    const findFirst = vi.fn().mockResolvedValue(currentPatch);
    vi.mocked(getPrisma).mockReturnValue({ patch: { findFirst } } as never);
    await patchesRepository.findById('project-1', 'patch-1');
    expect(findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patch-1', projectId: 'project-1' },
      select: expect.objectContaining({ id: true, projectId: true }),
    }));
  });

  it('uses one transaction for compare-and-set update and audit insertion', async () => {
    const events: string[] = [];
    const tx = {
      patch: {
        updateMany: vi.fn(async ({ where }: { where: Record<string, unknown>; data: Record<string, any> }) => {
          events.push('patch');
          expect(where).toEqual({ id: 'patch-1', projectId: 'project-1', status: 'DRAFT' });
          return { count: 1 };
        }),
        findFirst: vi.fn(async () => ({ ...currentPatch, status: 'GENERATING' })),
      },
      auditLog: { create: vi.fn(async () => { events.push('audit'); return {}; }) },
    };
    const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    vi.mocked(getPrisma).mockReturnValue({ $transaction: transaction } as never);

    const updated = await patchesRepository.updateStatus(currentPatch as never, 'GENERATING', 'user-1');

    expect(transaction).toHaveBeenCalledOnce();
    expect(tx.patch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patch-1', projectId: 'project-1', status: 'DRAFT' },
      data: expect.objectContaining({
        status: 'GENERATING',
        validationDetails: expect.objectContaining({ workflow: expect.objectContaining({ outcome: 'PENDING' }) }),
      }),
    }));
    const generationId = tx.patch.updateMany.mock.calls[0][0].data.validationDetails.workflow.generationId;
    expect(generationId).toMatch(/^[0-9a-f-]{36}$/);
    expect(tx.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      projectId: 'project-1', patchId: 'patch-1', actorId: 'user-1',
      action: 'PATCH_GENERATION_STARTED', metadata: { from: 'DRAFT', to: 'GENERATING', generationId },
    }) });
    expect(events).toEqual(['patch', 'audit']);
    expect(updated.status).toBe('GENERATING');
  });

  it('returns conflict and inserts no audit when compare-and-set loses a race', async () => {
    const tx = {
      patch: { updateMany: vi.fn().mockResolvedValue({ count: 0 }), findFirst: vi.fn() },
      auditLog: { create: vi.fn() },
    };
    const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    vi.mocked(getPrisma).mockReturnValue({ $transaction: transaction } as never);

    await expect(patchesRepository.updateStatus(currentPatch as never, 'CANCELLED', 'user-1'))
      .rejects.toBeInstanceOf(AppError);
    await expect(patchesRepository.updateStatus(currentPatch as never, 'CANCELLED', 'user-1'))
      .rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' });
    expect(tx.patch.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'patch-1', projectId: 'project-1', status: 'DRAFT' },
    }));
    expect(tx.auditLog.create).not.toHaveBeenCalled();
    expect(tx.patch.findFirst).not.toHaveBeenCalled();
  });

  it('leaves the patch unchanged when audit insertion fails in the transaction', async () => {
    let databaseStatus = 'DRAFT';
    let auditRows = 0;
    const tx = {
      patch: {
        updateMany: vi.fn(async () => { databaseStatus = 'GENERATING'; return { count: 1 }; }),
        findFirst: vi.fn(async () => ({ ...currentPatch, status: databaseStatus })),
      },
      auditLog: { create: vi.fn(async () => { throw new Error('audit unavailable'); }) },
    };
    const transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) => {
      const originalStatus = databaseStatus;
      const originalAuditRows = auditRows;
      try {
        return await callback(tx);
      } catch (error) {
        databaseStatus = originalStatus;
        auditRows = originalAuditRows;
        throw error;
      }
    });
    vi.mocked(getPrisma).mockReturnValue({ $transaction: transaction } as never);

    await expect(patchesRepository.updateStatus(currentPatch as never, 'GENERATING', 'user-1'))
      .rejects.toThrow('audit unavailable');
    expect(databaseStatus).toBe('DRAFT');
    expect(auditRows).toBe(0);
    expect(tx.patch.updateMany).toHaveBeenCalledOnce();
    expect(tx.auditLog.create).toHaveBeenCalledOnce();
  });
});
