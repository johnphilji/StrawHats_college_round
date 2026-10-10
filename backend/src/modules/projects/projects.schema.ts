import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim(),
    repositoryUrl: z.string().url().optional(),
    repositoryIdentifier: z.string().min(1).max(200).optional(),
    productionBranch: z.string().min(1).max(100).default('main'),
  }),
  query: z.object({}).passthrough().optional(),
  params: z.object({}).optional(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
