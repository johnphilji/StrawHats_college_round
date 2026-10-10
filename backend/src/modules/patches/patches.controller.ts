import type { Request, Response } from 'express';
import { patchesService } from './patches.service';
import type { PatchStatus, PatchRecord, PublicPatch } from './patches.types';
import { patchHistoryQuerySchema } from './patches.schema';
import { badRequest } from '../../shared/errors/AppError';
import { patchGenerationService } from '../../services/patch-generation.service';

function publicPatch(patch: PatchRecord): PublicPatch {
  const { validationDetails: _validationDetails, ...safePatch } = patch;
  const details = patch.validationDetails && typeof patch.validationDetails === 'object' && !Array.isArray(patch.validationDetails)
    ? patch.validationDetails as Record<string, unknown>
    : null;
  const workflow = details?.workflow && typeof details.workflow === 'object' && !Array.isArray(details.workflow)
    ? details.workflow as Record<string, unknown>
    : null;
  return {
    ...safePatch,
    ...(typeof workflow?.generationId === 'string' ? { generationId: workflow.generationId } : {}),
    ...(typeof workflow?.componentId === 'string' ? { componentId: workflow.componentId } : {}),
    ...(typeof workflow?.filePath === 'string' ? { filePath: workflow.filePath } : {}),
    ...(typeof workflow?.diff === 'string' ? { diff: workflow.diff } : {}),
  };
}

export const patchesController = {
  async create(req: Request, res: Response) {
    const patch = await patchesService.create({
      projectId: req.params.projectId as string,
      prompt: req.body.prompt,
      createdBy: req.user!.id,
    });
    res.status(201).json({ success: true, data: publicPatch(patch) });
  },

  async list(req: Request, res: Response) {
    const patches = await patchesService.list(req.params.projectId as string, req.user!.id);
    res.status(200).json({ success: true, data: patches.map(publicPatch) });
  },

  async get(req: Request, res: Response) {
    const patch = await patchesService.get(
      req.params.projectId as string,
      req.params.patchId as string,
      req.user!.id,
    );
    res.status(200).json({ success: true, data: publicPatch(patch) });
  },

  async generate(req: Request, res: Response) {
    const result = await patchGenerationService.generate(
      req.user!,
      req.params.projectId as string,
      req.params.patchId as string,
      req.body.componentId as string,
    );
    res.status(200).json({
      success: true,
      data: {
        ...publicPatch(result.patch),
        componentId: result.componentId,
        componentName: result.componentName,
        filePath: result.filePath,
        diff: result.diff,
        summary: result.summary,
        provider: result.provider,
        simulated: result.simulated,
        validation: result.validation,
        branchName: result.branchName,
        baseCommitSha: result.baseCommitSha,
        headCommitSha: result.headCommitSha,
      },
    });
  },

  async createPullRequest(req: Request, res: Response) {
    const result = await patchesService.createPullRequest(
      req.params.projectId as string,
      req.params.patchId as string,
      req.user!,
    );
    res.status(result.created ? 201 : 200).json({ success: true, data: result });
  },

  async history(req: Request, res: Response) {
    const query = patchHistoryQuerySchema.safeParse(req.query);
    if (!query.success) throw badRequest('History pagination parameters are invalid.');
    const history = await patchesService.history(
      req.params.projectId as string,
      req.params.patchId as string,
      req.user!.id,
      query.data.page,
      query.data.limit,
    );
    res.status(200).json({ success: true, data: history });
  },

  async updateStatus(req: Request, res: Response) {
    const patch = await patchesService.updateStatus(
      req.params.projectId as string,
      req.params.patchId as string,
      req.user!.id,
      req.body.status as PatchStatus,
      req.body.reviewComment,
    );
    res.status(200).json({ success: true, data: publicPatch(patch) });
  },
};
