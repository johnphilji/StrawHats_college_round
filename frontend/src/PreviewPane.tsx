import React, { useRef, useEffect, useCallback } from 'react';
import type { SelectedComponent } from './types';
import styles from './PreviewPane.module.css';

interface PreviewPaneProps {
  selectedId: string | null;
  onSelect: (component: SelectedComponent) => void;
  editMode: boolean;
}

const DEMO_URL = 'http://localhost:3000'; // demo-site served on port 3000

export default function PreviewPane({ selectedId, onSelect, editMode }: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Listen for postMessages from the bridge (Phase 2 integration point)
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.origin !== DEMO_URL) return;
      if (e.data?.type === 'patchwork:select') {
        onSelect(e.data as SelectedComponent);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  const handleReload = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  }, []);

  const iframeSrc = editMode
    ? `${DEMO_URL}?pw_edit=1`
    : DEMO_URL;

  return (
    <div className={styles.pane}>
      {/* Preview toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.urlBar}>
          <span className={styles.urlDot} />
          <span className={styles.urlText}>{DEMO_URL}</span>
        </div>
        <div className={styles.toolbarActions}>
          <button className={styles.toolBtn} onClick={handleReload} title="Reload">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3a5 5 0 0 0-4.546 2.914.5.5 0 1 1-.908-.418A6 6 0 1 1 2 8l-1.5-1.5-.5 2.5 2.5-.5L1 7a7 7 0 1 0 .89-3.467A.5.5 0 1 1 1.02 3a7.5 7.5 0 0 1 1.37-1.374A7 7 0 0 1 8 1a7 7 0 0 1 0 14A7 7 0 0 1 1 8H.5a7.5 7.5 0 0 1 7.5-7.5V3z"/>
            </svg>
          </button>
          <div className={`${styles.editBadge} ${editMode ? styles.editBadgeActive : ''}`}>
            {editMode ? '● Edit Mode' : '○ View Mode'}
          </div>
        </div>
      </div>

      {/* iFrame */}
      <div className={styles.iframeWrapper}>
        {!editMode && selectedId && (
          <div className={styles.selectionOverlay}>
            Click an element in the preview to select it for editing.
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          className={styles.iframe}
          title="Demo site preview"
          sandbox="allow-same-origin allow-scripts allow-forms"
        />
      </div>
    </div>
  );
}
