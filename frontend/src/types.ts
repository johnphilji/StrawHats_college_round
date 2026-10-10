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
  lastModified: string;
  componentCount: number;
  category: 'Ecommerce' | 'SaaS' | 'Docs' | 'Portfolio';
  icon: string;
  framework: string;
}

export interface Component {
  id: string;
  label: string;
  cssSelector: string;
  html: string;
  css: string;
  editable: string[];
  sourceFile?: string;
  lineRange?: string;
}

export interface EditRequest {
  websiteId: string;
  componentId: string;
  instruction: string;
}

export interface EditResponse {
  editId: string;
  branch: string;
  status: EditStatus;
  diff: string;
  commitSha: string;
  previewUrl?: string;
  validationPassed?: boolean;
  modifiedFiles?: string[];
  explanation?: string;
}

export type EditStatus =
  | 'draft'
  | 'generating'
  | 'testing'
  | 'approved'
  | 'merged'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'conflict'
  | 'rolled_back';

export interface HistoryEntry {
  editId: string;
  websiteId?: string;
  componentId: string;
  label: string;
  instruction: string;
  branch: string;
  status: EditStatus;
  commitSha: string;
  timestamp: string;
  author: string;
}

export interface SelectedComponent {
  componentId: string;
  label: string;
  tagName: string;
  text: string;
  sourceFile: string;
  lineRange: string;
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
