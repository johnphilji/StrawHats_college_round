export interface Component {
  id: string;
  label: string;
  cssSelector: string;
  html: string;
  css: string;
  editable: string[];
}

export interface EditRequest {
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
  tagName: string;
  text: string;
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
  rect: { x: number; y: number; width: number; height: number };
}
