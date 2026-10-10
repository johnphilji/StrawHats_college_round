import { getPrisma } from '../../lib/prisma';
import { AppError } from '../../shared/errors/AppError';
import type { CreatePatchData, PatchRecord } from './patches.types';

const patchSelect = {
  id: true, projectId: true, prompt: true, summary: true, status: true,
  branchName: true, baseCommitSha: true, headCommitSha: true,
  pullRequestNumber: true, pullRequestUrl: true, filesChanged: true,
  additions: true, deletions: true, validationPassed: true,
  validationDetails: true, createdBy: true, reviewedBy: true,
  reviewedAt: true, reviewComment: true, createdAt: true, updatedAt: true,
} as const;

export const patchesRepository = {
  async findOwnedProject(projectId: string, ownerId: string) {
    return getPrisma().project.findFirst({
      where: { id: projectId, ownerId },
      select: { id: true },
    });
  },

  async create(data: CreatePatchData): Promise<PatchRecord> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const patch = await tx.patch.create({
        data: { ...data },
        select: patchSelect,
      });
      await tx.auditLog.create({
        data: {
          projectId: data.projectId,
          patchId: patch.id,
          actorId: data.createdBy,
          action: 'PATCH_CREATED',
          message: 'Patch created',
        },
      });
      return patch as PatchRecord;
    });
  },

  async list(projectId: string): Promise<PatchRecord[]> {
    return getPrisma().patch.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: patchSelect,
    }) as Promise<PatchRecord[]>;
  },

  async findById(projectId: string, patchId: string): Promise<PatchRecord | null> {
    return getPrisma().patch.findFirst({
      where: { id: patchId, projectId },
      select: patchSelect,
    }) as Promise<PatchRecord | null>;
  },

  async updateStatus(
    patch: PatchRecord,
    status: string,
    actorId: string,
    reviewComment?: string,
  ): Promise<PatchRecord> {
    const prisma = getPrisma();
    const auditByStatus: Record<string, string> = {
      GENERATING: 'PATCH_GENERATION_STARTED',
      GENERATED: 'PATCH_GENERATED',
      VALIDATING: 'PATCH_VALIDATION_STARTED',
      VALIDATION_FAILED: 'PATCH_VALIDATION_FAILED',
      READY_FOR_REVIEW: 'PATCH_VALIDATED',
      APPROVED: 'PATCH_APPROVED',
      REJECTED: 'PATCH_REJECTED',
      MERGED: 'PATCH_MERGED',
      // No dedicated PATCH_FAILED audit action exists; the transition message
      // and metadata still record the exact from → FAILED change.
      FAILED: 'PATCH_CANCELLED',
      CANCELLED: 'PATCH_CANCELLED',
    };
    return prisma.$transaction(async (tx: any) => {
      const result = await tx.patch.updateMany({
        where: { id: patch.id, projectId: patch.projectId, status: patch.status },
        data: {
          status,
          ...(status === 'APPROVED' || status === 'REJECTED'
            ? { reviewedBy: actorId, reviewedAt: new Date(), reviewComment: reviewComment ?? null }
            : {}),
        },
      });
      if (result.count !== 1) {
        throw new AppError('Patch status changed concurrently', { statusCode: 409, code: 'CONFLICT' });
      }
      await tx.auditLog.create({
        data: {
          projectId: patch.projectId,
          patchId: patch.id,
          actorId,
          action: auditByStatus[status],
          message: `Patch status changed from ${patch.status} to ${status}`,
          metadata: { from: patch.status, to: status },
        },
      });
      const updated = await tx.patch.findFirst({
        where: { id: patch.id, projectId: patch.projectId },
        select: patchSelect,
      });
      if (!updated) {
        throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
      }
      return updated as PatchRecord;
    });
  },
};
