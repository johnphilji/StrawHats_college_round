import { projectsRepository } from './projects.repository';
import type { CreateProjectData } from './projects.types';
import { AppError } from '../../shared/errors/AppError';
import { isPrismaConfigured } from '../../lib/prisma';

export const projectsService = {
  async createProject(data: CreateProjectData) {
    if (!isPrismaConfigured()) {
      throw new AppError('Database not configured', {
        statusCode: 503,
        code: 'CONFIGURATION_ERROR',
      });
    }
    if (!data.ownerId) {
      throw new AppError('Owner identity required', {
        statusCode: 401,
        code: 'UNAUTHORIZED',
      });
    }
    // Ensure at least one repo identifier
    if (!data.repositoryUrl && !data.repositoryIdentifier) {
      // Allow creation without repo for now – projects can be linked later
      // No error thrown; repo connection is deferred per task guidance
    }
    return projectsRepository.create(data);
  },

  async listProjects(ownerId: string) {
    if (!isPrismaConfigured()) {
      throw new AppError('Database not configured', {
        statusCode: 503,
        code: 'CONFIGURATION_ERROR',
      });
    }
    return projectsRepository.findByOwner(ownerId);
  },

  async getProjectById(id: string, requesterId: string) {
    if (!isPrismaConfigured()) {
      throw new AppError('Database not configured', {
        statusCode: 503,
        code: 'CONFIGURATION_ERROR',
      });
    }
    const project = await projectsRepository.findById(id);
    if (!project) {
      throw new AppError('Project not found', { statusCode: 404, code: 'NOT_FOUND' });
    }
    if (project.ownerId !== requesterId) {
      throw new AppError('Forbidden', { statusCode: 403, code: 'FORBIDDEN' });
    }
    return project;
  },
};
