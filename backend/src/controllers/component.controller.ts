import type { Request, Response, NextFunction } from 'express';
import { componentResolverService } from '../services/component-resolver.service';
import { sourceService } from '../services/source.service';
import { forbidden } from '../shared/errors/AppError';

export const componentController = {
  /**
   * GET /api/components
   * Returns safe metadata for all registered editable components.
   */
  async list(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const components = componentResolverService.listComponents();
      res.status(200).json({
        success: true,
        data: components,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/components/:componentId
   * Returns safe metadata for a specific registered editable component.
   * Never exposes absolute filesystem paths or raw source code.
   */
  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { componentId } = req.params as { componentId: string };
      const metadata = componentResolverService.getComponentMetadata(componentId);

      res.status(200).json({
        success: true,
        data: metadata,
      });
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/components/:componentId/source
   * Internal / development preview endpoint for retrieving resolved source code context.
   * Access is restricted in production to authorized users only.
   */
  async getSource(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { componentId } = req.params as { componentId: string };

      // In production, require authenticated user
      if (process.env.NODE_ENV === 'production' && !req.user) {
        throw forbidden('Source preview requires authentication in production');
      }

      const context = await sourceService.resolveComponentSource(componentId);

      res.status(200).json({
        success: true,
        data: context,
      });
    } catch (err) {
      next(err);
    }
  },
};
