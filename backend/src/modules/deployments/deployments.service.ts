import { isPrismaConfigured } from '../../lib/prisma';
import { AppError, conflict } from '../../shared/errors/AppError';
import { deploymentsRepository } from './deployments.repository';
import type { CreateDeploymentInput, UpdateDeploymentInput } from './deployments.schema';

function ensureDatabase() {
  if (!isPrismaConfigured()) throw new AppError('Database not configured', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
}

async function ownedProject(projectId: string, ownerId: string) {
  if (!await deploymentsRepository.findOwnedProject(projectId, ownerId)) throw new AppError('Project not found', { statusCode: 404, code: 'NOT_FOUND' });
}

export const deploymentsService = {
  async create(projectId: string, ownerId: string, input: CreateDeploymentInput) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    if (input.releaseId && !await deploymentsRepository.findRelease(projectId, input.releaseId)) throw new AppError('Release not found', { statusCode: 404, code: 'NOT_FOUND' });
    return deploymentsRepository.create(projectId, input);
  },

  async list(projectId: string, ownerId: string, page: number, limit: number) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const rows = await deploymentsRepository.list(projectId, (page - 1) * limit, limit + 1);
    return { items: rows.slice(0, limit), page, limit, hasMore: rows.length > limit };
  },

  async get(projectId: string, deploymentId: string, ownerId: string) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const deployment = await deploymentsRepository.findById(projectId, deploymentId);
    if (!deployment) throw new AppError('Deployment not found', { statusCode: 404, code: 'NOT_FOUND' });
    return deployment;
  },

  async updateStatus(deploymentId: string, input: UpdateDeploymentInput) {
    ensureDatabase();
    const deployment = await deploymentsRepository.updateStatus(deploymentId, input);
    if (!deployment) throw conflict('Deployment status update is stale or invalid.');
    return deployment;
  },
};
