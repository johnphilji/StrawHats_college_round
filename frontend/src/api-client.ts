import { API_BASE_URL } from './config';

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
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
  } catch {
    throw new ApiRequestError(0, 'NETWORK_ERROR', `Cannot reach the PATCHWORK backend at ${API_BASE_URL}. Is it running (npm run dev:backend)?`);
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
