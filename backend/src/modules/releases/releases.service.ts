import { isPrismaConfigured } from '../../lib/prisma';
import { AppError, conflict } from '../../shared/errors/AppError';
import { releasesRepository } from './releases.repository';
import type { CreateReleaseInput, UpdateReleaseInput } from './releases.schema';

function ensureDatabase() {
  if (!isPrismaConfigured()) throw new AppError('Database not configured', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
}

async function ownedProject(projectId: string, ownerId: string) {
  if (!await releasesRepository.findOwnedProject(projectId, ownerId)) throw new AppError('Project not found', { statusCode: 404, code: 'NOT_FOUND' });
}

export const releasesService = {
  async create(projectId: string, ownerId: string, input: CreateReleaseInput) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const release = await releasesRepository.create(projectId, ownerId, input);
    if (!release) throw conflict('A release can be recorded only for an approved patch with generated branch and commit metadata.');
    return release;
  },

  async list(projectId: string, ownerId: string, page: number, limit: number) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const rows = await releasesRepository.list(projectId, (page - 1) * limit, limit + 1);
    return { items: rows.slice(0, limit), page, limit, hasMore: rows.length > limit };
  },

  async get(projectId: string, releaseId: string, ownerId: string) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const release = await releasesRepository.findById(projectId, releaseId);
    if (!release) throw new AppError('Release not found', { statusCode: 404, code: 'NOT_FOUND' });
    return release;
  },

  async updateStatus(releaseId: string, input: UpdateReleaseInput) {
    ensureDatabase();
    const release = await releasesRepository.updateStatus(releaseId, input);
    if (!release) throw conflict('Release status update is stale or invalid.');
    return release;
  },
};
