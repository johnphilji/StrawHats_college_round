import { useState } from 'react';
import styles from './Inspector.module.css';
import type { SelectedComponent, CodeChange } from './types';
import { generateCodeChange, delay } from './api';

interface InspectorProps {
  selected: SelectedComponent | null;
  onClear: () => void;
  activeChange: CodeChange | null;
  onChangeUpdate: (change: CodeChange | null) => void;
  onReleaseSuccess: (change: CodeChange) => void;
  onOpenConflicts?: () => void;
}

export default function Inspector({
  selected,
  onClear,
  activeChange,
  onChangeUpdate,
  onReleaseSuccess,
  onOpenConflicts,
}: InspectorProps) {
  const [instruction, setInstruction] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [showFingerprint, setShowFingerprint] = useState(false);

  if (!selected) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⬡</div>
          <div className={styles.emptyTitle}>Select a Component</div>
          <p className={styles.emptyDesc}>
            Hover over any element on the website preview to highlight it, then click to describe what you want to change.
          </p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!instruction.trim()) return;
    setIsGenerating(true);

    await delay(1200);

    const change = generateCodeChange(selected, instruction);
    onChangeUpdate(change);
    setIsGenerating(false);
  };

  const handleApproveBranch = () => {
    if (!activeChange) return;
    onChangeUpdate({
      ...activeChange,
      status: 'applied_branch',
    });
  };

  const handleApproveRelease = async () => {
    if (!activeChange) return;
    setIsDeploying(true);
    await delay(1000);

    const deployedChange: CodeChange = {
      ...activeChange,
      status: 'deployed',
    };
    onChangeUpdate(deployedChange);
    onReleaseSuccess(deployedChange);
    setIsDeploying(false);
  };

  const handleReset = () => {
    onChangeUpdate(null);
    setInstruction('');
    onClear();
  };

  return (
    <div className={styles.inspector}>
      {/* Top Header */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <span className={styles.selectedLabel}>SELECTED COMPONENT</span>
          <div className={styles.compName}>{selected.label}</div>
        </div>
        <button className={styles.closeBtn} onClick={handleReset} title="Clear selection">
          ✕
        </button>
      </div>

      {/* Source Code Mapping */}
      <div className={styles.sourceBox}>
        <div className={styles.sourceTop}>
          <span>TARGET SOURCE CODE</span>
          <span className={styles.tagBadge}>&lt;{selected.tagName.toLowerCase()}&gt;</span>
        </div>
        <div className={styles.sourcePath}>📁 {selected.sourceFile}</div>
      </div>

      {/* Concurrent Edit Alert */}
      {selected.componentId === 'checkout-button' && onOpenConflicts && (
        <div style={{ padding: '8px 18px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>⚠️ Marcus Vance has a concurrent edit on this button</span>
          <button
            type="button"
            onClick={onOpenConflicts}
            style={{ fontSize: '11px', color: '#be123c', background: 'transparent', border: 'none', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Review ➔
          </button>
        </div>
      )}

      {/* Self-Healed Alert Banner if element moved */}
      {selected.fingerprint.isSelfHealed && (
        <div className={styles.selfHealBanner}>
          <div className={styles.selfHealTop}>
            <span>🧬 Smart Tracking: Element Moved</span>
            <span className={styles.confidencePill}>{selected.fingerprint.selfHealProposal?.confidence}% Match</span>
          </div>
          <p className={styles.selfHealDesc}>{selected.fingerprint.selfHealProposal?.reason}</p>
        </div>
      )}

      {/* Collapsible DOM Fingerprint Toggle */}
      <div className={styles.fingerprintToggleRow}>
        <button
          type="button"
          className={styles.fingerprintToggleBtn}
          onClick={() => setShowFingerprint(s => !s)}
        >
          <span>{showFingerprint ? '▼ Hide DOM Fingerprint' : '▶ View DOM Fingerprint & Confidence'}</span>
          <span className={styles.confScoreBadge}>{selected.fingerprint.confidenceScore}% Confidence</span>
        </button>
      </div>

      {showFingerprint && (
        <div className={styles.fingerprintDetails}>
          <div className={styles.fpRow}>
            <span>Selector:</span> <code>{selected.fingerprint.selector}</code>
          </div>
          <div className={styles.fpRow}>
            <span>Parent:</span> <code>&lt;{selected.fingerprint.parentTag.toLowerCase()}&gt; {selected.fingerprint.parentSelector}</code>
          </div>
          <div className={styles.fpRow}>
            <span>Path:</span> <code>{selected.fingerprint.domPath}</code>
          </div>
        </div>
      )}

      <div className={styles.body}>
        {/* STEP 1: Describe the change (Prompt Input) */}
        {!activeChange && !isGenerating && (
          <div className={styles.promptSection}>
            <div className={styles.promptTitle}>What would you like to change?</div>
            <textarea
              className={styles.textarea}
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make this green and change the text to 'Get Started'"
            />

            {/* Quick example prompt */}
            <div className={styles.quickPrompt}>
              <span>Try example: </span>
              <button
                type="button"
                className={styles.exampleBtn}
                onClick={() => setInstruction("Make this green and change the text to 'Get Started'")}
              >
                "Make this green and change the text to 'Get Started'"
              </button>
            </div>

            <button
              className={styles.generateBtn}
              onClick={handleGenerate}
              disabled={!instruction.trim()}
            >
              Generate Change ➔
            </button>
          </div>
        )}

        {/* STEP 2: AI Generating State */}
        {isGenerating && (
          <div className={styles.generatingBox}>
            <div className={styles.spinner} />
            <div className={styles.generatingTitle}>PATCHWORK is processing...</div>
            <div className={styles.generatingSteps}>
              <div className={styles.stepDone}>✓ Identified component in repository</div>
              <div className={styles.stepDone}>✓ Located source files: {selected.sourceFile}</div>
              <div className={styles.stepActive}>⟳ AI generating code modification...</div>
            </div>
          </div>
        )}

        {/* STEP 3: Review Code Change (Git Diff) */}
        {activeChange && activeChange.status === 'review_diff' && (
          <div className={styles.diffSection}>
            <div className={styles.sectionHeader}>
              <span className={styles.stepBadge}>STEP 1 OF 2</span>
              <h3 className={styles.sectionTitle}>Review Generated Code Diff</h3>
            </div>

            <p className={styles.explanationText}>{activeChange.explanation}</p>

            <div className={styles.metaRow}>
              <span>Branch: <code>{activeChange.branch}</code></span>
              <span>Commit: <code>{activeChange.commitSha}</code></span>
            </div>

            {/* Fenced Diff Viewer */}
            <div className={styles.diffViewer}>
              <div className={styles.diffFilename}>Modified: {activeChange.modifiedFiles.join(', ')}</div>
              <pre className={styles.diffCode}>
                {activeChange.diff.split('\n').map((line, idx) => {
                  const isAdd = line.startsWith('+');
                  const isDel = line.startsWith('-');
                  const isHeader = line.startsWith('@@') || line.startsWith('---') || line.startsWith('+++');

                  return (
                    <div
                      key={idx}
                      className={`${styles.diffLine} ${isAdd ? styles.diffAdd : isDel ? styles.diffDel : isHeader ? styles.diffHeader : ''}`}
                    >
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>

            <div className={styles.actionButtons}>
              <button className={styles.approveBtn} onClick={handleApproveBranch}>
                Approve & Apply to Branch ➔
              </button>
              <button className={styles.discardBtn} onClick={() => onChangeUpdate(null)}>
                Discard
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Change Applied to Branch -> Preview & Release */}
        {activeChange && activeChange.status === 'applied_branch' && (
          <div className={styles.appliedSection}>
            <div className={styles.successAlert}>
              <div className={styles.alertIcon}>✓</div>
              <div>
                <strong>Change applied to branch:</strong>
                <div className={styles.branchName}>⎇ {activeChange.branch}</div>
              </div>
            </div>

            <p className={styles.previewNotice}>
              The interactive website preview on the left is now rendering the updated branch code.
              Inspect the updated button to verify the visual result.
            </p>

            <div className={styles.releaseActions}>
              <button
                className={styles.deployBtn}
                onClick={handleApproveRelease}
                disabled={isDeploying}
              >
                {isDeploying ? 'Merging into main & Deploying...' : 'Approve Release & Merge into Main 🚀'}
              </button>
              <button className={styles.discardBtn} onClick={() => onChangeUpdate(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: Deployed to Main */}
        {activeChange && activeChange.status === 'deployed' && (
          <div className={styles.deployedSection}>
            <div className={styles.celebrationCard}>
              <div className={styles.celebrateIcon}>🎉</div>
              <div className={styles.celebrateTitle}>Successfully Deployed!</div>
              <p className={styles.celebrateDesc}>
                Branch <code>{activeChange.branch}</code> was merged into <strong>main</strong>.
                Your live website has been updated in production.
              </p>
            </div>

            <div className={styles.finalActions}>
              <button className={styles.anotherBtn} onClick={handleReset}>
                + Make Another Change
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
