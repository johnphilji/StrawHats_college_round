import { isPrismaConfigured } from '../../lib/prisma';
import { AppError } from '../../shared/errors/AppError';
import { patchesRepository } from './patches.repository';
import type { CreatePatchData, PatchRecord, PatchStatus } from './patches.types';
import { githubAppService } from '../../services/github-app.service';
import type { AuthenticatedUser } from '../../shared/types/api';

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

  async createPullRequest(projectId: string, patchId: string, user: AuthenticatedUser) {
    const ownerId = user.id;
    ensureDatabase();
    const project = await patchesRepository.findOwnedProject(projectId, ownerId);
    if (!project) throw new AppError('Project not found', { statusCode: 404, code: 'NOT_FOUND' });
    if (!project.repositoryIdentifier || !/^\d{1,20}$/.test(project.repositoryIdentifier)) {
      throw new AppError('Project is not connected to a GitHub repository.', { statusCode: 409, code: 'CONFLICT' });
    }
    const patch = await patchesRepository.findById(projectId, patchId);
    if (!patch) throw new AppError('Patch not found', { statusCode: 404, code: 'NOT_FOUND' });
    if (patch.status !== 'APPROVED') throw new AppError('Only approved patches can open a pull request.', { statusCode: 409, code: 'CONFLICT' });
    if (!patch.branchName || !patch.headCommitSha) throw new AppError('Approved patch has no committed branch.', { statusCode: 409, code: 'CONFLICT' });

    const details = patch.validationDetails && typeof patch.validationDetails === 'object' && !Array.isArray(patch.validationDetails)
      ? patch.validationDetails as Record<string, unknown>
      : null;
    const workflow = details?.workflow && typeof details.workflow === 'object' && !Array.isArray(details.workflow)
      ? details.workflow as Record<string, unknown>
      : null;
    const generationId = typeof workflow?.generationId === 'string' ? workflow.generationId : null;
    if (!generationId) throw new AppError('Approved patch has no generation ID for an idempotent pull request.', { statusCode: 409, code: 'CONFLICT' });

    const pullRequest = await githubAppService.createPullRequest(
      user,
      project.repositoryIdentifier,
      {
        branchName: patch.branchName,
        baseBranch: project.productionBranch,
        idempotencyKey: generationId,
        title: (patch.summary || patch.prompt).trim().slice(0, 200) || `PATCHWORK patch ${patch.id}`,
        body: `PATCHWORK patch ${patch.id}\n\nGeneration: ${generationId}\nCommit: ${patch.headCommitSha}`,
      },
    );
    const recorded = await patchesRepository.recordPullRequest(projectId, patchId, ownerId, generationId, {
      number: pullRequest.number,
      url: pullRequest.url,
    });
    if (!recorded) throw new AppError('Pull request was created but patch metadata changed concurrently. Retry to reconcile it.', { statusCode: 409, code: 'CONFLICT' });
    return { patch: recorded, ...pullRequest };
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
