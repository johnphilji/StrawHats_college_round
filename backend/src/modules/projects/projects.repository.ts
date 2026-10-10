import { getPrisma } from '../../lib/prisma';
import type { CreateProjectData, Project } from './projects.types';

export const projectsRepository = {
  async create(data: CreateProjectData): Promise<Project> {
    const prisma = getPrisma();
    const project = await prisma.project.create({
      data: {
        name: data.name,
        repositoryUrl: data.repositoryUrl ?? null,
        repositoryIdentifier: data.repositoryIdentifier ?? null,
        productionBranch: data.productionBranch ?? 'main',
        ownerId: data.ownerId,
      },
    });
    return project as unknown as Project;
  },

  async findByOwner(ownerId: string): Promise<Project[]> {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });
    return projects as unknown as Project[];
  },

  async findById(id: string): Promise<Project | null> {
    const prisma = getPrisma();
    const project = await prisma.project.findUnique({ where: { id } });
    return (project as unknown as Project) ?? null;
  },

  async findAll(): Promise<Project[]> {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return projects as unknown as Project[];
  },
};
