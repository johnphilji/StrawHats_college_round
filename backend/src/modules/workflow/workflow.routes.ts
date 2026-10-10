import { Router } from 'express';
import { z } from 'zod';
import { authenticateWorker } from '../../middleware/authenticate-worker';
import { asyncHandler } from '../../shared/utils/async-handler';
import { badRequest } from '../../shared/errors/AppError';
import { workflowService } from './workflow.service';
import { generationCallbackSchema, validationCallbackSchema, workflowParamsSchema } from './workflow.schema';

const router = Router();

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw badRequest('Trusted workflow callback payload is invalid.');
  return result.data;
}

function safePatchResult(patch: Record<string, unknown>) {
  const { validationDetails: _validationDetails, ...safePatch } = patch;
  return safePatch;
}

router.post('/projects/:projectId/patches/:patchId/generation-result', authenticateWorker, asyncHandler(async (req, res) => {
  const params = parse(workflowParamsSchema, req.params);
  const result = parse(generationCallbackSchema, req.body);
  const patch = await workflowService.recordGeneration(params.projectId, params.patchId, result);
  res.status(200).json({ success: true, data: safePatchResult(patch as Record<string, unknown>) });
}));

router.post('/projects/:projectId/patches/:patchId/validation-result', authenticateWorker, asyncHandler(async (req, res) => {
  const params = parse(workflowParamsSchema, req.params);
  const result = parse(validationCallbackSchema, req.body);
  const patch = await workflowService.recordValidation(params.projectId, params.patchId, result);
  res.status(200).json({ success: true, data: safePatchResult(patch as Record<string, unknown>) });
}));

export default router;
