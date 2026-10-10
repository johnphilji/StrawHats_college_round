import React from 'react';
import styles from './HistoryView.module.css';
import type { HistoryEntry, EditStatus } from './types';
import { MOCK_HISTORY } from './api';

function StatusPill({ status }: { status: EditStatus }) {
  const colors: Partial<Record<EditStatus, string>> = {
    deployed:    styles.pillDeployed,
    rolled_back: styles.pillRolledBack,
    failed:      styles.pillFailed,
    approved:    styles.pillApproved,
  };
  return (
    <span className={`${styles.pill} ${colors[status] ?? styles.pillDefault}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function HistoryView() {
  const history: HistoryEntry[] = MOCK_HISTORY;

  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h2 className={styles.title}>Change History</h2>
        <div className={styles.subtitle}>All edits across all components, newest first.</div>
      </div>

      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{history.filter(h => h.status === 'deployed').length}</div>
          <div className={styles.statLabel}>Deployed</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{history.filter(h => h.status === 'rolled_back').length}</div>
          <div className={styles.statLabel}>Rolled back</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statValue}>{history.length}</div>
          <div className={styles.statLabel}>Total edits</div>
        </div>
      </div>

      <div className={styles.list}>
        {history.map((entry, i) => (
          <div key={entry.editId} className={styles.card} style={{ animationDelay: `${i * 60}ms` }}>
            <div className={styles.cardLeft}>
              <div className={styles.cardIcon}>
                {entry.status === 'deployed' ? '✓' : entry.status === 'rolled_back' ? '↩' : '⚡'}
              </div>
              {i < history.length - 1 && <div className={styles.cardLine} />}
            </div>
            <div className={styles.cardBody}>
              <div className={styles.cardTop}>
                <div className={styles.cardLabel}>{entry.label}</div>
                <StatusPill status={entry.status} />
              </div>
              <div className={styles.cardInstruction}>"{entry.instruction}"</div>
              <div className={styles.cardMeta}>
                <span className={styles.cardBranch}>⎇ {entry.branch}</span>
                <span className={styles.cardSha}>SHA: {entry.commitSha}</span>
                <span className={styles.cardTime}>{timeAgo(entry.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
