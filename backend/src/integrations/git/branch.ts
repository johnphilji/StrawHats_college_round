// Person 3 - Armaan (LLM and Git integration: safe branch naming for isolated patch work)
export function buildPatchBranchName(componentId: string): string {
  const safe = (componentId || 'patch')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 36);

  const suffix = Math.random().toString(36).slice(2, 8);

  return safe ? `patch/${safe}-${suffix}` : `patch/${suffix}`;
}
