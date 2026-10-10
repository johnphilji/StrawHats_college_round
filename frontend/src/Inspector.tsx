import { useState } from 'react';
import styles from './Inspector.module.css';
import type { SelectedComponent, EditResponse, EditStatus } from './types';
import { submitEditRequest, mergeAndDeploy } from './api';

interface InspectorProps {
  selected: SelectedComponent | null;
  onClear: () => void;
}

export default function Inspector({ selected, onClear }: InspectorProps) {
  const [instruction, setInstruction] = useState('');
  const [edit, setEdit] = useState<EditResponse | null>(null);
  const [status, setStatus] = useState<EditStatus | null>(null);
  const [loading, setLoading] = useState(false);

  // If no component is selected, render the onboarding / empty state
  if (!selected) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⬡</div>
          <div className={styles.emptyTitle}>Select a Component</div>
          <p className={styles.emptyDesc}>
            Hover over any element in the website preview to see it highlight, then click it to open the AI prompt.
          </p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!instruction.trim()) return;
    setLoading(true);
    setStatus('generating');

    try {
      const res = await submitEditRequest(selected, instruction, (s, data) => {
        setStatus(s);
        if (data) setEdit(data as EditResponse);
      });
      setEdit(res);
      setStatus('approved'); // ready for user review of diff
    } finally {
      setLoading(false);
    }
  };

  const handleApproveBranch = () => {
    // Progress from diff approval to branch preview stage
    setStatus('testing');
  };

  const handleApproveRelease = async () => {
    if (!edit) return;
    setLoading(true);
    try {
      await mergeAndDeploy(edit.editId, s => setStatus(s));
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setEdit(null);
    setStatus(null);
    setInstruction('');
    onClear();
  };

  return (
    <div className={styles.inspector}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <span className={styles.selectedLabel}>Selected Component</span>
          <div className={styles.compName}>{selected.label}</div>
        </div>
        <button className={styles.closeBtn} onClick={handleReset} title="Clear selection">
          ✕
        </button>
      </div>

      {/* Source Mapping Box */}
      <div className={styles.sourceMapping}>
        <div className={styles.sourceHeader}>
          <span>TARGET SOURCE FILE</span>
          <span>&lt;{selected.tagName.toLowerCase()}&gt;</span>
        </div>
        <div className={styles.sourcePath}>📁 {selected.sourceFile}</div>
      </div>

      <div className={styles.body}>
        {/* STEP 1: Describe the change */}
        {!edit && (
          <div className={styles.promptSection}>
            <div className={styles.sectionTitle}>
              <span>✨</span>
              <span>What would you like to change?</span>
            </div>

            <textarea
              className={styles.textarea}
              placeholder='e.g. Make this green and change the text to "Get Started"'
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              disabled={loading}
            />

            <div className={styles.chipGroup}>
              <button
                type="button"
                className={styles.promptChip}
                onClick={() => setInstruction('Make this green and change the text to "Get Started"')}
              >
                🟢 Green & "Get Started"
              </button>
              <button
                type="button"
                className={styles.promptChip}
                onClick={() => setInstruction('Rename to "Continue to Payment" and add lock icon')}
              >
                🔒 "Continue to Payment"
              </button>
              <button
                type="button"
                className={styles.promptChip}
                onClick={() => setInstruction('Update promo banner to 50% OFF Hackathon Special')}
              >
                🔥 Flash Sale Promo
              </button>
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={loading || !instruction.trim()}
            >
              {loading ? (
                <>
                  <span>⏳</span>
                  <span>{status === 'generating' ? 'AI Generating Code...' : 'Validating Syntax...'}</span>
                </>
              ) : (
                <>
                  <span>✦</span>
                  <span>Generate Change</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* STEP 2: Review Code Diff */}
        {edit && status === 'approved' && (
          <div className={styles.promptSection}>
            <div className={styles.sectionTitle}>
              <span>🔍</span>
              <span>Proposed Code Changes</span>
            </div>

            <div className={styles.diffCard}>
              <div className={styles.diffHeader}>
                <span>Git Diff Preview</span>
                <span>{edit.modifiedFiles?.join(', ')}</span>
              </div>

              {edit.explanation && (
                <div className={styles.diffExplanation}>
                  💡 {edit.explanation}
                </div>
              )}

              <div className={styles.diffBox}>
                {edit.diff.split('\n').map((line, i) => {
                  let cls = styles.diffLine;
                  if (line.startsWith('+') && !line.startsWith('+++')) cls = `${styles.diffLine} ${styles.diffAdded}`;
                  else if (line.startsWith('-') && !line.startsWith('---')) cls = `${styles.diffLine} ${styles.diffRemoved}`;
                  else if (line.startsWith('@@')) cls = `${styles.diffLine} ${styles.diffHunk}`;
                  return (
                    <div key={i} className={cls}>
                      {line || ' '}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.checklist}>
              <div className={styles.checkItem}>
                <span>✓</span>
                <span>Automated syntax validation passed</span>
              </div>
              <div className={styles.checkItem}>
                <span>✓</span>
                <span>Scoped strictly to {selected.label}</span>
              </div>
              <div className={styles.checkItem}>
                <span>✓</span>
                <span>Isolated Git branch prepared: <code>{edit.branch}</code></span>
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.discardBtn} onClick={() => setEdit(null)}>
                Try Again
              </button>
              <button className={styles.approveBtn} onClick={handleApproveBranch}>
                ✓ Approve & Create Branch
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Preview Branch & Release Approval */}
        {edit && (status === 'testing' || status === 'merged' || status === 'deploying') && (
          <div className={styles.promptSection}>
            <div className={styles.sectionTitle}>
              <span>⎇</span>
              <span>Isolated Branch Preview</span>
            </div>

            <div className={styles.diffCard}>
              <div className={styles.diffHeader}>
                <span>Branch: {edit.branch}</span>
                <span>Commit: {edit.commitSha}</span>
              </div>
              <div className={styles.diffExplanation}>
                Changes are committed to <code>{edit.branch}</code>. Preview is ready for final release approval.
              </div>
            </div>

            <div className={styles.actionRow}>
              <button className={styles.discardBtn} onClick={() => setEdit(null)} disabled={loading}>
                Discard
              </button>
              <button
                className={styles.approveBtn}
                onClick={handleApproveRelease}
                disabled={loading}
              >
                {loading ? '🚀 Merging & Deploying to Vercel...' : '🚀 Approve Release & Deploy to Main'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Deployed */}
        {edit && status === 'deployed' && (
          <div className={styles.successCard}>
            <div className={styles.successIcon}>🎉</div>
            <div className={styles.successTitle}>Successfully Released!</div>
            <p className={styles.successDesc}>
              Merged into <code>main</code> and deployed live to production. All automated checks passed.
            </p>
            <button className={styles.resetBtn} onClick={handleReset}>
              ↺ Edit Another Component
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
