import { Router } from 'express';
import healthRoutes from './health.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import llmRoutes from './llm.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/projects', projectsRoutes);
router.use('/llm', llmRoutes);

// Future mounts:
// router.use('/edits', editsRoutes);
// router.use('/patches', patchesRoutes);
// ...

export default router;
