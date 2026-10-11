import { z } from 'zod';

export const generateEditSchema = z.object({
  body: z.object({
    componentId: z.string().trim().min(1).max(200),
    instruction: z.string().trim().min(1).max(2000),
  }),
  params: z.object({}).optional(),
  query: z.object({}).passthrough().optional(),
});

export type GenerateEditInput = z.infer<typeof generateEditSchema>['body'];
