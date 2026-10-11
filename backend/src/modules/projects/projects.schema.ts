import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim(),
    description: z.string().trim().max(2_000).optional(),
    repositoryUrl: z.string().url().optional(),
    repositoryIdentifier: z.string().min(1).max(200).optional(),
    productionBranch: z.string().min(1).max(100).default('main'),
    productionUrl: z.string().url().max(2_048).optional(),
  }),
  query: z.object({}).passthrough().optional(),
  params: z.object({}).optional(),
});

export const projectIdParamSchema = z.object({
  id: z.string().min(1),
});

export const updateProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100).trim().optional(),
    description: z.string().trim().max(2_000).nullable().optional(),
    repositoryUrl: z.string().url().max(2_048).nullable().optional(),
    repositoryIdentifier: z.string().trim().min(1).max(200).nullable().optional(),
    productionBranch: z.string().trim().min(1).max(255).optional(),
    productionUrl: z.string().url().max(2_048).nullable().optional(),
  }).strict().refine((data) => Object.keys(data).length > 0, 'At least one field must be provided.'),
  params: projectIdParamSchema,
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
