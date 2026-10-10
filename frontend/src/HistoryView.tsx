import styles from './HistoryView.module.css';
import type { HistoryItem } from './types';

interface HistoryViewProps {
  history: HistoryItem[];
  onRollback?: (id: string) => void;
}

export default function HistoryView({ history, onRollback }: HistoryViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Release History</h1>
        <p className={styles.subtitle}>
          All visual changes approved, merged into <strong>main</strong>, and deployed to production.
        </p>
      </div>

      <div className={styles.list}>
        {history.map(item => (
          <div key={item.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.badgeGroup}>
                <span className={styles.compBadge}>{item.componentLabel}</span>
                <span className={`${styles.statusBadge} ${item.status === 'deployed' ? styles.statusDeployed : styles.statusRollback}`}>
                  <span className={styles.statusDot} />
                  {item.status === 'deployed' ? 'Live in Main' : 'Rolled Back'}
                </span>
              </div>
              <span className={styles.timestamp}>{item.timestamp}</span>
            </div>

            <div className={styles.instructionText}>"{item.instruction}"</div>

            <div className={styles.metaRow}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="6" y1="3" x2="6" y2="15" />
                  <circle cx="18" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <path d="M18 9a9 9 0 0 1-9 9" />
                </svg>
                <span>Branch: <code>{item.branch}</code></span>
              </span>
              <span>SHA: <code>{item.commitSha}</code></span>
              <span>Author: {item.author}</span>
            </div>

            {item.status === 'deployed' && onRollback && (
              <div className={styles.cardFooter}>
                <button className={styles.rollbackBtn} onClick={() => onRollback(item.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="1 4 1 10 7 10" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Rollback this Change
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
