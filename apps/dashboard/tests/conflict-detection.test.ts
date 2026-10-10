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