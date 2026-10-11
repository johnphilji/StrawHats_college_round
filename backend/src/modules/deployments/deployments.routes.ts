import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { authenticateWorker } from '../../middleware/authenticate-worker';
import { asyncHandler } from '../../shared/utils/async-handler';
import { badRequest } from '../../shared/errors/AppError';
import { deploymentsService } from './deployments.service';
import { createDeploymentSchema, deploymentListQuerySchema, deploymentParamsSchema, updateDeploymentSchema } from './deployments.schema';

const router = Router();
const projectParams = z.object({ projectId: z.string().min(1).max(100) });

function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) throw badRequest('Deployment request is invalid.');
  return result.data;
}

router.post('/projects/:projectId/deployments', authenticate, asyncHandler(async (req, res) => {
  const params = parse(projectParams, req.params);
  const input = parse(createDeploymentSchema, req.body);
  const deployment = await deploymentsService.create(params.projectId, req.user!.id, input);
  res.status(201).json({ success: true, data: deployment });
}));

router.get('/projects/:projectId/deployments', authenticate, asyncHandler(async (req, res) => {
  const params = parse(projectParams, req.params);
  const query = parse(deploymentListQuerySchema, req.query);
  res.status(200).json({ success: true, data: await deploymentsService.list(params.projectId, req.user!.id, query.page, query.limit) });
}));

router.get('/projects/:projectId/deployments/:deploymentId', authenticate, asyncHandler(async (req, res) => {
  const params = parse(deploymentParamsSchema, req.params);
  res.status(200).json({ success: true, data: await deploymentsService.get(params.projectId, params.deploymentId, req.user!.id) });
}));

router.patch('/internal/deployments/:deploymentId/status', authenticateWorker, asyncHandler(async (req, res) => {
  const params = parse(z.object({ deploymentId: z.string().min(1).max(100) }), req.params);
  const input = parse(updateDeploymentSchema, req.body);
  res.status(200).json({ success: true, data: await deploymentsService.updateStatus(params.deploymentId, input) });
}));

export default router;
