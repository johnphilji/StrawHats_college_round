import { z } from 'zod';

const generationId = z.string().uuid();
const sha = z.string().regex(/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/);
const branch = z.string().min(1).max(255).regex(/^(?![-.])(?!.*(?:\.\.|\/\.\/|\.lock$|[~^:?*\[\]\\\s]))[A-Za-z0-9._/-]+$/);
const count = z.number().int().min(0).max(1_000_000);
const failureCategory = z.enum(['GENERATION_ERROR', 'VALIDATION_ERROR', 'TIMEOUT', 'CANCELLED', 'UNKNOWN']);

export const generationCallbackSchema = z.discriminatedUnion('success', [
  z.object({
    type: z.literal('generation'),
    generationId,
    success: z.literal(true),
    branchName: branch,
    baseCommitSha: sha.nullable().optional(),
    headCommitSha: sha.nullable().optional(),
    summary: z.string().trim().max(2_000).optional(),
    filesChanged: count,
    additions: count,
    deletions: count,
  }).strict(),
  z.object({
    type: z.literal('generation'),
    generationId,
    success: z.literal(false),
    failureCategory,
    errorSummary: z.string().trim().min(1).max(1_000),
  }).strict(),
]);

const validationResult = z.object({
  name: z.string().trim().min(1).max(100),
  status: z.enum(['PASSED', 'FAILED', 'SKIPPED']),
  summary: z.string().trim().max(500).optional(),
}).strict();

export const validationCallbackSchema = z.object({
  type: z.literal('validation'),
  generationId,
  passed: z.boolean(),
  results: z.array(validationResult).max(100),
  failureCategory: failureCategory.optional(),
  errorSummary: z.string().trim().min(1).max(1_000).optional(),
}).strict().superRefine((data, context) => {
  if (!data.passed && !data.errorSummary && !data.results.some((result) => result.status === 'FAILED')) {
    context.addIssue({ code: 'custom', message: 'A failed validation requires a failure result or error summary.', path: ['errorSummary'] });
  }
});

export const workflowParamsSchema = z.object({ projectId: z.string().min(1).max(100), patchId: z.string().min(1).max(100) });

export type GenerationCallback = z.infer<typeof generationCallbackSchema>;
export type ValidationCallback = z.infer<typeof validationCallbackSchema>;
