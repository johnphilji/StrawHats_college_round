import { getPrisma } from '../../lib/prisma';
import type { CreateReleaseInput, UpdateReleaseInput } from './releases.schema';

const releaseSelect = {
  id: true, projectId: true, patchId: true, status: true, sourceBranch: true,
  targetBranch: true, commitSha: true, mergedBy: true, mergedAt: true,
  version: true, notes: true, previousReleaseId: true, createdAt: true, updatedAt: true,
} as const;

export const releasesRepository = {
  findOwnedProject(projectId: string, ownerId: string) {
    return getPrisma().project.findFirst({ where: { id: projectId, ownerId }, select: { id: true, productionBranch: true } });
  },

  async create(projectId: string, ownerId: string, input: CreateReleaseInput) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const [project, patch, previous] = await Promise.all([
        tx.project.findFirst({ where: { id: projectId, ownerId }, select: { id: true, productionBranch: true } }),
        tx.patch.findFirst({ where: { id: input.patchId, projectId }, select: { id: true, status: true, branchName: true, headCommitSha: true } }),
        tx.release.findFirst({ where: { projectId, status: 'MERGED' }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true } }),
      ]);
      if (!project || !patch || patch.status !== 'APPROVED' || !patch.branchName || !patch.headCommitSha) return null;
      const release = await tx.release.create({
        data: {
          projectId,
          patchId: patch.id,
          status: 'PENDING',
          sourceBranch: patch.branchName,
          targetBranch: project.productionBranch,
          commitSha: patch.headCommitSha,
          version: input.version ?? null,
          notes: input.notes ?? null,
          previousReleaseId: previous?.id ?? null,
        },
        select: releaseSelect,
      });
      await tx.auditLog.create({
        data: { projectId, patchId: patch.id, releaseId: release.id, action: 'RELEASE_CREATED', message: 'Release record created', metadata: { status: 'PENDING', sourceBranch: release.sourceBranch, targetBranch: release.targetBranch, commitSha: release.commitSha } },
      });
      return release;
    });
  },

  async list(projectId: string, skip: number, take: number) {
    return getPrisma().release.findMany({ where: { projectId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: releaseSelect });
  },

  findById(projectId: string, releaseId: string) {
    return getPrisma().release.findFirst({ where: { id: releaseId, projectId }, select: releaseSelect });
  },

  async updateStatus(releaseId: string, input: UpdateReleaseInput) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.release.findUnique({ where: { id: releaseId }, select: releaseSelect });
      if (!current) return null;
      if (current.status === input.status) {
        if (input.status === 'MERGED' && current.commitSha === input.commitSha) return current;
        const action = input.status === 'FAILED' ? 'RELEASE_FAILED' : input.status === 'REVERTED' ? 'RELEASE_REVERTED' : 'RELEASE_MERGED';
        const priorEvent = await tx.auditLog.findFirst({ where: { releaseId, action }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { action: true, metadata: true } });
        const metadata = priorEvent?.metadata as Record<string, unknown> | null;
        if (priorEvent?.action === action && metadata?.errorSummary === input.errorSummary && metadata?.commitSha === input.commitSha) return current;
        return null;
      }
      const allowed = (current.status === 'PENDING' && ['MERGED', 'FAILED'].includes(input.status)) || (current.status === 'MERGED' && input.status === 'REVERTED');
      if (!allowed) return null;
      const data = {
        status: input.status,
        ...(input.status === 'MERGED' ? { commitSha: input.commitSha, mergedAt: new Date() } : {}),
      };
      const changed = await tx.release.updateMany({ where: { id: releaseId, status: current.status }, data });
      if (changed.count !== 1) return null;
      const action = input.status === 'MERGED' ? 'RELEASE_MERGED' : input.status === 'FAILED' ? 'RELEASE_FAILED' : 'RELEASE_REVERTED';
      await tx.auditLog.create({
        data: {
          projectId: current.projectId, patchId: current.patchId, releaseId,
          action,
          message: input.status === 'FAILED' ? 'Release failed' : `Release ${input.status.toLowerCase()}`,
          metadata: { status: input.status, ...(input.commitSha ? { commitSha: input.commitSha } : {}), ...(input.errorSummary ? { errorSummary: input.errorSummary } : {}) },
        },
      });
      return tx.release.findUnique({ where: { id: releaseId }, select: releaseSelect });
    });
  },
};
