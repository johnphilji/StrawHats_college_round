import { getPrisma } from '../../lib/prisma';
import type { GenerationCallback, ValidationCallback } from './workflow.schema';

const patchSelect = {
  id: true, projectId: true, prompt: true, summary: true, status: true,
  branchName: true, baseCommitSha: true, headCommitSha: true,
  pullRequestNumber: true, pullRequestUrl: true, filesChanged: true,
  additions: true, deletions: true, validationPassed: true,
  validationDetails: true, createdBy: true, reviewedBy: true,
  reviewedAt: true, reviewComment: true, createdAt: true, updatedAt: true,
} as const;

function workflowDetails(details: unknown): Record<string, unknown> | null {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return null;
  const workflow = (details as Record<string, unknown>).workflow;
  return workflow && typeof workflow === 'object' && !Array.isArray(workflow) ? workflow as Record<string, unknown> : null;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sameGeneration(patch: any, result: GenerationCallback): boolean {
  const workflow = workflowDetails(patch.validationDetails);
  if (!workflow || workflow.generationId !== result.generationId || workflow.outcome !== (result.success ? 'SUCCEEDED' : 'FAILED')) return false;
  if (!result.success) return workflow.failureCategory === result.failureCategory && workflow.errorSummary === result.errorSummary;
  return patch.branchName === result.branchName
    && patch.baseCommitSha === (result.baseCommitSha ?? null)
    && patch.headCommitSha === (result.headCommitSha ?? null)
    && patch.filesChanged === result.filesChanged
    && patch.additions === result.additions
    && patch.deletions === result.deletions
    && (patch.summary ?? '') === (result.summary ?? '')
    && (result.componentId === undefined || workflow.componentId === result.componentId)
    && (result.filePath === undefined || workflow.filePath === result.filePath)
    && (result.diff === undefined || workflow.diff === result.diff);
}

export interface GenerationProposal {
  branchName: string;
  baseCommitSha: string;
  componentId: string;
  filePath: string;
  diff: string;
  summary: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}

export const workflowRepository = {
  findPatch(projectId: string, patchId: string) {
    return getPrisma().patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
  },

  findOwnedPatch(projectId: string, patchId: string, ownerId: string) {
    return getPrisma().patch.findFirst({
      where: { id: patchId, projectId, project: { ownerId } },
      select: patchSelect,
    });
  },

  async saveGenerationProposal(projectId: string, patchId: string, generationId: string, proposal: GenerationProposal) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
      if (!current || current.status !== 'GENERATING') return null;
      const details = current.validationDetails && typeof current.validationDetails === 'object' && !Array.isArray(current.validationDetails)
        ? current.validationDetails as Record<string, unknown>
        : {};
      const activeWorkflow = workflowDetails(details);
      if (activeWorkflow?.generationId !== generationId || activeWorkflow.outcome !== 'PENDING') return null;

      const result = await tx.patch.updateMany({
        where: { id: patchId, projectId, status: 'GENERATING', updatedAt: current.updatedAt },
        data: {
          branchName: proposal.branchName,
          baseCommitSha: proposal.baseCommitSha,
          summary: proposal.summary,
          filesChanged: proposal.filesChanged,
          additions: proposal.additions,
          deletions: proposal.deletions,
          validationDetails: {
            ...details,
            workflow: { ...activeWorkflow, generationId, outcome: 'PENDING', ...proposal },
          },
        },
      });
      if (result.count !== 1) return null;
      return tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
    });
  },

  async recordGeneration(projectId: string, patchId: string, result: GenerationCallback) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
      if (!current) return null;
      const activeWorkflow = workflowDetails(current.validationDetails);
      if (activeWorkflow?.generationId !== result.generationId || activeWorkflow.outcome !== 'PENDING') {
        return current.status !== 'GENERATING' && sameGeneration(current, result) ? current : null;
      }
      if (current.status !== 'GENERATING') {
        return sameGeneration(current, result) ? current : null;
      }

      const outcome = result.success ? 'SUCCEEDED' : 'FAILED';
      const validationDetails = {
        workflow: {
          ...(activeWorkflow ?? {}),
          generationId: result.generationId,
          outcome,
          ...(result.success ? {
            ...(result.componentId ? { componentId: result.componentId } : {}),
            ...(result.filePath ? { filePath: result.filePath } : {}),
            ...(result.diff ? { diff: result.diff } : {}),
          } : {}),
          ...(result.success ? {} : { failureCategory: result.failureCategory, errorSummary: result.errorSummary }),
          completedAt: new Date().toISOString(),
        },
        validation: null,
      };
      const update = await tx.patch.updateMany({
        where: { id: patchId, projectId, status: 'GENERATING' },
        data: {
          status: result.success ? 'GENERATED' : 'FAILED',
          ...(result.success ? {
            branchName: result.branchName,
            baseCommitSha: result.baseCommitSha ?? null,
            headCommitSha: result.headCommitSha ?? null,
            summary: result.summary ?? null,
            filesChanged: result.filesChanged,
            additions: result.additions,
            deletions: result.deletions,
            validationPassed: null,
          } : { validationPassed: null }),
          validationDetails,
        },
      });
      if (update.count !== 1) return null;
      await tx.auditLog.create({
        data: {
          projectId, patchId, action: result.success ? 'PATCH_GENERATED' : 'PATCH_GENERATION_FAILED',
          message: result.success ? 'Generation completed' : 'Generation failed',
          metadata: result.success
            ? { generationId: result.generationId, branchName: result.branchName, baseCommitSha: result.baseCommitSha ?? null, headCommitSha: result.headCommitSha ?? null, filesChanged: result.filesChanged, additions: result.additions, deletions: result.deletions }
            : { generationId: result.generationId, failureCategory: result.failureCategory, errorSummary: result.errorSummary },
        },
      });
      return tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
    });
  },

  async recordValidation(projectId: string, patchId: string, result: ValidationCallback) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const current = await tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
      if (!current) return null;
      const currentDetails = current.validationDetails as { workflow?: { generationId?: string }; validation?: { generationId?: string; passed?: boolean; results?: unknown; failureCategory?: string; errorSummary?: string } } | null;
      if (currentDetails?.workflow?.generationId !== result.generationId) return null;
      if (current.status === (result.passed ? 'READY_FOR_REVIEW' : 'VALIDATION_FAILED')) {
        const previous = currentDetails.validation;
        return previous?.generationId === result.generationId
          && previous.passed === result.passed
          && previous.failureCategory === result.failureCategory
          && previous.errorSummary === result.errorSummary
          && stableJson(previous.results) === stableJson(result.results) ? current : null;
      }
      if (current.status !== 'VALIDATING') return null;

      const validation = {
        generationId: result.generationId,
        passed: result.passed,
        results: result.results,
        ...(result.failureCategory ? { failureCategory: result.failureCategory } : {}),
        ...(result.errorSummary ? { errorSummary: result.errorSummary } : {}),
        completedAt: new Date().toISOString(),
      };
      const details = { ...currentDetails, validation };
      const status = result.passed ? 'READY_FOR_REVIEW' : 'VALIDATION_FAILED';
      const update = await tx.patch.updateMany({
        where: { id: patchId, projectId, status: 'VALIDATING' },
        data: { status, validationPassed: result.passed, validationDetails: details },
      });
      if (update.count !== 1) return null;
      await tx.auditLog.create({
        data: {
          projectId, patchId,
          action: result.passed ? 'PATCH_VALIDATED' : 'PATCH_VALIDATION_FAILED',
          message: result.passed ? 'Validation passed' : 'Validation failed',
          metadata: { generationId: result.generationId, passed: result.passed, results: result.results, ...(result.failureCategory ? { failureCategory: result.failureCategory } : {}), ...(result.errorSummary ? { errorSummary: result.errorSummary } : {}) },
        },
      });
      return tx.patch.findFirst({ where: { id: patchId, projectId }, select: patchSelect });
    });
  },
};
