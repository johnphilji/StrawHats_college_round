import { Router } from 'express';
import healthRoutes from './health.routes';
import projectsRoutes from '../modules/projects/projects.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/projects', projectsRoutes);

// Future mounts:
// router.use('/edits', editsRoutes);
// router.use('/patches', patchesRoutes);
// ...

export default router;
