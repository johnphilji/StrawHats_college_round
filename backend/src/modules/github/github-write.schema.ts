import { z } from 'zod';

const branchName = z.string().trim().min(11).max(255)
  .regex(/^patchwork\/[A-Za-z0-9][A-Za-z0-9._/-]*$/, 'Branch names must use the patchwork/ prefix.')
  .refine((value) => !value.includes('..') && !value.includes('//') && !value.includes('@{') && !/[\x00-\x20~^:?*[\\\]]/.test(value) && !value.endsWith('/') && !value.endsWith('.') && !value.toLowerCase().endsWith('.lock'), 'Invalid Git branch name.');

const idempotencyKey = z.string().uuid();
const sha = z.string().regex(/^(?:[a-fA-F0-9]{40}|[a-fA-F0-9]{64})$/);

export const createPatchBranchSchema = z.object({
  branchName,
  baseRef: z.string().trim().min(1).max(255).refine((value) => !/[\x00-\x20\\]/.test(value) && !value.includes('..') && !value.startsWith('/') && !value.endsWith('/'), 'Invalid base branch or commit.'),
}).strict();

export const commitPatchFilesSchema = z.object({
  branchName,
  expectedHeadSha: sha,
  idempotencyKey,
  message: z.string().trim().min(1).max(200).refine((value) => !/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(value), 'Commit message contains invalid control characters.'),
  files: z.array(z.object({
    path: z.string().min(1).max(500),
    content: z.string().max(128 * 1024),
  }).strict()).min(1).max(25),
}).strict().superRefine((input, context) => {
  const seen = new Set<string>();
  let totalBytes = 0;
  input.files.forEach((file, index) => {
    if (seen.has(file.path)) context.addIssue({ code: 'custom', path: ['files', index, 'path'], message: 'File paths must be unique.' });
    seen.add(file.path);
    totalBytes += Buffer.byteLength(file.content, 'utf8');
  });
  if (totalBytes > 450 * 1024) context.addIssue({ code: 'custom', path: ['files'], message: 'Combined file content exceeds the request size limit.' });
});

export const createPullRequestSchema = z.object({
  branchName,
  baseBranch: z.string().trim().min(1).max(255).refine((value) => !/[\x00-\x20\\]/.test(value) && !value.includes('..') && !value.startsWith('/') && !value.endsWith('/'), 'Invalid base branch.'),
  idempotencyKey,
  title: z.string().trim().min(1).max(200),
  body: z.string().max(10_000).optional(),
}).strict();

export const githubRepositoryIdSchema = z.string().regex(/^\d{1,20}$/);
