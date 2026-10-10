export type PatchStatus =
  | 'DRAFT' | 'GENERATING' | 'GENERATED' | 'VALIDATING' | 'VALIDATION_FAILED'
  | 'READY_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'MERGED' | 'FAILED' | 'CANCELLED';

export interface PatchRecord {
  id: string;
  projectId: string;
  prompt: string;
  summary: string | null;
  status: PatchStatus;
  branchName: string | null;
  baseCommitSha: string | null;
  headCommitSha: string | null;
  pullRequestNumber: number | null;
  pullRequestUrl: string | null;
  filesChanged: number;
  additions: number;
  deletions: number;
  validationPassed: boolean | null;
  validationDetails: unknown;
  createdBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewComment: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// validationDetails is retained on the internal record for trusted workflow code,
// but its unstructured content is not safe to expose from public API responses.
export type PublicPatch = Omit<PatchRecord, 'validationDetails'> & { generationId?: string };

export interface CreatePatchData {
  projectId: string;
  prompt: string;
  createdBy: string;
}

export type PatchTransition =
  | { from: 'DRAFT'; to: 'GENERATING' | 'CANCELLED' }
  | { from: 'GENERATED'; to: 'VALIDATING' }
  | { from: 'READY_FOR_REVIEW'; to: 'APPROVED' | 'REJECTED'; reviewComment?: string };
