import { Router, type Request, type Response, type NextFunction } from 'express';
import { z } from 'zod';
import { optionalAuthenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../shared/utils/async-handler';
import { editsController } from './edits.controller';
import { generateEditSchema } from './edits.schema';

const router = Router();

function validate(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const parsed = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!parsed.success) return next(parsed.error);
    const data = parsed.data as { body?: unknown };
    if ('body' in data) req.body = data.body;
    next();
  };
}

// POST /api/edits/generate – local edit proposal (resolve → mock generate → validate)
router.post(
  '/generate',
  optionalAuthenticate,
  validate(generateEditSchema),
  asyncHandler(editsController.generate),
);

export default router;
