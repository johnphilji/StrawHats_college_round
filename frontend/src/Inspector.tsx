import { useState } from 'react';
import styles from './Inspector.module.css';
import type { SelectedComponent, CodeChange } from './types';
import { delay } from './api';
import { requestEditProposal, type EditProposal } from './api-client';

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
  const [requestError, setRequestError] = useState<string | null>(null);

  if (!selected) {
    return (
      <div className={styles.inspector}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              <path d="M13 13l6 6" />
            </svg>
          </div>
          <div className={styles.emptyTitle}>Select a Component</div>
          <p className={styles.emptyDesc}>
            Hover over any element in the interactive preview to highlight it, then click to view its source mapping and generate changes.
          </p>
        </div>
      </div>
    );
  }

  const handleGenerate = async () => {
    if (!instruction.trim() || !selected) return;
    setIsGenerating(true);
    setRequestError(null);

    try {
      // Real backend request: resolve → source → (simulated) generate → validate.
      const proposal: EditProposal = await requestEditProposal(selected.componentId, instruction);
      const change: CodeChange = {
        editId: `edit_${Date.now()}`,
        componentId: proposal.componentId,
        componentLabel: selected.label,
        instruction,
        branch: 'local/preview (uncommitted)',
        commitSha: 'uncommitted',
        status: 'review_diff',
        diff: proposal.diff,
        modifiedFiles: proposal.changedFiles,
        explanation: proposal.summary,
        provider: proposal.provider,
        simulated: proposal.simulated,
        validationErrors: proposal.validation.errors,
        validationWarnings: [...proposal.validation.warnings, ...proposal.providerWarnings],
        targetUnchanged: proposal.targetUnchanged,
        isolatedPreviewApplied: proposal.isolatedPreviewApplied,
        previewApplied: {},
      };
      onChangeUpdate(change);
    } catch (err) {
      // Preserve the selected component and prompt so the user can retry.
      setRequestError(err instanceof Error ? err.message : 'Patch generation failed.');
    } finally {
      setIsGenerating(false);
    }
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
        <button className={styles.closeBtn} onClick={handleReset} title="Clear selection" aria-label="Close">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Source Code Mapping */}
      <div className={styles.sourceBox}>
        <div className={styles.sourceTop}>
          <span>TARGET SOURCE CODE</span>
          <span className={styles.tagBadge}>&lt;{selected.tagName.toLowerCase()}&gt;</span>
        </div>
        <div className={styles.sourcePath}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{selected.sourceFile}</span>
        </div>
      </div>

      {/* Concurrent Edit Alert */}
      {selected.componentId === 'checkout-button' && onOpenConflicts && (
        <div style={{ padding: '8px 18px', background: '#fff1f2', borderBottom: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#be123c" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <span style={{ fontSize: '11px', color: '#be123c', fontWeight: 600 }}>Marcus Vance has a concurrent edit on this button</span>
          </div>
          <button
            type="button"
            onClick={onOpenConflicts}
            style={{ fontSize: '11px', color: '#be123c', background: 'transparent', border: 'none', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
          >
            Review
          </button>
        </div>
      )}

      {/* Self-Healed Alert Banner if element moved */}
      {selected.fingerprint.isSelfHealed && (
        <div className={styles.selfHealBanner}>
          <div className={styles.selfHealTop}>
            <span>Dynamic Tracking: Selector Path Shift</span>
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
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showFingerprint ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
            {showFingerprint ? 'Hide DOM Fingerprint' : 'View DOM Fingerprint'}
          </span>
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
            <div className={styles.promptTitle}>Describe Component Modification</div>
            <textarea
              className={styles.textarea}
              rows={4}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="e.g. Make this green and change the text to 'Get Started'"
            />

            {/* Quick example prompt */}
            <div className={styles.quickPrompt}>
              <span>Example: </span>
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
              disabled={!instruction.trim() || isGenerating}
            >
              {isGenerating ? 'Generating…' : 'Generate Patch'}
            </button>

            {requestError && (
              <div className={styles.errorAlert} role="alert">
                <strong>Patch generation failed.</strong>
                <div>{requestError}</div>
                <div className={styles.errorHint}>Your selection and prompt are preserved — fix the issue and retry.</div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: Processing State */}
        {isGenerating && (
          <div className={styles.generatingBox}>
            <div className={styles.spinner} />
            <div className={styles.generatingTitle}>Analyzing component and repository...</div>
            <div className={styles.generatingSteps}>
              <div className={styles.stepDone}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Identified component in AST</span>
              </div>
              <div className={styles.stepDone}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Located source files: {selected.sourceFile}</span>
              </div>
              <div className={styles.stepActive}>
                <span className={styles.stepPulse} />
                <span>Synthesizing code modification patch...</span>
              </div>
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

            {activeChange.simulated && (
              <div className={styles.simulatedBadge}>
                SIMULATED PATCH — generated locally by the mock provider, not a real LLM. Safe to review; the
                repository is unchanged.
              </div>
            )}
            {activeChange.validationWarnings.length > 0 && (
              <div className={styles.validationList}>
                {activeChange.validationWarnings.map((w, i) => (
                  <div key={i}>Note: {w}</div>
                ))}
              </div>
            )}
            {activeChange.validationErrors.length > 0 && (
              <div className={styles.errorAlert} role="alert">
                <strong>Validation failed — do not apply.</strong>
                {activeChange.validationErrors.map((e, i) => (
                  <div key={i}>{e}</div>
                ))}
              </div>
            )}
            <div className={styles.metaRow}>
              <span>Target: <code>{activeChange.modifiedFiles.join(', ') || '—'}</code></span>
              <span>Isolated preview: <code>{activeChange.isolatedPreviewApplied ? 'applied to temp copy' : 'not applied'}</code></span>
              <span>Repository: <code>{activeChange.targetUnchanged ? 'unchanged' : 'CHECK REQUIRED'}</code></span>
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
                Apply to Branch
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
              <div className={styles.alertIcon}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <strong>Proposal ready for review:</strong>
                <div className={styles.branchName}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 0 1-9 9" />
                  </svg>
                  <span>{activeChange.branch}</span>
                </div>
              </div>
            </div>

            <p className={styles.previewNotice}>
              The proposal was validated against an isolated temp copy of the source file.
              The live website and the repository are unchanged until an explicit apply step.
            </p>

            <div className={styles.releaseActions}>
              <button
                className={styles.deployBtn}
                onClick={handleApproveRelease}
                disabled={isDeploying}
              >
                {isDeploying ? 'Merging into main & Deploying...' : 'Approve Release & Merge into Main'}
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
              <div className={styles.celebrateIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className={styles.celebrateTitle}>Successfully Deployed</div>
              <p className={styles.celebrateDesc}>
                Branch <code>{activeChange.branch}</code> was merged into <strong>main</strong>.
                Your live website has been updated in production.
              </p>
            </div>

            <div className={styles.finalActions}>
              <button className={styles.anotherBtn} onClick={handleReset}>
                Make Another Change
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
