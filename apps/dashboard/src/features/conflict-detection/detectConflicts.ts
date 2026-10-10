import { Patch, PatchOperation } from '../patch-engine/patchTypes';

export interface Conflict {
  targetFingerprint: string;
  property: string;
  conflictingOperations: { patchId: string, operation: PatchOperation }[];
}

export function detectConflicts(patches: Patch[]): Conflict[] {
  const propertyMap = new Map<string, { patchId: string, operation: PatchOperation }[]>();
  
  for (const patch of patches) {
    for (const op of patch.operations) {
      // Create a unique key for element + property
      const key = `${op.targetFingerprint}::${op.operationType}::${op.property || 'content'}`;
      if (!propertyMap.has(key)) {
        propertyMap.set(key, []);
      }
      propertyMap.get(key)!.push({ patchId: patch.id, operation: op });
    }
  }

  const conflicts: Conflict[] = [];
  
  for (const [key, ops] of propertyMap.entries()) {
    if (ops.length > 1) {
      const [targetFingerprint, , property] = key.split('::');
      conflicts.push({
        targetFingerprint,
        property,
        conflictingOperations: ops
      });
    }
  }

  return conflicts;
}