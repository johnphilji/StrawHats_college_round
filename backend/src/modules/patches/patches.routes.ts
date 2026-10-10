import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { patchesController } from './patches.controller';
import { createPatchSchema, patchParamsSchema, projectPatchParamsSchema, updatePatchStatusSchema } from './patches.schema';

const router = Router();

function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!parsed.success) return next(parsed.error);
    const data = parsed.data as { body?: unknown };
    if ('body' in data) req.body = data.body;
    next();
  };
}

router.post('/projects/:projectId/patches', authenticate, validate(createPatchSchema), asyncHandler(patchesController.create));
router.get('/projects/:projectId/patches', authenticate, validate(z.object({ params: projectPatchParamsSchema })), asyncHandler(patchesController.list));
router.get('/projects/:projectId/patches/:patchId', authenticate, validate(z.object({ params: patchParamsSchema })), asyncHandler(patchesController.get));
router.get('/projects/:projectId/patches/:patchId/history', authenticate, validate(z.object({ params: patchParamsSchema })), asyncHandler(patchesController.history));
router.patch('/projects/:projectId/patches/:patchId/status', authenticate, validate(updatePatchStatusSchema), asyncHandler(patchesController.updateStatus));

export default router;
