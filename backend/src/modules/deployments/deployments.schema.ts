import { z } from 'zod';

const sha = z.string().regex(/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/);
const branch = z.string().min(1).max(255).regex(/^(?![-.])(?!.*(?:\.\.|\/\.\/|\.lock$|[~^:?*\[\]\\\s]))[A-Za-z0-9._/-]+$/);
const httpsUrl = z.string().url().max(2_048).refine((value) => new URL(value).protocol === 'https:');

export const createDeploymentSchema = z.object({
  environment: z.enum(['PREVIEW', 'PRODUCTION']),
  releaseId: z.string().min(1).max(100).optional(),
  commitSha: sha.optional(),
  branchName: branch.optional(),
}).strict();

export const updateDeploymentSchema = z.object({
  status: z.enum(['BUILDING', 'READY', 'FAILED', 'CANCELLED']),
  providerDeploymentId: z.string().min(1).max(255).optional(),
  deploymentUrl: httpsUrl.optional(),
  aliasUrl: httpsUrl.optional(),
  commitSha: sha.optional(),
  branchName: branch.optional(),
  errorSummary: z.string().trim().min(1).max(1_000).optional(),
}).strict().superRefine((data, context) => {
  if (data.status === 'READY' && !data.deploymentUrl) context.addIssue({ code: 'custom', message: 'A ready deployment requires an HTTPS deployment URL.', path: ['deploymentUrl'] });
  if (data.status === 'FAILED' && !data.errorSummary) context.addIssue({ code: 'custom', message: 'A failed deployment requires a safe error summary.', path: ['errorSummary'] });
});

export const deploymentParamsSchema = z.object({ projectId: z.string().min(1).max(100), deploymentId: z.string().min(1).max(100) });
export const deploymentListQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export type CreateDeploymentInput = z.infer<typeof createDeploymentSchema>;
export type UpdateDeploymentInput = z.infer<typeof updateDeploymentSchema>;
