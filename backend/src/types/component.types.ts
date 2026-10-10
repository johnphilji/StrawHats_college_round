export type EditableScope = 'content' | 'styles' | 'component';

export type ComponentFramework = 'react' | 'next';

export interface ComponentRegistryEntry {
  id: string;
  filePath: string;
  componentName: string;
  editable: boolean;
  editableScope?: EditableScope;
  allowedOperations?: string[];
  description?: string;
  framework?: ComponentFramework;
  /** Page/route on which the element appears (single-page site: always "/"). */
  route?: string;
  /** Data object/array that owns the rendered value, when content is data-driven. */
  dataSource?: string;
  /** Editing constraints (e.g. preserve anchor targets, form wiring). */
  notes?: string;
}

export type ComponentRegistry = Record<string, ComponentRegistryEntry>;

/**
 * Safe component metadata exposed to clients (excludes repository paths and source code).
 */
export interface ComponentMetadata {
  id: string;
  componentName: string;
  editable: boolean;
  editableScope?: EditableScope;
  allowedOperations?: string[];
  description?: string;
  framework?: ComponentFramework;
}

/**
 * Resolved context provided to the LLM code-generation service.
 */
export interface ResolvedComponentContext {
  componentId: string;
  filePath: string;
  componentName: string;
  sourceCode: string;
  editableScope?: EditableScope;
  allowedOperations?: string[];
  description?: string;
  framework?: ComponentFramework;
  route?: string;
  dataSource?: string;
  notes?: string;
}

/**
 * Target repository configuration.
 */
export interface RepositoryConfig {
  repositoryRoot: string;
  repositoryUrl?: string;
  projectIdentifier?: string;
  branch?: string;
  commitSha?: string;
}

/**
 * Abstract repository provider interface.
 * Decouples source file retrieval from the local filesystem.
 */
export interface RepositoryProvider {
  readFile(relativeFilePath: string): Promise<string>;
  fileExists(relativeFilePath: string): Promise<boolean>;
  getRepositoryRoot(): string;
}
