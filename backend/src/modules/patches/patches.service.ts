import { isPrismaConfigured } from '../../lib/prisma';
import { AppError } from '../../shared/errors/AppError';
import { patchesRepository } from './patches.repository';
import type { CreatePatchData, PatchRecord, PatchStatus } from './patches.types';

const PatchStatus = {
  GENERATING: 'GENERATING', CANCELLED: 'CANCELLED', VALIDATING: 'VALIDATING',
  APPROVED: 'APPROVED', REJECTED: 'REJECTED',
} as const;

const transitions: Partial<Record<PatchStatus, PatchStatus[]>> = {
  DRAFT: [PatchStatus.GENERATING, PatchStatus.CANCELLED],
  GENERATED: [PatchStatus.VALIDATING],
  READY_FOR_REVIEW: [PatchStatus.APPROVED, PatchStatus.REJECTED],
};

function ensureDatabase() {
  if (!isPrismaConfigured()) {
    throw new AppError('Database not configured', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
  }
}

async function ownedProject(projectId: string, ownerId: string) {
  const project = await patchesRepository.findOwnedProject(projectId, ownerId);
  if (!project) throw new AppError('Project not found', { statusCode: 404, code: 'NOT_FOUND' });
}

export const patchesService = {
  async create(data: CreatePatchData) {
    ensureDatabase();
    await ownedProject(data.projectId, data.createdBy);
    return patchesRepository.create(data);
  },

  async list(projectId: string, ownerId: string) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    return patchesRepository.list(projectId);
  },

  async get(projectId: string, patchId: string, ownerId: string) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const patch = await patchesRepository.findById(projectId, patchId);
    if (!patch) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    return patch;
  },

  async history(projectId: string, patchId: string, ownerId: string, page: number, limit: number) {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const patch = await patchesRepository.findById(projectId, patchId);
    if (!patch) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    const items = await patchesRepository.listHistory(projectId, patchId, (page - 1) * limit, limit + 1);
    const hasMore = items.length > limit;
    return {
      items: items.slice(0, limit).map((item: any) => ({ ...item, metadata: safeHistoryMetadata(item.metadata) })),
      page,
      limit,
      hasMore,
    };
  },

  async updateStatus(
    projectId: string,
    patchId: string,
    ownerId: string,
    status: PatchStatus,
    reviewComment?: string,
  ): Promise<PatchRecord> {
    ensureDatabase();
    await ownedProject(projectId, ownerId);
    const patch = await patchesRepository.findById(projectId, patchId);
    if (!patch) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    if (!transitions[patch.status]?.includes(status)) {
      throw new AppError(`Invalid patch status transition: ${patch.status} to ${status}`, {
        statusCode: 409,
        code: 'CONFLICT',
      });
    }
    return patchesRepository.updateStatus(patch, status, ownerId, reviewComment);
  },
};

const publicMetadataKeys = new Set([
  'from', 'to', 'generationId', 'outcome', 'failureCategory', 'passed', 'results',
  'branchName', 'baseCommitSha', 'headCommitSha', 'filesChanged', 'additions', 'deletions',
  'environment', 'deploymentId', 'deploymentStatus', 'commitSha', 'deploymentUrl',
]);

function safeHistoryMetadata(metadata: unknown): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata as Record<string, unknown>)) {
    if (!publicMetadataKeys.has(key)) continue;
    if (key === 'results' && Array.isArray(value)) {
      output.results = value.slice(0, 100).flatMap((result) => {
        if (!result || typeof result !== 'object' || Array.isArray(result)) return [];
        const item = result as Record<string, unknown>;
        if (typeof item.name !== 'string' || !['PASSED', 'FAILED', 'SKIPPED'].includes(String(item.status))) return [];
        return [{ name: item.name.slice(0, 100), status: item.status }];
      });
    } else if (typeof value === 'string') output[key] = value.slice(0, 255);
    else if (typeof value === 'number' || typeof value === 'boolean' || value === null) output[key] = value;
  }
  return output;
}
