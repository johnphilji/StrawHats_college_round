import { describe, it, expect } from 'vitest';
import { createAuditHash, verifyAuditChain } from '../src/features/audit.js';

describe('Audit Chain', () => {
  it('should verify an intact chain', () => {
    const prev1 = '0000000000000000000000000000000000000000000000000000000000000000';
    const payload1 = JSON.stringify({id: 'E1', timestamp: 'T1', action: 'A', resourceType: 'R', resourceId: '1', details: null});
    const hash1 = createAuditHash(prev1, payload1);
    
    const payload2 = JSON.stringify({id: 'E2', timestamp: 'T2', action: 'B', resourceType: 'R', resourceId: '2', details: null});
    const hash2 = createAuditHash(hash1, payload2);

    const chain = [
      { id: 'E1', prevHash: prev1, hash: hash1, timestamp: 'T1', action: 'A', resourceType: 'R', resourceId: '1', details: null },
      { id: 'E2', prevHash: hash1, hash: hash2, timestamp: 'T2', action: 'B', resourceType: 'R', resourceId: '2', details: null }
    ];

    expect(verifyAuditChain(chain).valid).toBe(true);
  });

  it('should detect tampering', () => {
    const prev1 = '0000000000000000000000000000000000000000000000000000000000000000';
    const payload1 = JSON.stringify({id: 'E1', timestamp: 'T1', action: 'A', resourceType: 'R', resourceId: '1', details: null});
    const hash1 = createAuditHash(prev1, payload1);

    const chain = [
      { id: 'E1', prevHash: prev1, hash: hash1, timestamp: 'T1', action: 'TAMPERED', resourceType: 'R', resourceId: '1', details: null },
    ];

    expect(verifyAuditChain(chain).valid).toBe(false);
  });
});
