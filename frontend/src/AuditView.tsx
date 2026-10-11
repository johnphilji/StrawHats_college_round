import { useState } from 'react';
import styles from './AuditView.module.css';
import type { AuditLog } from './types';
import { INITIAL_AUDIT_LOGS } from './api';

export default function AuditView() {
  const [logs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [filterAction, setFilterAction] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    const matchesAction = filterAction === 'all' || log.action.toLowerCase().includes(filterAction.toLowerCase());
    const matchesSearch =
      !search ||
      log.details.toLowerCase().includes(search.toLowerCase()) ||
      log.target.toLowerCase().includes(search.toLowerCase()) ||
      log.user.name.toLowerCase().includes(search.toLowerCase());
    return matchesAction && matchesSearch;
  });

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Audit Trail & Governance Log</h1>
            <span className={styles.verifiedBadge}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Cryptographically Verified (SHA-256)
            </span>
          </div>
          <p className={styles.subtitle}>
            Immutable hash-chained ledger tracking every patch proposal, conflict resolution, test assertion, and production rollback.
          </p>
        </div>

        {/* Controls */}
        <div className={styles.controlsRow}>
          <div className={styles.searchBox}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Search actors, targets, hashes..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className={styles.filterTabs}>
            {['all', 'patch', 'conflict', 'deploy', 'rollback'].map((act) => (
              <button
                key={act}
                type="button"
                className={`${styles.filterBtn} ${filterAction === act ? styles.filterBtnActive : ''}`}
                onClick={() => setFilterAction(act)}
              >
                {act.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Structured Engineering Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '130px' }}>TIMESTAMP</th>
              <th style={{ width: '180px' }}>ACTOR</th>
              <th style={{ width: '150px' }}>ACTION</th>
              <th style={{ width: '220px' }}>TARGET COMPONENT</th>
              <th>EVENT SUMMARY</th>
              <th style={{ width: '100px', textAlign: 'right' }}>HASH</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.map((log) => {
              const shortHash = log.id.slice(-6).toUpperCase();
              return (
                <tr key={log.id} className={styles.row}>
                  <td className={styles.timestampCell}>{log.timestamp}</td>
                  <td>
                    <div className={styles.actorWrapper}>
                      <span className={styles.actorAvatar}>{log.user.initials}</span>
                      <span className={styles.actorName}>{log.user.name}</span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`${styles.actionTag} ${
                        log.action.includes('Rollback')
                          ? styles.actionRollback
                          : log.action.includes('Deploy')
                          ? styles.actionDeploy
                          : log.action.includes('Conflict')
                          ? styles.actionConflict
                          : styles.actionPatch
                      }`}
                    >
                      {log.action}
                    </span>
                  </td>
                  <td className={styles.targetCell}>
                    <code>{log.target}</code>
                  </td>
                  <td className={styles.detailsCell}>{log.details}</td>
                  <td className={styles.hashCell}>
                    <code>{shortHash}</code>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
