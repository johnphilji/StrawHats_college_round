const fs = require('fs');
const path = require('path');

const write = (filepath, content) => {
  const fullPath = path.join(__dirname, filepath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
};

const files = {
  'src/features/patch-engine/patchTypes.ts': `
export type OperationType = 'setText' | 'setStyle' | 'setAttribute' | 'setVisibility';

export interface PatchOperation {
  id: string;
  targetFingerprint: string;
  selector: string;
  operationType: OperationType;
  property?: string;
  originalValue: string;
  newValue: string;
}

export interface Patch {
  id: string;
  projectId: string;
  name: string;
  status: 'Draft' | 'Pending Review' | 'Ready to Deploy' | 'Active' | 'Failed' | 'Rolled Back' | 'Conflict Detected';
  version: string;
  operations: PatchOperation[];
  createdAt: string;
}

export interface Release {
  id: string;
  projectId: string;
  version: string;
  status: 'Active' | 'Rolled Back' | 'Failed';
  patchIds: string[];
  operationsSnapshot: PatchOperation[]; // The exact state deployed
  deployedAt: string;
  rollbackOf?: string; // If this release is a rollback, what release did it replace?
}
  `,
  'src/features/patch-engine/validatePatch.ts': `
import { PatchOperation } from './patchTypes';

const ALLOWED_STYLES = ['backgroundColor', 'color', 'padding', 'margin', 'fontSize', 'borderRadius', 'display', 'visibility'];
const ALLOWED_ATTRIBUTES = ['href', 'alt', 'title', 'disabled', 'placeholder'];

export function validateOperation(op: PatchOperation): { valid: boolean; error?: string } {
  // Prevent arbitrary JS execution
  if (op.newValue.includes('javascript:') || op.newValue.includes('eval(')) {
    return { valid: false, error: 'Unsafe javascript execution detected.' };
  }

  if (op.operationType === 'setStyle') {
    if (!op.property || !ALLOWED_STYLES.includes(op.property)) {
      return { valid: false, error: \`Style property \${op.property} is not allowlisted.\` };
    }
  }

  if (op.operationType === 'setAttribute') {
    if (!op.property || !ALLOWED_ATTRIBUTES.includes(op.property)) {
      return { valid: false, error: \`Attribute \${op.property} is not allowlisted.\` };
    }
  }

  return { valid: true };
}
  `,
  'src/features/conflict-detection/detectConflicts.ts': `
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
      const key = \`\${op.targetFingerprint}::\${op.operationType}::\${op.property || 'content'}\`;
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
  `,
  'src/features/release-management/releaseEngine.ts': `
import { Release, Patch, PatchOperation } from '../patch-engine/patchTypes';

export function createRelease(projectId: string, version: string, patches: Patch[]): Release {
  const operationsSnapshot: PatchOperation[] = [];
  
  // Flatten operations from all approved patches
  for (const patch of patches) {
    operationsSnapshot.push(...patch.operations);
  }

  return {
    id: \`REL-\${Math.random().toString(36).substring(2, 9)}\`,
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
    id: \`REL-\${Math.random().toString(36).substring(2, 9)}\`,
    projectId: activeRelease.projectId,
    version: \`Rollback to \${targetRelease.version}\`,
    status: 'Active',
    patchIds: targetRelease.patchIds,
    operationsSnapshot: [...targetRelease.operationsSnapshot],
    deployedAt: new Date().toISOString(),
    rollbackOf: activeRelease.id
  };
}
  `,
  'tests/conflict-detection.test.ts': `
import { describe, it, expect } from 'vitest';
import { detectConflicts } from '../src/features/conflict-detection/detectConflicts';
import { Patch } from '../src/features/patch-engine/patchTypes';

describe('Conflict Detection', () => {
  it('should detect conflicting property changes on the same element', () => {
    const patchA: Patch = {
      id: 'PT-1',
      projectId: 'PRJ-1',
      name: 'Blue Button',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op1', targetFingerprint: 'btn123', selector: 'button', operationType: 'setStyle', property: 'backgroundColor', originalValue: 'gray', newValue: 'blue' }
      ]
    };

    const patchB: Patch = {
      id: 'PT-2',
      projectId: 'PRJ-1',
      name: 'Red Button',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op2', targetFingerprint: 'btn123', selector: 'button', operationType: 'setStyle', property: 'backgroundColor', originalValue: 'gray', newValue: 'red' }
      ]
    };

    const conflicts = detectConflicts([patchA, patchB]);
    expect(conflicts.length).toBe(1);
    expect(conflicts[0].targetFingerprint).toBe('btn123');
    expect(conflicts[0].property).toBe('backgroundColor');
    expect(conflicts[0].conflictingOperations.length).toBe(2);
  });

  it('should not flag compatible changes as conflicts', () => {
    const patchA: Patch = {
      id: 'PT-1',
      projectId: 'PRJ-1',
      name: 'Blue Button',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op1', targetFingerprint: 'btn123', selector: 'button', operationType: 'setStyle', property: 'backgroundColor', originalValue: 'gray', newValue: 'blue' }
      ]
    };

    const patchB: Patch = {
      id: 'PT-2',
      projectId: 'PRJ-1',
      name: 'Change Text',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op2', targetFingerprint: 'btn123', selector: 'button', operationType: 'setText', property: undefined, originalValue: 'Click', newValue: 'Submit' }
      ]
    };

    const conflicts = detectConflicts([patchA, patchB]);
    expect(conflicts.length).toBe(0); // Different properties (backgroundColor vs text content)
  });
});
  `,
  'tests/rollback.test.ts': `
import { describe, it, expect } from 'vitest';
import { createRelease, rollbackRelease } from '../src/features/release-management/releaseEngine';
import { Patch } from '../src/features/patch-engine/patchTypes';

describe('Rollback Workflow', () => {
  it('should correctly restore the previous known-good configuration', () => {
    const patchA: Patch = {
      id: 'PT-1',
      projectId: 'PRJ-1',
      name: 'Good Patch',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op1', targetFingerprint: 'btn123', selector: 'button', operationType: 'setText', originalValue: 'Click', newValue: 'Good' }
      ]
    };

    const release1 = createRelease('PRJ-1', 'v1.0', [patchA]);
    expect(release1.operationsSnapshot[0].newValue).toBe('Good');

    const patchB: Patch = {
      id: 'PT-2',
      projectId: 'PRJ-1',
      name: 'Bad Patch',
      status: 'Ready to Deploy',
      version: 'v1',
      createdAt: '',
      operations: [
        { id: 'op2', targetFingerprint: 'btn123', selector: 'button', operationType: 'setText', originalValue: 'Good', newValue: 'Broken' }
      ]
    };

    const release2 = createRelease('PRJ-1', 'v1.1', [patchA, patchB]);
    expect(release2.operationsSnapshot.length).toBe(2);
    expect(release2.operationsSnapshot[1].newValue).toBe('Broken');

    // Rollback to release 1
    const rollback = rollbackRelease(release2, release1);
    
    expect(rollback.projectId).toBe('PRJ-1');
    expect(rollback.rollbackOf).toBe(release2.id);
    expect(rollback.operationsSnapshot.length).toBe(1);
    expect(rollback.operationsSnapshot[0].newValue).toBe('Good'); // Restored
  });
});
  `
};

Object.keys(files).forEach(key => {
  write(key, files[key]);
});

console.log('Feature modules and tests created.');
