import { Router } from 'express';
import healthRoutes from './health.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import patchesRoutes from '../modules/patches/patches.routes';
import editsRoutes from '../modules/edits/edits.routes';
import llmRoutes from './llm.routes';
import componentRoutes from './component.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use(patchesRoutes);
router.use('/projects', projectsRoutes);
router.use('/llm', llmRoutes);
router.use('/components', componentRoutes);
router.use('/edits', editsRoutes);

// Future mounts:
// router.use('/releases', releasesRoutes);
// router.use('/deployments', deploymentsRoutes);
// ...

export default router;
