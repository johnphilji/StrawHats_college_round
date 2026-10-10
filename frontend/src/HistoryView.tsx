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
                  {item.status === 'deployed' ? '● Live in Main' : '↺ Rolled Back'}
                </span>
              </div>
              <span className={styles.timestamp}>{item.timestamp}</span>
            </div>

            <div className={styles.instructionText}>"{item.instruction}"</div>

            <div className={styles.metaRow}>
              <span>⎇ Branch: <code>{item.branch}</code></span>
              <span>SHA: <code>{item.commitSha}</code></span>
              <span>Author: {item.author}</span>
            </div>

            {item.status === 'deployed' && onRollback && (
              <div className={styles.cardFooter}>
                <button className={styles.rollbackBtn} onClick={() => onRollback(item.id)}>
                  ↺ Rollback this Change
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
