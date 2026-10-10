export interface Project {
  id: string;
  name: string;
  repositoryUrl: string | null;
  repositoryIdentifier: string | null;
  productionBranch: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectData {
  name: string;
  repositoryUrl?: string | null;
  repositoryIdentifier?: string | null;
  productionBranch?: string;
  ownerId: string;
}
