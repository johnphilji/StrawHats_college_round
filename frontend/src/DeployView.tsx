import { useState } from 'react';
import styles from './DeployView.module.css';
import type { Release } from './types';
import { INITIAL_RELEASES } from './api';

export default function DeployView() {
  const [releases, setReleases] = useState<Release[]>(INITIAL_RELEASES);
  const [anomaly, setAnomaly] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const activeRelease = releases.find(r => r.status === 'active') || releases[0];

  const handleSimulateAnomaly = () => {
    setAnomaly(true);
    setReleases(prev =>
      prev.map(r => (r.id === activeRelease.id ? { ...r, status: 'failed' } : r))
    );
  };

  const handleRollback = () => {
    setIsRollingBack(true);
    setTimeout(() => {
      setIsRollingBack(false);
      setAnomaly(false);
      const rollbackRel: Release = {
        id: `rel-${Date.now().toString().slice(-3)}`,
        version: 'v1.2.1-rollback',
        projectId: 'acme-store',
        status: 'active',
        deployedAt: 'Just now',
        deployedBy: 'Alex Rivera (Auto-Recovery)',
        duration: '160ms',
        patchesCount: 2,
        rollbackOf: activeRelease.version,
      };
      setReleases(prev => [
        rollbackRel,
        ...prev.map(r => (r.status === 'active' ? { ...r, status: 'rolled_back' as const } : r)),
      ]);
    }, 700);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Releases & Rollback</h1>
          <p className={styles.subtitle}>
            Deploy hotfixes instantly without rebuilding. If an anomaly occurs, restore the previous known-good state with zero downtime.
          </p>
        </div>

        <button
          className={`${styles.anomalyBtn} ${anomaly ? styles.anomalyBtnActive : ''}`}
          onClick={handleSimulateAnomaly}
          disabled={anomaly}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {anomaly ? 'Anomaly Active' : 'Simulate Telemetry Anomaly'}
        </button>
      </div>

      {anomaly && (
        <div className={styles.anomalyBanner}>
          <div>
            <div className={styles.anomalyTitle}>Critical Anomaly Flagged on Release {activeRelease.version}</div>
            <div className={styles.anomalyDesc}>
              Automated telemetry flagged elevated checkout failure rates. Trigger recovery to restore the previous stable configuration.
            </div>
          </div>
          <button className={styles.recoveryBtn} onClick={handleRollback} disabled={isRollingBack}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            {isRollingBack ? 'Restoring Previous State...' : 'Instant Rollback to Previous Version'}
          </button>
        </div>
      )}

      <div className={styles.body}>
        {/* Active release card */}
        <div className={styles.activeCard}>
          <div className={styles.cardHeader}>
            <div className={styles.versionRow}>
              <span className={`${styles.statusDot} ${activeRelease.status === 'failed' ? styles.dotFailed : styles.dotActive}`} />
              <span className={styles.versionName}>{activeRelease.version}</span>
              <span className={styles.liveTag}>{activeRelease.status === 'failed' ? 'ANOMALY DETECTED' : 'LIVE IN PRODUCTION'}</span>
            </div>
            <div className={styles.metaStats}>
              <span>Applied in: <strong>{activeRelease.duration}</strong></span>
              <span>Rebuild Required: <strong>0ms</strong></span>
            </div>
          </div>
        </div>

        {/* Releases table */}
        <div className={styles.tableCard}>
          <div className={styles.tableHeader}>
            <div>Release Version</div>
            <div>Status</div>
            <div>Patches</div>
            <div>Deployed By</div>
            <div>Timestamp</div>
          </div>

          {releases.map(r => (
            <div key={r.id} className={styles.tableRow}>
              <div><strong>{r.version}</strong></div>
              <div>
                <span className={`${styles.statusPill} ${
                  r.status === 'active' ? styles.pillActive : r.status === 'failed' ? styles.pillFailed : styles.pillRollback
                }`}>
                  <span className={styles.pillDot} />
                  {r.status === 'active' ? 'Active' : r.status === 'failed' ? 'Failed' : 'Rolled Back'}
                </span>
              </div>
              <div>{r.patchesCount} Patches</div>
              <div>{r.deployedBy}</div>
              <div className={styles.dateCol}>
                {r.deployedAt}
                {r.rollbackOf && <span className={styles.rollbackNote}> (Reverted {r.rollbackOf})</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
