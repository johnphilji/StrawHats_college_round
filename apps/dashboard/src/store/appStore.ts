import { create } from 'zustand';

interface AppState {
  patches: any[];
  releases: any[];
  conflicts: any[];
  auditLogs: any[];
  
  // Actions
  init: () => Promise<void>;
  deployRelease: (patchIds: string[]) => Promise<void>;
  rollback: (releaseId: string) => Promise<void>;
  resolveConflict: (fingerprint: string, property: string, keptPatchId: string) => Promise<void>;
  resetDemoState: () => Promise<void>;
}

const API_BASE = 'http://localhost:4001/api';

export const useAppStore = create<AppState>()((set, get) => ({
  patches: [],
  releases: [],
  conflicts: [],
  auditLogs: [],

  init: async () => {
    try {
      const [patchesRes, releasesRes, conflictsRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/sites/acme/patches`),
        fetch(`${API_BASE}/sites/acme/releases`),
        fetch(`${API_BASE}/sites/acme/conflicts`),
        fetch(`${API_BASE}/audit`),
      ]);
      set({
        patches: await patchesRes.json(),
        releases: await releasesRes.json(),
        conflicts: await conflictsRes.json(),
        auditLogs: (await auditRes.json()).reverse(),
      });
    } catch(e) {
      console.error("Failed to init store", e);
    }
  },

  deployRelease: async (patchIds) => {
    try {
      const createRes = await fetch(`${API_BASE}/sites/acme/releases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: 'v1.' + (get().releases.length + 1), patchIds })
      });
      const release = await createRes.json();
      
      await fetch(`${API_BASE}/releases/${release.id}/deploy`, { method: 'POST' });
      
      await get().init();
    } catch(e) {}
  },

  rollback: async (targetReleaseId) => {
    try {
      await fetch(`${API_BASE}/releases/${targetReleaseId}/rollback`, { method: 'POST' });
      await get().init();
    } catch(e) {}
  },

  resolveConflict: async (fingerprint, property, keptPatchId) => {
    try {
      // In the prototype, we just approve the kept patch
      await fetch(`${API_BASE}/patches/${keptPatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' })
      });
      
      // And mark others involved as rejected/failed
      const conflict = get().conflicts.find(c => c.targetFingerprint === fingerprint && c.property === property);
      if (conflict) {
         for (const op of conflict.conflictingOperations) {
           if (op.patchId !== keptPatchId) {
             await fetch(`${API_BASE}/patches/${op.patchId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'invalidated' })
             });
           }
         }
      }
      await get().init();
    } catch(e) {}
  },

  resetDemoState: async () => {
    // Rely on npm run seed to reset state fully
    localStorage.removeItem('patchwork_draft_operations');
  }
}));
