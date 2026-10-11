import type { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';

export const projectsController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Zod validation already handled in route, but we re-validate body from req
      const { name, description, repositoryUrl, repositoryIdentifier, productionBranch, productionUrl } = req.body as {
        name: string;
        description?: string;
        repositoryUrl?: string;
        repositoryIdentifier?: string;
        productionBranch?: string;
        productionUrl?: string;
      };
      const ownerId = req.user!.id;

      const project = await projectsService.createProject({
        name,
        description,
        repositoryUrl,
        repositoryIdentifier,
        productionBranch,
        productionUrl,
        ownerId,
      });

      res.status(201).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const ownerId = req.user!.id;
      const projects = await projectsService.listProjects(ownerId);
      res.status(200).json({
        success: true,
        data: projects,
      });
    } catch (err) {
      next(err);
    }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const requesterId = req.user!.id;
      const project = await projectsService.getProjectById(id, requesterId);
      res.status(200).json({
        success: true,
        data: project,
      });
    } catch (err) {
      next(err);
    }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await projectsService.updateProject(req.params.id as string, req.user!.id, req.body);
      res.status(200).json({ success: true, data: project });
    } catch (err) {
      next(err);
    }
  },
};
