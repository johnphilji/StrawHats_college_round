import { isPrismaConfigured } from '../../lib/prisma';
import { AppError } from '../../shared/errors/AppError';
import { patchesRepository } from './patches.repository';
import type { CreatePatchData, PatchRecord, PatchStatus } from './patches.types';

const PatchStatus = {
  GENERATING: 'GENERATING', GENERATED: 'GENERATED', VALIDATING: 'VALIDATING',
  VALIDATION_FAILED: 'VALIDATION_FAILED', READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  APPROVED: 'APPROVED', REJECTED: 'REJECTED', MERGED: 'MERGED',
  FAILED: 'FAILED', CANCELLED: 'CANCELLED',
} as const;

// Forward-only lifecycle. Every schema-allowed status is reachable from DRAFT;
// terminal states (MERGED, FAILED, CANCELLED, REJECTED) have no outgoing edges.
const transitions: Partial<Record<PatchStatus, PatchStatus[]>> = {
  DRAFT: [PatchStatus.GENERATING, PatchStatus.CANCELLED],
  GENERATING: [PatchStatus.GENERATED, PatchStatus.FAILED, PatchStatus.CANCELLED],
  GENERATED: [PatchStatus.VALIDATING, PatchStatus.CANCELLED],
  VALIDATING: [PatchStatus.READY_FOR_REVIEW, PatchStatus.VALIDATION_FAILED, PatchStatus.FAILED, PatchStatus.CANCELLED],
  VALIDATION_FAILED: [PatchStatus.VALIDATING, PatchStatus.CANCELLED],
  READY_FOR_REVIEW: [PatchStatus.APPROVED, PatchStatus.REJECTED],
  APPROVED: [PatchStatus.MERGED, PatchStatus.FAILED],
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
