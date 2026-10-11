// Person 3 - Armaan (LLM and Git integration: safe branch naming for isolated patch work)
export function buildPatchBranchName(componentId: string, attemptId?: string): string {
  const safe = (componentId || 'patch')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);

  const suffix = attemptId
    ? attemptId.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return safe
    ? `patchwork/${safe}-${suffix || 'retry'}`
    : `patchwork/patch-${suffix || 'retry'}`;
}
