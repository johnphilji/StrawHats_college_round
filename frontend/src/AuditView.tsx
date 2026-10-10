import styles from './AuditView.module.css';
import type { AuditLog } from './types';
import { INITIAL_AUDIT_LOGS } from './api';

export default function AuditView() {
  const logs: AuditLog[] = INITIAL_AUDIT_LOGS;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Audit Trail & Governance Log</h1>
        <p className={styles.subtitle}>
          Immutable record of every patch creation, conflict resolution, test run, deployment, and rollback.
        </p>
      </div>

      <div className={styles.list}>
        {logs.map(log => (
          <div key={log.id} className={styles.logCard}>
            <div className={styles.logTop}>
              <div className={styles.userGroup}>
                <span className={styles.avatar}>{log.user.initials}</span>
                <span className={styles.name}>{log.user.name}</span>
                <span className={styles.actionBadge}>{log.action}</span>
              </div>
              <span className={styles.timestamp}>{log.timestamp}</span>
            </div>
            <div className={styles.targetRow}>
              Target: <code>{log.target}</code>
            </div>
            <p className={styles.details}>{log.details}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
