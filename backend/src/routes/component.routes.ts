import { Router } from 'express';
import { componentController } from '../controllers/component.controller';
import { optionalAuthenticate } from '../middleware/authenticate';

const router = Router();

// GET /api/components - List safe metadata of all registered editable components
router.get('/', componentController.list);

// GET /api/components/:componentId - Get safe metadata for a component
router.get('/:componentId', componentController.getById);

// GET /api/components/:componentId/source - Development/internal source context preview
router.get('/:componentId/source', optionalAuthenticate, componentController.getSource);

export default router;
