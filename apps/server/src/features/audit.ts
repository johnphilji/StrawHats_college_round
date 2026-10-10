import crypto from 'crypto';
import { readDb, writeDb } from '../db.js';
import { AuditEntry } from '@patchwork/shared';

export function createAuditHash(prevHash: string, dataStr: string): string {
  return crypto.createHash('sha256').update(prevHash + dataStr).digest('hex');
}

export function appendAudit(action: string, resourceType: string, resourceId: string, details?: any) {
  const db = readDb();
  const lastEntry = db.audit.length > 0 ? db.audit[db.audit.length - 1] : null;
  const prevHash = lastEntry ? lastEntry.hash : '0000000000000000000000000000000000000000000000000000000000000000';
  
  const id = 'EVT-' + Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();
  
  const payloadStr = JSON.stringify({ id, timestamp, action, resourceType, resourceId, details });
  const hash = createAuditHash(prevHash, payloadStr);
  
  const newEntry: AuditEntry = { id, prevHash, hash, timestamp, action, resourceType, resourceId, details };
  db.audit.push(newEntry);
  writeDb(db);
}

export function verifyAuditChain(entries: AuditEntry[]): { valid: boolean, failedAt?: string } {
  let expectedPrev = '0000000000000000000000000000000000000000000000000000000000000000';
  
  for (const entry of entries) {
    if (entry.prevHash !== expectedPrev) {
      return { valid: false, failedAt: entry.id };
    }
    const payloadStr = JSON.stringify({
      id: entry.id, timestamp: entry.timestamp, action: entry.action, 
      resourceType: entry.resourceType, resourceId: entry.resourceId, details: entry.details
    });
    const computed = createAuditHash(expectedPrev, payloadStr);
    if (computed !== entry.hash) {
      return { valid: false, failedAt: entry.id };
    }
    expectedPrev = entry.hash;
  }
  return { valid: true };
}
