import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authenticateWorker } from '../../middleware/authenticate-worker';
import { asyncHandler } from '../../shared/utils/async-handler';
import { badRequest } from '../../shared/errors/AppError';
import { releasesService } from './releases.service';
import { createReleaseSchema, releaseListQuerySchema, releaseParamsSchema, releaseStatusSchema } from './releases.schema';

const router = Router();
const projectParams = z.object({ projectId: z.string().min(1).max(100) });

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw badRequest('Release request is invalid.');
  return result.data;
}

router.post('/projects/:projectId/releases', authenticate, asyncHandler(async (req, res) => {
  const params = parse(projectParams, req.params);
  const input = parse(createReleaseSchema, req.body);
  res.status(201).json({ success: true, data: await releasesService.create(params.projectId, req.user!.id, input) });
}));

router.get('/projects/:projectId/releases', authenticate, asyncHandler(async (req, res) => {
  const params = parse(projectParams, req.params);
  const query = parse(releaseListQuerySchema, req.query);
  res.status(200).json({ success: true, data: await releasesService.list(params.projectId, req.user!.id, query.page, query.limit) });
}));

router.get('/projects/:projectId/releases/:releaseId', authenticate, asyncHandler(async (req, res) => {
  const params = parse(releaseParamsSchema, req.params);
  res.status(200).json({ success: true, data: await releasesService.get(params.projectId, params.releaseId, req.user!.id) });
}));

router.patch('/internal/releases/:releaseId/status', authenticateWorker, asyncHandler(async (req, res) => {
  const params = parse(z.object({ releaseId: z.string().min(1).max(100) }), req.params);
  const input = parse(releaseStatusSchema, req.body);
  res.status(200).json({ success: true, data: await releasesService.updateStatus(params.releaseId, input) });
}));

export default router;
