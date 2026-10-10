import { useState } from 'react';
import styles from './ConflictsView.module.css';
import type { PatchConflict } from './types';
import { INITIAL_CONFLICTS } from './api';

interface ConflictsViewProps {
  onResolveConflict?: (conflictId: string, choice: 'patchA' | 'patchB' | 'smart_merge') => void;
}

export default function ConflictsView({ onResolveConflict }: ConflictsViewProps) {
  const [conflicts, setConflicts] = useState<PatchConflict[]>(INITIAL_CONFLICTS);
  const selectedConflict = conflicts[0];

  const handleResolve = (choice: 'patchA' | 'patchB' | 'smart_merge') => {
    setConflicts(prev =>
      prev.map(c => ({
        ...c,
        status: 'resolved',
        resolvedValue:
          choice === 'patchA'
            ? c.patchA.value
            : choice === 'patchB'
            ? c.patchB.value
            : '#2563eb (Royal Blue) + "Continue to Payment 🔒"',
      }))
    );
    if (onResolveConflict) {
      onResolveConflict(selectedConflict.id, choice);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Patch Conflict Resolver</h1>
            <span className={styles.badgeWarning}>1 Active Overlap</span>
          </div>
          <p className={styles.subtitle}>
            PATCHWORK compares patch operations at the individual property level. When two developers change
            the same property simultaneously, safe isolation stops unreviewed merges until resolved.
          </p>
        </div>
      </div>

      <div className={styles.body}>
        {selectedConflict.status === 'resolved' ? (
          <div className={styles.resolvedCard}>
            <div className={styles.resolvedIcon}>✓</div>
            <h3 className={styles.resolvedTitle}>Conflict Successfully Resolved</h3>
            <p className={styles.resolvedDesc}>
              Adopted value: <strong>{selectedConflict.resolvedValue}</strong>.
              The branch has been reconciled and cleared for release.
            </p>
            <button
              className={styles.reopenBtn}
              onClick={() =>
                setConflicts(prev => prev.map(c => ({ ...c, status: 'unresolved' })))
              }
            >
              Reopen & Compare Again
            </button>
          </div>
        ) : (
          <>
            <div className={styles.cardInfo}>
              <strong>Target Element:</strong> <code>{selectedConflict.targetFingerprint}</code> ({selectedConflict.elementLabel})
              <span style={{ marginLeft: 16 }}>•</span>
              <strong style={{ marginLeft: 16 }}>Conflicting Property:</strong> <code>{selectedConflict.property}</code>
            </div>

            {/* 3-Way Side-by-Side Resolver */}
            <div className={styles.threeWayGrid}>
              {/* Baseline */}
              <div className={styles.colCard}>
                <div className={styles.colHeader}>BASELINE</div>
                <div className={styles.colAuthor}>Original Website Code</div>
                <div className={styles.colValBox}>
                  <span>Value:</span> <code>{selectedConflict.originalBaseline}</code>
                </div>
                <div className={styles.previewBox}>
                  <button className={styles.mockBtn} style={{ backgroundColor: '#16a34a' }}>
                    Proceed to Checkout
                  </button>
                </div>
              </div>

              {/* Proposal A */}
              <div className={`${styles.colCard} ${styles.colCardA}`}>
                <div className={styles.colHeader}>PROPOSAL A</div>
                <div className={styles.colAuthor}>{selectedConflict.patchA.author}</div>
                <div className={styles.colValBox}>
                  <span>Value:</span> <code>{selectedConflict.patchA.value}</code>
                </div>
                <div className={styles.previewBox}>
                  <button className={styles.mockBtn} style={{ backgroundColor: '#2563eb' }}>
                    Continue to Payment 🔒
                  </button>
                </div>
                <button className={styles.acceptBtnA} onClick={() => handleResolve('patchA')}>
                  Accept Proposal A
                </button>
              </div>

              {/* Proposal B */}
              <div className={`${styles.colCard} ${styles.colCardB}`}>
                <div className={styles.colHeader}>PROPOSAL B</div>
                <div className={styles.colAuthor}>{selectedConflict.patchB.author}</div>
                <div className={styles.colValBox}>
                  <span>Value:</span> <code>{selectedConflict.patchB.value}</code>
                </div>
                <div className={styles.previewBox}>
                  <button className={styles.mockBtn} style={{ backgroundColor: '#ef4444' }}>
                    Proceed to Checkout
                  </button>
                </div>
                <button className={styles.acceptBtnB} onClick={() => handleResolve('patchB')}>
                  Accept Proposal B
                </button>
              </div>
            </div>

            {/* Smart Merge Banner */}
            <div className={styles.smartMergeBanner}>
              <div>
                <div className={styles.smartMergeTitle}>✨ Smart Merge Suggestion</div>
                <div className={styles.smartMergeDesc}>
                  Adopt Alex's royal blue styling (<code>#2563eb</code>) and payment copy while rejecting the crimson override.
                </div>
              </div>
              <button className={styles.smartMergeBtn} onClick={() => handleResolve('smart_merge')}>
                Apply Smart Merge ➔
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
