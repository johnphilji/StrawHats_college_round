export interface AuditEvent {
  id: string;
  projectId: string;
  actorId: string;
  action: 'PatchCreated' | 'DraftUpdated' | 'ConflictDetected' | 'ReviewApproved' | 'TestRunCompleted' | 'ReleaseDeployed' | 'ReleaseRolledBack';
  resourceType: 'Patch' | 'Release' | 'TestRun';
  resourceId: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

// Append-only audit store using localStorage for the prototype
class AuditService {
  private static readonly STORAGE_KEY = 'patchwork_audit_log';

  public static appendEvent(event: Omit<AuditEvent, 'id' | 'timestamp'>): AuditEvent {
    const fullEvent: AuditEvent = {
      ...event,
      id: `EVT-${Math.random().toString(36).substring(2, 9)}`,
      timestamp: new Date().toISOString()
    };

    const currentLogs = this.getEvents();
    currentLogs.push(fullEvent); // Append only

    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(currentLogs));
    } catch (e) {
      console.warn("Failed to persist audit event", e);
    }

    return fullEvent;
  }

  public static getEvents(projectId?: string): AuditEvent[] {
    try {
      const logs = localStorage.getItem(this.STORAGE_KEY);
      const parsed = logs ? JSON.parse(logs) : [];
      if (projectId) {
        return parsed.filter((e: AuditEvent) => e.projectId === projectId);
      }
      return parsed;
    } catch (e) {
      return [];
    }
  }
}

export default AuditService;
