import { Router } from 'express';
import healthRoutes from './health.routes';
import projectsRoutes from '../modules/projects/projects.routes';
import patchesRoutes from '../modules/patches/patches.routes';

import componentRoutes from './component.routes';
import githubRoutes from '../modules/github/github.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use(patchesRoutes);
router.use('/projects', projectsRoutes);
router.use('/components', componentRoutes);
router.use('/github', githubRoutes);

// Future mounts:
// router.use('/edits', editsRoutes);
// router.use('/patches', patchesRoutes);
// ...

export default router;
