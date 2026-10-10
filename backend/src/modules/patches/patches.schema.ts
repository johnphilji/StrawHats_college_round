import { z } from 'zod';

export const projectPatchParamsSchema = z.object({
  projectId: z.string().min(1),
});

export const patchParamsSchema = projectPatchParamsSchema.extend({
  patchId: z.string().min(1),
});

export const createPatchSchema = z.object({
  body: z.object({ prompt: z.string().trim().min(1).max(10_000) }),
  params: projectPatchParamsSchema,
  query: z.object({}).passthrough().optional(),
});

export const updatePatchStatusSchema = z.object({
  body: z.object({
    status: z.enum(['GENERATING', 'VALIDATING', 'APPROVED', 'REJECTED', 'CANCELLED']),
    reviewComment: z.string().trim().max(2_000).optional(),
  }),
  params: patchParamsSchema,
  query: z.object({}).passthrough().optional(),
});

export const patchHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
