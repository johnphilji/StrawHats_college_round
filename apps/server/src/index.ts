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
