import { Router } from 'express';
import healthRoutes from './health.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import patchesRoutes from '../modules/patches/patches.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use(patchesRoutes);
router.use('/projects', projectsRoutes);

// Future mounts:
// router.use('/edits', editsRoutes);
// router.use('/patches', patchesRoutes);
// ...

export default router;
