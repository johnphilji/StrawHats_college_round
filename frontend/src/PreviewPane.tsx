import { useRef, useState, useEffect } from 'react';
import type { SelectedComponent, ConnectedWebsite } from './types';
import { MOCK_COMPONENTS } from './api';
import styles from './PreviewPane.module.css';

interface PreviewPaneProps {
  selectedId: string | null;
  onSelect: (component: SelectedComponent) => void;
  editMode: boolean;
  website: ConnectedWebsite;
  onToggleEditMode?: () => void;
}

export default function PreviewPane({
  selectedId,
  onSelect,
  editMode,
  website,
  onToggleEditMode,
}: PreviewPaneProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Handle postMessage from demo site iframe if running
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'patchwork:select') {
        const matching = MOCK_COMPONENTS.find(c => c.componentId === e.data.componentId);
        if (matching) {
          onSelect(matching);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [onSelect]);

  const viewportWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[viewport];

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  return (
    <div className={styles.pane}>
      {/* Top control bar */}
      <div className={styles.toolbar}>
        <div className={styles.urlBar}>
          <span className={styles.urlDot} />
          <span className={styles.urlText}>{website.previewUrl}</span>
        </div>

        {/* Viewport switchers */}
        <div className={styles.viewportControls}>
          <button
            className={`${styles.viewportBtn} ${viewport === 'desktop' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('desktop')}
          >
            🖥 Desktop
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'tablet' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('tablet')}
          >
            📱 Tablet
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'mobile' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('mobile')}
          >
            📲 Mobile
          </button>
        </div>

        {/* Toolbar actions */}
        <div className={styles.toolbarActions}>
          <button
            className={`${styles.editModeBtn} ${editMode ? styles.editModeBtnActive : ''}`}
            onClick={onToggleEditMode}
          >
            <span>{editMode ? '✦ Interactive Edit Mode' : '👁 View Mode'}</span>
          </button>

          <button
            className={styles.editModeBtn}
            onClick={handleRefresh}
            title="Reload Preview"
          >
            ↻
          </button>
        </div>
      </div>

      {/* Main preview canvas */}
      <div className={styles.stageWrapper}>
        {editMode && (
          <div className={styles.overlayBar}>
            <span className={styles.sparkle}>✦</span>
            <span className={styles.overlayText}>
              <strong>Visual Editor Active:</strong> Hover over elements to highlight • Click to prompt AI
            </span>
          </div>
        )}

        <div className={styles.viewportFrame} style={{ width: viewportWidth }}>
          <iframe
            ref={iframeRef}
            src={website.previewUrl}
            className={styles.iframe}
            title="Website Preview"
          />
        </div>
      </div>

      {/* Component quick selector bar */}
      <div className={styles.componentTray}>
        <span className={styles.trayLabel}>Detected Components:</span>
        {MOCK_COMPONENTS.map(comp => (
          <button
            key={comp.componentId}
            className={`${styles.compChip} ${selectedId === comp.componentId ? styles.compChipActive : ''}`}
            onClick={() => onSelect(comp)}
          >
            <span>{comp.label}</span>
            <span className={styles.chipTag}>&lt;{comp.tagName.toLowerCase()}&gt;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
