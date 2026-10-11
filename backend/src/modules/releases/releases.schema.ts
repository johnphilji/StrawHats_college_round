import { z } from 'zod';

const sha = z.string().regex(/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/);

export const createReleaseSchema = z.object({
  patchId: z.string().min(1).max(100),
  version: z.string().trim().min(1).max(100).optional(),
  notes: z.string().trim().max(2_000).optional(),
}).strict();

export const releaseStatusSchema = z.object({
  status: z.enum(['MERGED', 'FAILED', 'REVERTED']),
  commitSha: sha.optional(),
  errorSummary: z.string().trim().min(1).max(1_000).optional(),
}).strict().superRefine((data, context) => {
  if (data.status === 'MERGED' && !data.commitSha) context.addIssue({ code: 'custom', message: 'A merged release requires its commit SHA.', path: ['commitSha'] });
  if (data.status === 'FAILED' && !data.errorSummary) context.addIssue({ code: 'custom', message: 'A failed release requires a safe error summary.', path: ['errorSummary'] });
});

export const releaseParamsSchema = z.object({ projectId: z.string().min(1).max(100), releaseId: z.string().min(1).max(100) });
export const releaseListQuerySchema = z.object({ page: z.coerce.number().int().min(1).max(100_000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
export type CreateReleaseInput = z.infer<typeof createReleaseSchema>;
export type UpdateReleaseInput = z.infer<typeof releaseStatusSchema>;
