import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { projectsController } from './projects.controller';
import { asyncHandler } from '../../shared/utils/async-handler';
import { z } from 'zod';
import { createProjectSchema, projectIdParamSchema, updateProjectSchema } from './projects.schema';

const router = Router();

// All project routes require authentication
router.use(authenticate);

// Validate helper
function validate(schema: z.ZodSchema) {
  return (req: import('express').Request, _res: import('express').Response, next: import('express').NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (!result.success) {
      return next(result.error);
    }
    // Overwrite with parsed (applies defaults)
    if (result.data && typeof result.data === 'object' && 'body' in result.data) {
      req.body = (result.data as { body: unknown }).body;
    }
    next();
  };
}

// POST /api/projects – create
router.post(
  '/',
  validate(createProjectSchema),
  asyncHandler(projectsController.create)
);

// GET /api/projects – list own projects
router.get('/', asyncHandler(projectsController.list));

// GET /api/projects/:id – get single (owner-checked)
router.get(
  '/:id',
  (req, _res, next) => {
    const parsed = projectIdParamSchema.safeParse(req.params);
    if (!parsed.success) return next(parsed.error);
    next();
  },
  asyncHandler(projectsController.getById)
);

router.patch('/:id', validate(updateProjectSchema), asyncHandler(projectsController.update));

export default router;
