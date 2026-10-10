const fs = require('fs');
const path = require('path');

const write = (p, content) => {
  const fullPath = path.join(__dirname, p);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
};

// 1. Shared Types
write('packages/shared/package.json', \`
{
  "name": "@patchwork/shared",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": { "build": "tsc" },
  "devDependencies": { "typescript": "^5.0.0" }
}
\`);

write('packages/shared/tsconfig.json', \`
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "declaration": true,
    "outDir": "./dist",
    "strict": true
  },
  "include": ["index.ts"]
}
\`);

write('packages/shared/index.ts', \`
export type OperationType = 'setText' | 'setStyle' | 'setAttribute' | 'setVisibility' | 'hide';

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
  siteId: string;
  name: string;
  status: 'draft' | 'approved' | 'invalidated' | 'healed_pending';
  version: string;
  operations: PatchOperation[];
  createdAt: string;
}

export interface Release {
  id: string;
  siteId: string;
  version: string;
  status: 'candidate' | 'active' | 'rolled_back' | 'failed';
  patchIds: string[];
  operationsSnapshot: PatchOperation[];
  deployedAt: string;
  rollbackOf?: string;
}

export interface AuditEntry {
  id: string;
  prevHash: string;
  hash: string;
  timestamp: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: any;
}

export interface Site {
  id: string;
  name: string;
  targetUrl: string;
  activeReleaseId?: string;
}

export interface TelemetryEvent {
  patchId: string;
  status: 'applied' | 'healed' | 'broken';
  confidence: number;
  newSelector?: string;
  timestamp: string;
}

export interface VerificationRun {
  id: string;
  releaseId: string;
  status: 'pending' | 'passed' | 'failed';
  steps: any[];
}
\`);

// 2. Server Package
write('apps/server/package.json', \`
{
  "name": "@patchwork/server",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest run"
  },
  "dependencies": {
    "@patchwork/shared": "*",
    "cors": "^2.8.5",
    "express": "^4.21.0"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^22.0.0",
    "tsx": "^4.19.1",
    "typescript": "^5.6.2",
    "vitest": "^2.1.1"
  }
}
\`);

write('apps/server/tsconfig.json', \`
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*", "tests/**/*"]
}
\`);

// 3. Server Logic (Database)
write('apps/server/src/db.ts', \`
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Site, Patch, Release, AuditEntry, TelemetryEvent } from '@patchwork/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data.json');

export interface Schema {
  sites: Site[];
  patches: Patch[];
  releases: Release[];
  telemetry: TelemetryEvent[];
  audit: AuditEntry[];
}

export const defaultData: Schema = {
  sites: [],
  patches: [],
  releases: [],
  telemetry: [],
  audit: []
};

export function readDb(): Schema {
  if (!fs.existsSync(DB_PATH)) return defaultData;
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch {
    return defaultData;
  }
}

export function writeDb(data: Schema) {
  const tmp = DB_PATH + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, DB_PATH);
}
\`);

// 4. Server Logic (Audit)
write('apps/server/src/features/audit.ts', \`
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
\`);

// 5. Server Logic (Conflicts)
write('apps/server/src/features/detectConflicts.ts', \`
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
      // Create a unique key for element + property
      // To handle the ancestor/descendant rule, we should ideally parse the DOM or have deep selector knowledge.
      // For this requirement, we'll simulate selector overlap by checking if one selector contains another.
      // A true implementation needs AST or DOM execution.
      
      const key = \`\${op.targetFingerprint}::\${op.operationType}::\${op.property || 'content'}\`;
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
             const overlapKey = \`OVERLAP::\${a.op.selector}::\${b.op.selector}::\${a.op.property || 'content'}\`;
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
\`);

// 6. Server Logic (Express App)
write('apps/server/src/index.ts', \`
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDb, writeDb } from './db.js';
import { appendAudit, verifyAuditChain } from './features/audit.js';
import { detectConflicts } from './features/detectConflicts.js';
import { Patch, Release } from '@patchwork/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve the compiled runtime script
app.use(express.static(path.join(__dirname, '../public')));

// Sites
app.get('/api/sites', (req, res) => {
  res.json(readDb().sites);
});
app.get('/api/sites/:id', (req, res) => {
  const site = readDb().sites.find(s => s.id === req.params.id);
  res.json(site || null);
});

// Patches
app.get('/api/sites/:id/patches', (req, res) => {
  res.json(readDb().patches.filter(p => p.siteId === req.params.id));
});
app.post('/api/sites/:id/patches', (req, res) => {
  const db = readDb();
  const newPatch: Patch = {
    ...req.body,
    id: 'PT-' + Math.random().toString(36).substring(2, 9),
    siteId: req.params.id,
    createdAt: new Date().toISOString()
  };
  db.patches.push(newPatch);
  writeDb(db);
  appendAudit('CreatePatch', 'Patch', newPatch.id);
  res.json(newPatch);
});
app.patch('/api/patches/:pid', (req, res) => {
  const db = readDb();
  const patch = db.patches.find(p => p.id === req.params.pid);
  if (!patch) return res.status(404).json({error: 'Not found'});
  Object.assign(patch, req.body);
  writeDb(db);
  appendAudit('UpdatePatch', 'Patch', patch.id);
  res.json(patch);
});

// Conflicts
app.get('/api/sites/:id/conflicts', (req, res) => {
  const db = readDb();
  const sitePatches = db.patches.filter(p => p.siteId === req.params.id && (p.status === 'draft' || p.status === 'approved'));
  const conflicts = detectConflicts(sitePatches);
  res.json(conflicts);
});

// Releases
app.post('/api/sites/:id/releases', (req, res) => {
  const db = readDb();
  const patchIds = req.body.patchIds || [];
  const patchesToInclude = db.patches.filter(p => patchIds.includes(p.id));
  
  const newRelease: Release = {
    id: 'REL-' + Math.random().toString(36).substring(2, 9),
    siteId: req.params.id,
    version: req.body.version || 'v1.0',
    status: 'candidate',
    patchIds,
    operationsSnapshot: patchesToInclude.flatMap(p => p.operations),
    deployedAt: new Date().toISOString()
  };
  db.releases.push(newRelease);
  writeDb(db);
  appendAudit('CreateRelease', 'Release', newRelease.id);
  res.json(newRelease);
});

app.get('/api/sites/:id/releases', (req, res) => {
  res.json(readDb().releases.filter(r => r.siteId === req.params.id));
});

app.post('/api/releases/:rid/deploy', (req, res) => {
  const db = readDb();
  const release = db.releases.find(r => r.id === req.params.rid);
  if (!release) return res.status(404).send('Not found');
  
  const site = db.sites.find(s => s.id === release.siteId);
  if (!site) return res.status(404).send('Site not found');
  
  // Deactivate others
  db.releases.filter(r => r.siteId === site.id && r.status === 'active').forEach(r => r.status = 'candidate');
  
  release.status = 'active';
  site.activeReleaseId = release.id;
  writeDb(db);
  
  appendAudit('DeployRelease', 'Release', release.id);
  res.json(release);
});

app.post('/api/releases/:rid/rollback', (req, res) => {
  const db = readDb();
  const oldRelease = db.releases.find(r => r.id === req.params.rid);
  if (!oldRelease) return res.status(404).send('Not found');
  
  const site = db.sites.find(s => s.id === oldRelease.siteId);
  
  // Deactivate current active
  const activeRelease = db.releases.find(r => r.siteId === oldRelease.siteId && r.status === 'active');
  if (activeRelease) activeRelease.status = 'rolled_back';
  
  const rollbackRelease: Release = {
    ...oldRelease,
    id: 'REL-' + Math.random().toString(36).substring(2, 9),
    status: 'active',
    version: 'Rollback to ' + oldRelease.version,
    deployedAt: new Date().toISOString(),
    rollbackOf: activeRelease?.id
  };
  
  db.releases.push(rollbackRelease);
  if (site) site.activeReleaseId = rollbackRelease.id;
  writeDb(db);
  
  appendAudit('RollbackRelease', 'Release', rollbackRelease.id);
  res.json(rollbackRelease);
});

// Runtime Consumption
app.get('/api/sites/:id/release/active.json', (req, res) => {
  const db = readDb();
  const site = db.sites.find(s => s.id === req.params.id);
  if (!site || !site.activeReleaseId) return res.json({ operations: [] });
  const rel = db.releases.find(r => r.id === site.activeReleaseId);
  res.json({ operations: rel ? rel.operationsSnapshot : [] });
});
app.get('/api/sites/:id/release/:rid.json', (req, res) => {
  const db = readDb();
  const rel = db.releases.find(r => r.id === req.params.rid && r.siteId === req.params.id);
  res.json({ operations: rel ? rel.operationsSnapshot : [] });
});

// Telemetry
app.post('/api/sites/:id/telemetry', (req, res) => {
  const db = readDb();
  db.telemetry.push({ ...req.body, timestamp: new Date().toISOString() });
  writeDb(db);
  res.json({ success: true });
});

app.get('/api/sites/:id/telemetry/summary', (req, res) => {
  res.json(readDb().telemetry); // Simplified for phase 2
});

// Audit
app.get('/api/audit', (req, res) => {
  res.json(readDb().audit);
});
app.get('/api/audit/verify', (req, res) => {
  const result = verifyAuditChain(readDb().audit);
  res.json(result);
});

app.listen(4001, () => {
  console.log('[Server] API running on http://localhost:4001');
});
\`);

// 7. Seed Script (Root)
write('scripts/seed.js', \`
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../apps/server/data.json');

const initialData = {
  sites: [
    { id: 'acme', name: 'Acme Store', targetUrl: 'http://localhost:4000' }
  ],
  patches: [],
  releases: [],
  telemetry: [],
  audit: []
};

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
console.log('Database seeded with Acme Store and clean slate.');
\`);

// 8. Tests
write('apps/server/tests/audit.test.ts', \`
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
\`);

console.log('Server and Shared types generated successfully.');
