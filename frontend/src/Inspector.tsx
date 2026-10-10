import React, { useState } from 'react';
import styles from './Inspector.module.css';
import type { SelectedComponent, EditResponse, EditStatus } from './types';
import { submitEditRequest, mergeAndDeploy, rollback } from './api';

interface InspectorProps {
  selected: SelectedComponent | null;
  onClear: () => void;
}

function StatusBadge({ status }: { status: EditStatus }) {
  const map: Record<EditStatus, { label: string; cls: string }> = {
    draft:       { label: 'Draft',       cls: styles.statusDraft },
    generating:  { label: 'Generating…', cls: styles.statusGenerating },
    testing:     { label: 'Testing',     cls: styles.statusTesting },
    approved:    { label: 'Approved',    cls: styles.statusApproved },
    merged:      { label: 'Merged',      cls: styles.statusMerged },
    deploying:   { label: 'Deploying…',  cls: styles.statusDeploying },
    deployed:    { label: '✓ Deployed',  cls: styles.statusDeployed },
    failed:      { label: '✗ Failed',    cls: styles.statusFailed },
    conflict:    { label: '⚡ Conflict',  cls: styles.statusConflict },
    rolled_back: { label: '↩ Rolled back', cls: styles.statusRolledBack },
  };
  const { label, cls } = map[status];
  return <span className={`${styles.statusBadge} ${cls}`}>{label}</span>;
}

function DiffViewer({ diff }: { diff: string }) {
  return (
    <div className={styles.diffViewer}>
      {diff.split('\n').map((line, i) => {
        let cls = styles.diffLine;
        if (line.startsWith('+') && !line.startsWith('+++')) cls = styles.diffAdded;
        else if (line.startsWith('-') && !line.startsWith('---')) cls = styles.diffRemoved;
        else if (line.startsWith('@@')) cls = styles.diffHunk;
        else if (line.startsWith('---') || line.startsWith('+++')) cls = styles.diffHeader;
        return <div key={i} className={cls}>{line || ' '}</div>;
      })}
    </div>
  );
}

export default function Inspector({ selected, onClear }: InspectorProps) {
  const [instruction, setInstruction] = useState('');
  const [edit, setEdit]               = useState<EditResponse | null>(null);
  const [status, setStatus]           = useState<EditStatus | null>(null);
  const [loading, setLoading]         = useState(false);
  const [activeTab, setActiveTab]     = useState<'prompt' | 'diff' | 'styles'>('prompt');

  const handleSubmit = async () => {
    if (!selected || !instruction.trim()) return;
    setLoading(true);
    setEdit(null);
    setStatus('generating');
    setActiveTab('diff');
    try {
      const result = await submitEditRequest(
        selected.componentId,
        instruction,
        (s, data) => {
          setStatus(s);
          if (data?.diff) setEdit(prev => ({ ...prev!, ...data }));
        }
      );
      setEdit(result);
      setStatus('approved');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!edit) return;
    setLoading(true);
    await mergeAndDeploy(edit.editId, setStatus);
    setLoading(false);
  };

  const handleRollback = async () => {
    if (!edit) return;
    setLoading(true);
    await rollback(edit.editId, setStatus);
    setLoading(false);
  };

  const handleClear = () => {
    setEdit(null);
    setStatus(null);
    setInstruction('');
    setActiveTab('prompt');
    onClear();
  };

  if (!selected) {
    return (
      <aside className={styles.inspector}>
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="6" y="6" width="8" height="8" rx="2" fill="currentColor" opacity="0.3"/>
              <rect x="18" y="6" width="8" height="8" rx="2" fill="currentColor" opacity="0.6"/>
              <rect x="6" y="18" width="8" height="8" rx="2" fill="currentColor" opacity="0.6"/>
              <circle cx="22" cy="22" r="4" fill="currentColor"/>
            </svg>
          </div>
          <div className={styles.emptyTitle}>No component selected</div>
          <div className={styles.emptyText}>
            Enable <strong>Edit Mode</strong> in the preview toolbar, then click any highlighted element to select it.
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className={styles.inspector}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.componentId}>{selected.componentId}</div>
            <div className={styles.componentTag}>&lt;{selected.tagName.toLowerCase()}&gt;</div>
          </div>
          <button className={styles.clearBtn} onClick={handleClear} title="Deselect">✕</button>
        </div>
        {selected.text && (
          <div className={styles.componentText}>"{selected.text.slice(0, 60)}{selected.text.length > 60 ? '…' : ''}"</div>
        )}
        {status && <StatusBadge status={status} />}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {(['prompt', 'diff', 'styles'] as const).map(tab => (
          <button
            key={tab}
            className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'prompt' ? '✦ Prompt' : tab === 'diff' ? '⟨/⟩ Diff' : '◈ Styles'}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {/* Prompt tab */}
        {activeTab === 'prompt' && (
          <div className={styles.promptSection} style={{animation: 'fadeIn 0.2s ease'}}>
            <div className={styles.label}>Describe your change</div>
            <textarea
              className={styles.textarea}
              placeholder={`e.g. "Make the background green and rename it to Continue to Payment"`}
              value={instruction}
              onChange={e => setInstruction(e.target.value)}
              rows={4}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleSubmit(); }}
            />
            <div className={styles.promptHint}>⌘ Enter to submit</div>
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!instruction.trim() || loading}
            >
              {loading && status === 'generating' ? (
                <><span className={styles.spinner} /> Generating patch…</>
              ) : (
                '⚡ Generate Patch'
              )}
            </button>
          </div>
        )}

        {/* Diff tab */}
        {activeTab === 'diff' && (
          <div style={{animation: 'fadeIn 0.2s ease'}}>
            {edit?.diff ? (
              <>
                <div className={styles.diffMeta}>
                  <div className={styles.diffBranch}>
                    <span className={styles.branchIcon}>⎇</span>
                    <span className={styles.branchName}>{edit.branch}</span>
                  </div>
                  <div className={styles.diffSha}>SHA: {edit.commitSha}</div>
                </div>
                <DiffViewer diff={edit.diff} />
                {edit.validationPassed && (
                  <div className={styles.validationBadge}>
                    ✓ Validation passed · All selectors verified
                  </div>
                )}
              </>
            ) : (
              <div className={styles.noDiff}>
                {loading ? (
                  <div className={styles.loadingDiff}>
                    <span className={styles.spinner} />
                    <span>Generating diff…</span>
                  </div>
                ) : (
                  <span>No diff yet. Submit a prompt first.</span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Styles tab */}
        {activeTab === 'styles' && (
          <div className={styles.stylesGrid} style={{animation: 'fadeIn 0.2s ease'}}>
            {Object.entries(selected.styles).map(([prop, val]) => (
              <div key={prop} className={styles.styleProp}>
                <div className={styles.stylePropName}>{prop}</div>
                <div className={styles.stylePropVal}>
                  {prop === 'backgroundColor' || prop === 'color' ? (
                    <span className={styles.colorSwatch} style={{background: val}} />
                  ) : null}
                  <code>{val}</code>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action bar */}
      {edit && (status === 'approved' || status === 'deployed' || status === 'rolled_back') && (
        <div className={styles.actions}>
          {status === 'approved' && (
            <button className={styles.deployBtn} onClick={handleDeploy} disabled={loading}>
              {loading ? <><span className={styles.spinner} /> Deploying…</> : '▲ Merge & Deploy'}
            </button>
          )}
          {status === 'deployed' && (
            <button className={styles.rollbackBtn} onClick={handleRollback} disabled={loading}>
              ↩ Rollback
            </button>
          )}
          {status === 'rolled_back' && (
            <div className={styles.rolledBackNote}>Rolled back to previous version.</div>
          )}
        </div>
      )}
    </aside>
  );
}
