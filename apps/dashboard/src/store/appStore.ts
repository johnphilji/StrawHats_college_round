import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Patch, Release, PatchOperation } from '../features/patch-engine/patchTypes';
import { Conflict, detectConflicts } from '../features/conflict-detection/detectConflicts';
import { createRelease, rollbackRelease } from '../features/release-management/releaseEngine';
import AuditService, { AuditEvent } from '../services/auditService';

interface AppState {
  patches: Patch[];
  releases: Release[];
  conflicts: Conflict[];
  auditLogs: AuditEvent[];
  
  // Actions
  saveDraftPatch: (name: string, operations: PatchOperation[]) => void;
  deployRelease: (patchIds: string[]) => void;
  rollback: (releaseId: string) => void;
  resolveConflict: (conflictFingerprint: string, property: string, keptPatchId: string) => void;
  refreshConflicts: () => void;
  refreshAuditLogs: () => void;
  resetDemoState: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      patches: [],
      releases: [],
      conflicts: [],
      auditLogs: [],

      saveDraftPatch: (name, operations) => {
        const newPatch: Patch = {
          id: `PT-${Math.floor(1000 + Math.random() * 9000)}`,
          projectId: 'demo-project',
          name,
          status: 'Ready to Deploy',
          version: 'v1.0',
          operations,
          createdAt: new Date().toISOString()
        };
        
        set((state) => ({ patches: [newPatch, ...state.patches] }));
        get().refreshConflicts();
        
        // Log event
        const log = AuditService.appendEvent({
          projectId: 'demo-project',
          actorId: 'Demo User',
          action: 'PatchCreated',
          resourceType: 'Patch',
          resourceId: newPatch.id
        });
        get().refreshAuditLogs();
      },

      deployRelease: (patchIds) => {
        const state = get();
        const selectedPatches = state.patches.filter(p => patchIds.includes(p.id));
        
        const newVersion = `v1.${state.releases.length + 1}`;
        const newRelease = createRelease('demo-project', newVersion, selectedPatches);
        
        // Update patch statuses
        const updatedPatches = state.patches.map(p => 
          patchIds.includes(p.id) ? { ...p, status: 'Active' as const } : p
        );

        set({ 
          releases: [newRelease, ...state.releases],
          patches: updatedPatches
        });

        AuditService.appendEvent({
          projectId: 'demo-project',
          actorId: 'Demo User',
          action: 'ReleaseDeployed',
          resourceType: 'Release',
          resourceId: newRelease.id
        });
        get().refreshAuditLogs();
      },

      rollback: (targetReleaseId) => {
        const state = get();
        const targetRelease = state.releases.find(r => r.id === targetReleaseId);
        const activeRelease = state.releases[0];
        
        if (!targetRelease || !activeRelease) return;

        const newRollback = rollbackRelease(activeRelease, targetRelease);
        
        set({
          releases: [newRollback, ...state.releases]
        });

        AuditService.appendEvent({
          projectId: 'demo-project',
          actorId: 'Demo User',
          action: 'ReleaseRolledBack',
          resourceType: 'Release',
          resourceId: newRollback.id
        });
        get().refreshAuditLogs();
      },

      resolveConflict: (fingerprint, property, keptPatchId) => {
        const state = get();
        
        // Update patch statuses: the one NOT kept gets failed or rejected
        const conflict = state.conflicts.find(c => c.targetFingerprint === fingerprint && c.property === property);
        if (!conflict) return;

        const updatedPatches = state.patches.map(p => {
          if (conflict.conflictingOperations.some(co => co.patchId === p.id)) {
            if (p.id === keptPatchId) {
              return { ...p, status: 'Ready to Deploy' as const };
            } else {
              return { ...p, status: 'Failed' as const };
            }
          }
          return p;
        });

        set({ patches: updatedPatches });
        get().refreshConflicts();
        
        AuditService.appendEvent({
          projectId: 'demo-project',
          actorId: 'Demo User',
          action: 'ReviewApproved',
          resourceType: 'Patch',
          resourceId: keptPatchId
        });
        get().refreshAuditLogs();
      },

      refreshConflicts: () => {
        const state = get();
        const pendingPatches = state.patches.filter(p => p.status === 'Ready to Deploy' || p.status === 'Conflict Detected');
        const detected = detectConflicts(pendingPatches);
        
        // Mark conflicting patches
        if (detected.length > 0) {
          const conflictingIds = new Set(detected.flatMap(c => c.conflictingOperations.map(co => co.patchId)));
          const updatedPatches = state.patches.map(p => 
            conflictingIds.has(p.id) ? { ...p, status: 'Conflict Detected' as const } : p
          );
          set({ conflicts: detected, patches: updatedPatches });
        } else {
          set({ conflicts: [] });
        }
      },
      
      refreshAuditLogs: () => {
        set({ auditLogs: AuditService.getEvents().reverse() });
      },

      resetDemoState: () => {
        set({ patches: [], releases: [], conflicts: [], auditLogs: [] });
        localStorage.removeItem('patchwork_draft_operations');
        localStorage.removeItem('patchwork_audit_log');
      }
    }),
    {
      name: 'patchwork-storage', // unique name
    }
  )
);
