// PATCHWORK Type Definitions

export interface ConnectedWebsite {
  id: string;
  name: string;
  tagline: string;
  repoUrl: string;
  repoOwner: string;
  repoName: string;
  subpath?: string;
  branch: string;
  previewUrl: string;
  productionUrl: string;
  status: 'connected' | 'syncing' | 'error';
  mode: 'managed' | 'preview_only';
  runtimeLoaderInstalled: boolean;
  lastModified: string;
  componentCount: number;
  category: 'Ecommerce' | 'SaaS' | 'Docs';
  code: string;
  framework: string;
  activeRelease: string;
  activePatchesCount: number;
}

export interface ConfidenceBreakdown {
  text: number;
  tagAndAttributes: number;
  domStructure: number;
  parentAndSibling: number;
  nearbyContent: number;
}

export interface ElementFingerprint {
  tag: string;
  selector: string;
  text: string;
  attributes: Record<string, string>;
  parentTag: string;
  parentSelector: string;
  domPath: string;
  confidenceScore: number;
  confidenceBreakdown: ConfidenceBreakdown;
  isSelfHealed?: boolean;
  selfHealProposal?: {
    originalSelector: string;
    newSelector: string;
    reason: string;
    confidence: number;
  };
}

export interface SelectedComponent {
  componentId: string;
  label: string;
  tagName: string;
  text: string;
  sourceFile: string;
  lineRange: string;
  fingerprint: ElementFingerprint;
  styles: {
    color: string;
    backgroundColor: string;
    fontSize: string;
    fontWeight: string;
    padding: string;
    margin: string;
    borderRadius: string;
    display: string;
  };
  rect?: { x: number; y: number; width: number; height: number };
}

export type EditStatus =
  | 'idle'
  | 'generating'
  | 'review_diff'
  | 'applied_branch'
  | 'deploying'
  | 'deployed'
  | 'rolled_back';

export interface CodeChange {
  editId: string;
  componentId: string;
  componentLabel: string;
  instruction: string;
  branch: string;
  commitSha: string;
  status: EditStatus;
  diff: string;
  modifiedFiles: string[];
  explanation: string;
  previewApplied: {
    text?: string;
    backgroundColor?: string;
    borderRadius?: string;
  };
}

export interface PatchConflict {
  id: string;
  targetFingerprint: string;
  elementLabel: string;
  property: string;
  originalBaseline: string;
  patchA: {
    patchId: string;
    author: string;
    value: string;
    timestamp: string;
  };
  patchB: {
    patchId: string;
    author: string;
    value: string;
    timestamp: string;
  };
  status: 'unresolved' | 'resolved';
  resolvedValue?: string;
}

export interface AutomatedCheckItem {
  id: string;
  name: string;
  status: 'pass' | 'fail';
  message: string;
  durationMs: number;
}

export interface PlaywrightTestRun {
  id: string;
  patchTitle: string;
  status: 'passed' | 'failed';
  durationMs: number;
  timestamp: string;
  checks: AutomatedCheckItem[];
  mismatchPercentage: number;
}

export interface Release {
  id: string;
  version: string;
  projectId: string;
  status: 'active' | 'rolled_back' | 'failed' | 'deprecated';
  deployedAt: string;
  deployedBy: string;
  duration: string;
  patchesCount: number;
  rollbackOf?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: {
    name: string;
    initials: string;
  };
  action: string;
  category: 'patch' | 'conflict' | 'test' | 'deploy' | 'rollback';
  target: string;
  details: string;
}

export interface HistoryItem {
  id: string;
  componentLabel: string;
  instruction: string;
  branch: string;
  commitSha: string;
  timestamp: string;
  status: 'deployed' | 'rolled_back';
  author: string;
}
