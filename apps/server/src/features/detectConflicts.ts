import { Patch, PatchOperation } from '@patchwork/shared';

export interface Conflict {
  targetFingerprint: string;
  property: string;
  conflictingOperations: { patchId: string, operation: PatchOperation }[];
}

export function detectConflicts(patches: Patch[]): Conflict[] {
  const propertyMap = new Map<string, { patchId: string, operation: PatchOperation }[]>();
  
  for (const patch of patches) {
    for (const op of patch.operations) {
      const key = `${op.targetFingerprint}::${op.operationType}::${op.property || 'content'}`;
      if (!propertyMap.has(key)) {
        propertyMap.set(key, []);
      }
      propertyMap.get(key)!.push({ patchId: patch.id, operation: op });
    }
  }

  // Also check ancestor/descendant selector overlaps for the SAME property across different elements
  // We'll iterate all ops and if selectorA includes selectorB (naive overlap check) and property matches, flag it.
  const allOps = patches.flatMap(p => p.operations.map(op => ({ patchId: p.id, op })));
  
  for (let i = 0; i < allOps.length; i++) {
    for (let j = i + 1; j < allOps.length; j++) {
      const a = allOps[i];
      const b = allOps[j];
      if (a.patchId !== b.patchId && a.op.operationType === b.op.operationType && a.op.property === b.op.property) {
        // Very basic ancestor/descendant overlap heuristic
        if (a.op.selector.includes(b.op.selector) || b.op.selector.includes(a.op.selector)) {
          // It's a structural overlap conflict. Force them to same key if they aren't already.
          if (a.op.targetFingerprint !== b.op.targetFingerprint) {
             const overlapKey = `OVERLAP::${a.op.selector}::${b.op.selector}::${a.op.property || 'content'}`;
             if (!propertyMap.has(overlapKey)) {
               propertyMap.set(overlapKey, [
                 { patchId: a.patchId, operation: a.op },
                 { patchId: b.patchId, operation: b.op }
               ]);
             }
          }
        }
      }
    }
  }

  const conflicts: Conflict[] = [];
  
  for (const [key, ops] of propertyMap.entries()) {
    if (ops.length > 1) {
      const parts = key.split('::');
      const targetFingerprint = parts[0] === 'OVERLAP' ? parts[1] + ' & ' + parts[2] : parts[0];
      const property = parts[0] === 'OVERLAP' ? parts[3] : parts[2];
      
      conflicts.push({
        targetFingerprint,
        property,
        conflictingOperations: ops
      });
    }
  }

  return conflicts;
}
