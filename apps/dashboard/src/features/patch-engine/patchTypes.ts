export type OperationType = 'setText' | 'setStyle' | 'setAttribute' | 'setVisibility';

export interface PatchOperation {
  id: string;
  targetFingerprint: string;
  selector: string;
  operationType: OperationType;
  property?: string;
  originalValue: string;
  newValue: string;
}

export interface Patch {
  id: string;
  projectId: string;
  name: string;
  status: 'Draft' | 'Pending Review' | 'Ready to Deploy' | 'Active' | 'Failed' | 'Rolled Back' | 'Conflict Detected';
  version: string;
  operations: PatchOperation[];
  createdAt: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  status: 'Active' | 'Rolled Back' | 'Failed';
  patchIds: string[];
  operationsSnapshot: PatchOperation[]; // The exact state deployed
  deployedAt: string;
  rollbackOf?: string; // If this release is a rollback, what release did it replace?
}