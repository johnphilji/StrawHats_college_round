export interface Project {
  id: string;
  name: string;
  description?: string | null;
  repositoryUrl: string | null;
  repositoryIdentifier: string | null;
  productionBranch: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  description?: string | null;
  repositoryUrl?: string | null;
  repositoryIdentifier?: string | null;
  productionBranch?: string;
  ownerId: string;
}
