import { API_BASE_URL } from './config';
import { supabase } from './lib/supabase';

// The GitHub workspace view (App.tsx) historically uses VITE_API_URL, which
// already includes the `/api` prefix, while this client was built around
// VITE_API_BASE_URL without it. Accept both spellings so the two call sites
// cannot drift: prefer VITE_API_URL, strip one trailing `/api`, and append
// `/api/...` paths below.
function resolveApiBase(): string {
  const withPrefix = import.meta.env.VITE_API_URL as string | undefined;
  if (withPrefix && withPrefix.trim()) return withPrefix.trim().replace(/\/+$/, '').replace(/\/api$/, '');
  return API_BASE_URL;
}

const API_BASE = resolveApiBase();
// Minimal typed client for the PATCHWORK backend (Phase 4).
// Only endpoint used by the live editing flow; other views keep their
// existing mock data until their backend integrations land.

export interface RegistryComponentMetadata {
  id: string;
  componentName: string;
  editable: boolean;
  editableScope?: string;
  allowedOperations?: string[];
  description?: string;
  framework?: string;
}

export interface EditValidation {
  valid: boolean;
  changedFiles: string[];
  errors: string[];
  warnings: string[];
  addedLines: number;
  removedLines: number;
}

export interface EditProposal {
  componentId: string;
  componentName: string;
  filePath: string;
  instruction: string;
  provider: string;
  simulated: boolean;
  diff: string;
  changedFiles: string[];
  summary: string;
  validation: EditValidation;
  isolatedPreviewApplied: boolean;
  targetUnchanged: boolean;
  providerWarnings: string[];
}

export interface ProjectRecord {
  id: string;
  name: string;
  description?: string | null;
  repositoryUrl: string | null;
  repositoryIdentifier: string | null;
  productionBranch: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
  url: string;
  defaultBranch: string;
}

export interface PatchRecord {
  id: string;
  projectId: string;
  prompt: string;
  status: string;
  generationId?: string;
  branchName?: string | null;
  headCommitSha?: string | null;
  pullRequestNumber?: number | null;
  pullRequestUrl?: string | null;
  componentId?: string;
  filePath?: string;
  diff?: string;
  summary?: string | null;
}

export type PersistedPatch = PatchRecord;

export interface PersistedPatchGeneration extends PatchRecord {
  componentId: string;
  componentName: string;
  filePath: string;
  diff: string;
  summary: string;
  provider: string;
  simulated: false;
  validation: EditValidation;
  branchName: string;
  baseCommitSha: string;
  headCommitSha: string;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (supabase) {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new ApiRequestError(401, 'SESSION_ERROR', 'Could not read the PATCHWORK sign-in session.');
    if (data.session?.access_token) headers.set('Authorization', `Bearer ${data.session.access_token}`);
  }
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', `Cannot reach the PATCHWORK backend at ${API_BASE}. Is it running (npm run dev:backend)?`);
  }
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    throw new ApiRequestError(res.status, 'BAD_RESPONSE', `Backend returned non-JSON (HTTP ${res.status}).`);
  }
  const envelope = body as { success?: boolean; data?: T; error?: { code?: string; message?: string } };
  if (!res.ok || envelope.success !== true) {
    throw new ApiRequestError(
      res.status,
      envelope.error?.code ?? 'REQUEST_FAILED',
      envelope.error?.message ?? `Backend request failed (HTTP ${res.status}).`,
    );
  }
  return envelope.data as T;
}

export function fetchEditableComponents(signal?: AbortSignal): Promise<RegistryComponentMetadata[]> {
  return requestJson<RegistryComponentMetadata[]>('/api/components', { signal });
}

export function fetchComponentMetadata(componentId: string, signal?: AbortSignal): Promise<RegistryComponentMetadata> {
  return requestJson<RegistryComponentMetadata>(`/api/components/${encodeURIComponent(componentId)}`, { signal });
}

export function requestEditProposal(
  componentId: string,
  instruction: string,
  signal?: AbortSignal,
): Promise<EditProposal> {
  return requestJson<EditProposal>('/api/edits/generate', {
    method: 'POST',
    body: JSON.stringify({ componentId, instruction }),
    signal,
  });
}

export function fetchProjects(signal?: AbortSignal): Promise<ProjectRecord[]> {
  return requestJson<ProjectRecord[]>('/api/projects', { signal });
}

export function createProject(input: {
  name: string;
  repositoryUrl: string;
  repositoryIdentifier: string;
  productionBranch: string;
}): Promise<ProjectRecord> {
  return requestJson<ProjectRecord>('/api/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchGitHubRepositories(signal?: AbortSignal): Promise<{ repositories: GitHubRepository[]; hasMore: boolean }> {
  return requestJson<{ repositories: GitHubRepository[]; hasMore: boolean }>('/api/github/repositories', { signal });
}

export function beginGitHubInstallation(): Promise<{ url: string }> {
  return requestJson<{ url: string }>('/api/github/installation/setup', { method: 'POST' });
}

export function createProjectPatch(projectId: string, prompt: string): Promise<PersistedPatch> {
  return requestJson<PersistedPatch>(`/api/projects/${encodeURIComponent(projectId)}/patches`, {
    method: 'POST',
    body: JSON.stringify({ prompt }),
  });
}

export function generateProjectPatch(
  projectId: string,
  patchId: string,
  componentId: string,
): Promise<PersistedPatchGeneration> {
  return requestJson<PersistedPatchGeneration>(
    `/api/projects/${encodeURIComponent(projectId)}/patches/${encodeURIComponent(patchId)}/generate`,
    { method: 'POST', body: JSON.stringify({ componentId }) },
  );
}

export function updateProjectPatchStatus(
  projectId: string,
  patchId: string,
  status: 'APPROVED' | 'REJECTED' | 'CANCELLED',
): Promise<PersistedPatch> {
  return requestJson<PersistedPatch>(
    `/api/projects/${encodeURIComponent(projectId)}/patches/${encodeURIComponent(patchId)}/status`,
    { method: 'PATCH', body: JSON.stringify({ status }) },
  );
}

export function createPatchPullRequest(projectId: string, patchId: string): Promise<{ number: number; url: string; state: string; created: boolean }> {
  return requestJson(`/api/projects/${encodeURIComponent(projectId)}/patches/${encodeURIComponent(patchId)}/pull-request`, {
    method: 'POST',
  });
}
