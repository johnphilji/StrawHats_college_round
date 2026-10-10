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