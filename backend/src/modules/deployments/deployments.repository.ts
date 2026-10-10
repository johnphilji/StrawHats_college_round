import { getPrisma } from '../../lib/prisma';
import type { CreateDeploymentInput, UpdateDeploymentInput } from './deployments.schema';

const deploymentSelect = {
  id: true, projectId: true, releaseId: true, environment: true, status: true,
  vercelDeploymentId: true, deploymentUrl: true, aliasUrl: true, commitSha: true,
  branchName: true, startedAt: true, completedAt: true,
  createdAt: true, updatedAt: true,
} as const;

const nextStatuses: Record<string, string[]> = {
  QUEUED: ['BUILDING', 'READY', 'FAILED', 'CANCELLED'],
  BUILDING: ['READY', 'FAILED', 'CANCELLED'],
};

function matchesCurrent(deployment: any, update: UpdateDeploymentInput): boolean {
  return deployment.status === update.status
    && (update.providerDeploymentId === undefined || deployment.vercelDeploymentId === update.providerDeploymentId)
    && (update.deploymentUrl === undefined || deployment.deploymentUrl === update.deploymentUrl)
    && (update.aliasUrl === undefined || deployment.aliasUrl === update.aliasUrl)
    && (update.commitSha === undefined || deployment.commitSha === update.commitSha)
    && (update.branchName === undefined || deployment.branchName === update.branchName)
    && (update.errorSummary === undefined || deployment.errorMessage === update.errorSummary);
}

export const deploymentsRepository = {
  findOwnedProject(projectId: string, ownerId: string) {
    return getPrisma().project.findFirst({ where: { id: projectId, ownerId }, select: { id: true } });
  },

  findRelease(projectId: string, releaseId: string) {
    return getPrisma().release.findFirst({ where: { id: releaseId, projectId }, select: { id: true, patchId: true, commitSha: true } });
  },

  async create(projectId: string, input: CreateDeploymentInput) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const deployment = await tx.deployment.create({
        data: {
          projectId,
          releaseId: input.releaseId ?? null,
          environment: input.environment,
          status: 'QUEUED',
          commitSha: input.commitSha ?? null,
          branchName: input.branchName ?? null,
          startedAt: new Date(),
        },
        select: deploymentSelect,
      });
      const release = input.releaseId ? await tx.release.findFirst({ where: { id: input.releaseId, projectId }, select: { patchId: true } }) : null;
      await tx.auditLog.create({
        data: {
          projectId, releaseId: input.releaseId ?? null, deploymentId: deployment.id,
          patchId: release?.patchId ?? null,
          action: 'DEPLOYMENT_STARTED', message: 'Deployment attempt recorded',
          metadata: { environment: input.environment, commitSha: input.commitSha ?? null, branchName: input.branchName ?? null },
        },
      });
      return deployment;
    });
  },

  async list(projectId: string, skip: number, take: number) {
    const items = await getPrisma().deployment.findMany({ where: { projectId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take, select: deploymentSelect });
    return items;
  },

  findById(projectId: string, deploymentId: string) {
    return getPrisma().deployment.findFirst({ where: { id: deploymentId, projectId }, select: deploymentSelect });
  },

  async updateStatus(deploymentId: string, update: UpdateDeploymentInput) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.deployment.findUnique({ where: { id: deploymentId }, include: { release: { select: { patchId: true } } } });
      if (!current) return null;
      if (current.status === update.status) return matchesCurrent(current, update) ? current : null;
      if (!nextStatuses[current.status]?.includes(update.status)) return null;

      const terminal = ['READY', 'FAILED', 'CANCELLED'].includes(update.status);
      const data = {
        status: update.status,
        ...(update.providerDeploymentId ? { vercelDeploymentId: update.providerDeploymentId } : {}),
        ...(update.deploymentUrl ? { deploymentUrl: update.deploymentUrl } : {}),
        ...(update.aliasUrl ? { aliasUrl: update.aliasUrl } : {}),
        ...(update.commitSha ? { commitSha: update.commitSha } : {}),
        ...(update.branchName ? { branchName: update.branchName } : {}),
        ...(update.errorSummary ? { errorMessage: update.errorSummary } : {}),
        ...(terminal ? { completedAt: new Date() } : {}),
      };
      const changed = await tx.deployment.updateMany({ where: { id: deploymentId, status: current.status }, data });
      if (changed.count !== 1) return null;
      const action = update.status === 'READY' ? 'DEPLOYMENT_SUCCEEDED' : update.status === 'FAILED' ? 'DEPLOYMENT_FAILED' : update.status === 'CANCELLED' ? 'DEPLOYMENT_CANCELLED' : 'DEPLOYMENT_STARTED';
      await tx.auditLog.create({
        data: {
          projectId: current.projectId, releaseId: current.releaseId, deploymentId,
          patchId: current.release?.patchId ?? null,
          action,
          message: `Deployment status changed to ${update.status}`,
          metadata: { environment: current.environment, deploymentStatus: update.status, deploymentId, commitSha: update.commitSha ?? current.commitSha, ...(update.providerDeploymentId ? { providerDeploymentId: update.providerDeploymentId } : {}) },
        },
      });
      return tx.deployment.findUnique({ where: { id: deploymentId }, select: deploymentSelect });
    });
  },
};
