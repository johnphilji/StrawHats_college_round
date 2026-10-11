import { isPrismaConfigured } from '../../lib/prisma';
import { AppError, conflict } from '../../shared/errors/AppError';
import { workflowRepository, type GenerationProposal } from './workflow.repository';
import type { GenerationCallback, ValidationCallback } from './workflow.schema';

function ensureDatabase() {
  if (!isPrismaConfigured()) throw new AppError('Database not configured', { statusCode: 503, code: 'CONFIGURATION_ERROR' });
}

export const workflowService = {
  async recordProposal(projectId: string, patchId: string, generationId: string, proposal: GenerationProposal) {
    ensureDatabase();
    if (!await workflowRepository.findPatch(projectId, patchId)) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    const patch = await workflowRepository.saveGenerationProposal(projectId, patchId, generationId, proposal);
    if (!patch) throw conflict('Generation proposal is stale or the patch is no longer awaiting generation.');
    return patch;
  },

  async recordGeneration(projectId: string, patchId: string, result: GenerationCallback) {
    ensureDatabase();
    if (!await workflowRepository.findPatch(projectId, patchId)) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    const patch = await workflowRepository.recordGeneration(projectId, patchId, result);
    if (!patch) throw conflict('Generation result is stale or the patch is not awaiting a generation result.');
    return patch;
  },

  async recordValidation(projectId: string, patchId: string, result: ValidationCallback) {
    ensureDatabase();
    if (!await workflowRepository.findPatch(projectId, patchId)) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    const patch = await workflowRepository.recordValidation(projectId, patchId, result);
    if (!patch) throw conflict('Validation result is stale or the patch is not awaiting validation.');
    return patch;
  },
};
