import type { Request, Response } from 'express';
import { patchesService } from './patches.service';
import type { PatchStatus, PatchRecord, PublicPatch } from './patches.types';
import { patchHistoryQuerySchema } from './patches.schema';
import { badRequest } from '../../shared/errors/AppError';

function publicPatch(patch: PatchRecord): PublicPatch {
  const { validationDetails: _validationDetails, ...safePatch } = patch;
  return safePatch;
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
