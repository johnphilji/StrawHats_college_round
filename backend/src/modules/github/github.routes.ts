import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { badRequest } from '../../shared/errors/AppError';
import { githubAppService } from '../../services/github-app.service';
import { commitPatchFilesSchema, createPatchBranchSchema, createPullRequestSchema, githubRepositoryIdSchema } from './github-write.schema';

const router = Router();

// Register callback before auth: GitHub returns here without a Supabase bearer token.
router.get('/callback', (req: Request, res: Response, next: NextFunction) => {
  void (async () => {
    try {
      const installationId = typeof req.query.installation_id === 'string' ? req.query.installation_id : '';
      const state = typeof req.query.state === 'string' ? req.query.state : '';
      const action = typeof req.query.setup_action === 'string' ? req.query.setup_action : '';
      if (action !== 'install' && action !== 'update') throw badRequest('GitHub App setup was not completed.');
      await githubAppService.completeInstallation(state, installationId);
      const frontend = process.env.FRONTEND_URL;
      if (!frontend) throw badRequest('Frontend URL is not configured.');
      res.redirect(303, new URL('/?github_connected=1', frontend).toString());
    } catch (error) {
      next(error);
    }
  })();
});

router.use(authenticate);

const repositoryListQuery = z.object({ page: z.coerce.number().int().min(1).max(1000).default(1), per_page: z.coerce.number().int().min(1).max(100).default(50) });

router.post('/installation/setup', asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { url: await githubAppService.createSetupUrl(req.user!.id) } });
}));

router.get('/repositories', asyncHandler(async (req, res) => {
  const query = repositoryListQuery.safeParse(req.query);
  if (!query.success) throw badRequest('Repository pagination parameters are invalid.');
  res.status(200).json({ success: true, data: await githubAppService.listRepositories(req.user!, query.data.page, query.data.per_page) });
}));

router.get('/repositories/:repositoryId', asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: await githubAppService.getRepository(req.user!, req.params.repositoryId as string) });
}));

const sourceQuery = z.object({ path: z.string().min(1).max(500), ref: z.string().max(255).optional() });
router.get('/repositories/:repositoryId/source', asyncHandler(async (req, res) => {
  const query = sourceQuery.safeParse(req.query);
  if (!query.success) throw badRequest('A source path and optional valid ref are required.');
  const data = await githubAppService.readSource(req.user!, req.params.repositoryId as string, query.data.path, query.data.ref);
  res.status(200).json({ success: true, data });
}));

function parseWriteInput<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) throw badRequest('GitHub write request is invalid or exceeds the allowed limits.');
  return parsed.data;
}

router.post('/repositories/:repositoryId/branches', asyncHandler(async (req, res) => {
  const repositoryId = parseWriteInput(githubRepositoryIdSchema, req.params.repositoryId);
  const input = parseWriteInput(createPatchBranchSchema, req.body);
  const result = await githubAppService.createPatchBranch(req.user!, repositoryId, input);
  res.status(result.created ? 201 : 200).json({ success: true, data: result });
}));

router.post('/repositories/:repositoryId/commits', asyncHandler(async (req, res) => {
  const repositoryId = parseWriteInput(githubRepositoryIdSchema, req.params.repositoryId);
  const input = parseWriteInput(commitPatchFilesSchema, req.body);
  const result = await githubAppService.commitPatchFiles(req.user!, repositoryId, input);
  res.status(result.committed ? 201 : 200).json({ success: true, data: result });
}));

router.post('/repositories/:repositoryId/pulls', asyncHandler(async (req, res) => {
  const repositoryId = parseWriteInput(githubRepositoryIdSchema, req.params.repositoryId);
  const input = parseWriteInput(createPullRequestSchema, req.body);
  const result = await githubAppService.createPullRequest(req.user!, repositoryId, input);
  res.status(result.created ? 201 : 200).json({ success: true, data: result });
}));

export default router;
