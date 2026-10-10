export type OperationType = 'setText' | 'setStyle' | 'setAttribute' | 'setVisibility' | 'hide';

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
  siteId: string;
  name: string;
  status: 'draft' | 'approved' | 'invalidated' | 'healed_pending';
  version: string;
  operations: PatchOperation[];
  createdAt: string;
}

export interface Release {
  id: string;
  siteId: string;
  version: string;
  status: 'candidate' | 'active' | 'rolled_back' | 'failed';
  patchIds: string[];
  operationsSnapshot: PatchOperation[];
  deployedAt: string;
  rollbackOf?: string;
}

export interface AuditEntry {
  id: string;
  prevHash: string;
  hash: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
}

export interface Site {
  id: string;
  name: string;
  targetUrl: string;
  activeReleaseId?: string;
}

export interface TelemetryEvent {
  patchId: string;
  status: 'applied' | 'healed' | 'broken';
  confidence: number;
  newSelector?: string;
  timestamp: string;
}

export interface VerificationRun {
  id: string;
  releaseId: string;
  status: 'pending' | 'passed' | 'failed';
  steps: any[];
}