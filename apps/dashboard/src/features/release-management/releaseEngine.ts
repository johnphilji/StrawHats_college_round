import { Release, Patch, PatchOperation } from '../patch-engine/patchTypes';

export function createRelease(projectId: string, version: string, patches: Patch[]): Release {
  const operationsSnapshot: PatchOperation[] = [];
  
  // Flatten operations from all approved patches
  for (const patch of patches) {
    operationsSnapshot.push(...patch.operations);
  }

  return {
    id: `REL-${Math.random().toString(36).substring(2, 9)}`,
    projectId,
    version,
    status: 'Active',
    patchIds: patches.map(p => p.id),
    operationsSnapshot,
    deployedAt: new Date().toISOString()
  };
}

export function rollbackRelease(activeRelease: Release, targetRelease: Release): Release {
  return {
    id: `REL-${Math.random().toString(36).substring(2, 9)}`,
    projectId: activeRelease.projectId,
    version: `Rollback to ${targetRelease.version}`,
    status: 'Active',
    patchIds: targetRelease.patchIds,
    operationsSnapshot: [...targetRelease.operationsSnapshot],
    deployedAt: new Date().toISOString(),
    rollbackOf: activeRelease.id
  };
}