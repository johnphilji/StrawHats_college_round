import { useState } from 'react';
import styles from './TestingView.module.css';
import type { PlaywrightTestRun } from './types';
import { INITIAL_TEST_RUNS } from './api';

export default function TestingView() {
  const [runs, setRuns] = useState<PlaywrightTestRun[]>(INITIAL_TEST_RUNS);
  const [isRunning, setIsRunning] = useState(false);
  const activeRun = runs[0];

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      const newRun: PlaywrightTestRun = {
        id: `test-${Date.now().toString().slice(-3)}`,
        patchTitle: 'Fix Checkout Button Label & Brand Color',
        status: 'passed',
        durationMs: 720,
        timestamp: 'Just now',
        mismatchPercentage: 0.6,
        checks: [
          { id: 'c1', name: 'Element Reachability & Visibility', status: 'pass', message: 'Target element #checkout-button visible in viewport', durationMs: 130 },
          { id: 'c2', name: 'Synthetic Click & Event Assertion', status: 'pass', message: 'Intercepted click route without runtime errors', durationMs: 210 },
          { id: 'c3', name: 'Content Security & CSP Check', status: 'pass', message: 'No unauthorized scripts or CSP violations', durationMs: 90 },
          { id: 'c4', name: 'Visual Regression (Pixel Diff)', status: 'pass', message: 'Mismatch: 0.6% (Strict threshold < 2.0% passed)', durationMs: 290 },
        ],
      };
      setRuns([newRun, ...runs]);
    }, 1200);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Automated Verification & Playwright Tests</h1>
          <p className={styles.subtitle}>
            Headless browser interaction assertions and pixel regression checks to verify changes before release.
          </p>
        </div>

        <button className={styles.runBtn} onClick={handleRun} disabled={isRunning}>
          {isRunning ? '⏳ Running Playwright...' : '▶ Run Verification Suite'}
        </button>
      </div>

      <div className={styles.body}>
        {/* Release Gate Card */}
        <div className={styles.gateCard}>
          <div>
            <div className={styles.gateTitle}>PRE-FLIGHT RELEASE GATE: {activeRun.status === 'passed' ? '🟢 PASSED' : '🔴 BLOCKED'}</div>
            <div className={styles.gateSub}>{activeRun.patchTitle} • Executed in {activeRun.durationMs}ms</div>
          </div>
          <span className={styles.mismatchBadge}>Pixel Shift: {activeRun.mismatchPercentage}%</span>
        </div>

        {/* Checks List */}
        <div className={styles.checksList}>
          {activeRun.checks.map(c => (
            <div key={c.id} className={styles.checkRow}>
              <span className={c.status === 'pass' ? styles.passIcon : styles.failIcon}>
                {c.status === 'pass' ? '✓' : '✕'}
              </span>
              <div className={styles.checkInfo}>
                <div className={styles.checkNameRow}>
                  <strong>{c.name}</strong>
                  <span className={styles.duration}>{c.durationMs}ms</span>
                </div>
                <div className={styles.checkMsg}>{c.message}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Visual Regression Cards */}
        <div className={styles.visualSection}>
          <h3 className={styles.sectionTitle}>Visual Regression (Pixel Screenshot Comparison)</h3>
          <div className={styles.visualGrid}>
            <div className={styles.visualCard}>
              <div className={styles.visualLabel}>1. ORIGINAL BASELINE</div>
              <div className={styles.mockBox}>
                <button className={styles.mockBaseline}>Proceed to Checkout</button>
              </div>
            </div>

            <div className={styles.visualCard}>
              <div className={styles.visualLabel}>2. APPLIED CHANGE</div>
              <div className={styles.mockBox}>
                <button className={styles.mockPatched}>Continue to Payment 🔒</button>
              </div>
            </div>

            <div className={styles.visualCard}>
              <div className={styles.visualLabel}>3. PIXEL DIFFERENCE HEATMAP</div>
              <div className={styles.mockBox} style={{ background: '#0f172a' }}>
                <div className={styles.heatmapBox}>
                  <div className={styles.heatmapGlow} />
                  <span className={styles.heatmapText}>+0.8% Modified</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
