import { getPrisma } from '../../lib/prisma';
import type { CreateProjectData, Project } from './projects.types';

export const projectsRepository = {
  async create(data: CreateProjectData): Promise<Project> {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const project = await tx.project.create({
        data: {
          name: data.name,
          description: data.description ?? null,
          repositoryUrl: data.repositoryUrl ?? null,
          repositoryIdentifier: data.repositoryIdentifier ?? null,
          productionBranch: data.productionBranch ?? 'main',
          productionUrl: data.productionUrl ?? null,
          ownerId: data.ownerId,
        },
      });
      await tx.auditLog.create({ data: { projectId: project.id, actorId: data.ownerId, action: 'PROJECT_CREATED', message: 'Project created' } });
      return project as Project;
    });
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

  async updateOwned(id: string, ownerId: string, data: Partial<Omit<CreateProjectData, 'ownerId'>>) {
    const prisma = getPrisma();
    return prisma.$transaction(async (tx: any) => {
      const result = await tx.project.updateMany({ where: { id, ownerId }, data });
      if (result.count !== 1) return null;
      await tx.auditLog.create({ data: { projectId: id, actorId: ownerId, action: 'PROJECT_UPDATED', message: 'Project metadata updated', metadata: { updatedFields: Object.keys(data) } } });
      return tx.project.findFirst({ where: { id, ownerId } }) as Project | null;
    });
  },

  async findAll(): Promise<Project[]> {
    const prisma = getPrisma();
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return projects as unknown as Project[];
  },
};
