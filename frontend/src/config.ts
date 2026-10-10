// PATCHWORK frontend runtime configuration.
// All values come from Vite env with documented local defaults;
// no production URLs are hardcoded.

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export const API_BASE_URL = stripTrailingSlash(
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000',
);

// Default matches the target checkout's own vite.config.js (port 5173).
// This app must then run on a different port, e.g. `vite --port 5174`.
export const TARGET_ORIGIN = stripTrailingSlash(
  import.meta.env.VITE_PATCHWORK_TARGET_ORIGIN ?? 'http://localhost:5173',
);

export const TARGET_URL = `${TARGET_ORIGIN}/`;
