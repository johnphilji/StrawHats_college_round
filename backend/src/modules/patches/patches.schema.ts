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
    // Full forward chain (DRAFT is initial-only and never set via this endpoint).
    status: z.enum([
      'GENERATING', 'GENERATED', 'VALIDATING', 'VALIDATION_FAILED',
      'READY_FOR_REVIEW', 'APPROVED', 'REJECTED', 'MERGED', 'FAILED', 'CANCELLED',
    ]),
    reviewComment: z.string().trim().max(2_000).optional(),
  }),
  params: patchParamsSchema,
  query: z.object({}).passthrough().optional(),
});
