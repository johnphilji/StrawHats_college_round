import React from 'react';
import styles from './DeployView.module.css';

interface Deployment {
  id: string;
  branch: string;
  commitSha: string;
  status: 'production' | 'preview' | 'failed' | 'rolled_back';
  url: string;
  timestamp: string;
  duration: string;
}

const DEPLOYMENTS: Deployment[] = [
  { id: 'dpl-001', branch: 'main', commitSha: 'a1b2c3d4', status: 'production', url: 'https://acme-store.vercel.app', timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), duration: '23s' },
  { id: 'dpl-002', branch: 'patch/hero-cta-a1b2c3', commitSha: 'e5f6g7h8', status: 'preview', url: 'https://acme-store-git-patch.vercel.app', timestamp: new Date(Date.now() - 1000 * 60 * 90).toISOString(), duration: '21s' },
  { id: 'dpl-003', branch: 'patch/checkout-button-g7h8i9', commitSha: 'g7h8i9j0', status: 'rolled_back', url: 'https://acme-store-git-checkout.vercel.app', timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(), duration: '19s' },
];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function DeployView() {
  return (
    <div className={styles.view}>
      <div className={styles.header}>
        <h2 className={styles.title}>Deployments</h2>
        <div className={styles.subtitle}>Vercel deployment history for the Acme Store project.</div>
      </div>

      {/* Production card */}
      <div className={styles.prodCard}>
        <div className={styles.prodHeader}>
          <span className={styles.prodBadge}>● PRODUCTION</span>
          <a href={DEPLOYMENTS[0].url} target="_blank" rel="noreferrer" className={styles.prodLink}>
            {DEPLOYMENTS[0].url} ↗
          </a>
        </div>
        <div className={styles.prodMeta}>
          <span className={styles.metaItem}>⎇ {DEPLOYMENTS[0].branch}</span>
          <span className={styles.metaItem}>SHA {DEPLOYMENTS[0].commitSha}</span>
          <span className={styles.metaItem}>{timeAgo(DEPLOYMENTS[0].timestamp)}</span>
          <span className={styles.metaItem}>Built in {DEPLOYMENTS[0].duration}</span>
        </div>
      </div>

      {/* All deployments */}
      <div className={styles.sectionTitle}>All deployments</div>
      <div className={styles.table}>
        <div className={styles.tableHead}>
          <div>Branch</div>
          <div>Commit</div>
          <div>Status</div>
          <div>Age</div>
          <div>Duration</div>
        </div>
        {DEPLOYMENTS.map(d => (
          <div key={d.id} className={styles.tableRow}>
            <div className={styles.branchCell}>
              <span className={styles.branchIcon}>⎇</span>
              <code>{d.branch}</code>
            </div>
            <div><code className={styles.sha}>{d.commitSha}</code></div>
            <div>
              <span className={`${styles.badge} ${styles[`badge_${d.status}`]}`}>
                {d.status === 'production' ? '● Production' :
                 d.status === 'preview' ? '○ Preview' :
                 d.status === 'failed' ? '✗ Failed' : '↩ Rolled back'}
              </span>
            </div>
            <div className={styles.muted}>{timeAgo(d.timestamp)}</div>
            <div className={styles.muted}>{d.duration}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
