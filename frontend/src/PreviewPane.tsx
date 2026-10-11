import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './PreviewPane.module.css';
import type { SelectedComponent, ConnectedWebsite, CodeChange } from './types';
import type { ElementSelectedMessage } from './selection-protocol';
import { PatchworkBridge, type BridgeStatus } from './patchwork-bridge';
import { TARGET_ORIGIN as DEFAULT_TARGET_ORIGIN, TARGET_URL as DEFAULT_TARGET_URL } from './config';
import {
  fetchComponentMetadata,
  fetchEditableComponents,
  type RegistryComponentMetadata,
} from './api-client';

interface PreviewPaneProps {
  selectedId: string | null;
  onSelect: (component: SelectedComponent) => void;
  website: ConnectedWebsite | null;
  activeChange: CodeChange | null;
}

// Build the editor-side selection record from a validated runtime message
// plus trusted backend metadata. The file path stays server-side by design;
// the editor shows the registry-verified component name instead.
function toSelectedComponent(
  msg: ElementSelectedMessage,
  meta: RegistryComponentMetadata,
): SelectedComponent {
  const selector = `[data-patchwork-id="${msg.componentId}"]`;
  return {
    componentId: msg.componentId,
    label: meta.description ?? meta.componentName,
    tagName: msg.tagName,
    text: msg.text,
    sourceFile: meta.componentName,
    lineRange: msg.route,
    fingerprint: {
      tag: msg.tagName,
      selector,
      text: msg.text,
      attributes: { 'data-patchwork-id': msg.componentId },
      parentTag: '',
      parentSelector: '',
      domPath: selector,
      // Exact registry ID match (runtime + backend both enforce the allow-list),
      // not a heuristic guess.
      confidenceScore: 100,
      confidenceBreakdown: {
        text: 0,
        tagAndAttributes: 0,
        domStructure: 0,
        parentAndSibling: 0,
        nearbyContent: 0,
      },
    },
    styles: {
      color: '',
      backgroundColor: '',
      fontSize: '',
      fontWeight: '',
      padding: '',
      margin: '',
      borderRadius: '',
      display: '',
    },
  };
}

export default function PreviewPane({
  selectedId,
  onSelect,
  website,
  activeChange,
}: PreviewPaneProps) {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [bridgeStatus, setBridgeStatus] = useState<BridgeStatus>('idle');
  const [bridgeDetail, setBridgeDetail] = useState<string | undefined>(undefined);
  const [selectionMode, setSelectionMode] = useState(false);
  const [registry, setRegistry] = useState<RegistryComponentMetadata[]>([]);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [selectError, setSelectError] = useState<string | null>(null);
  const [frameKey, setFrameKey] = useState(0);
  const [showSnippetModal, setShowSnippetModal] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeRef = useRef<PatchworkBridge | null>(null);
  const editableIds = useMemo(
    () => new Set(registry.filter((c) => c.editable).map((c) => c.id)),
    [registry],
  );
  const editableIdsRef = useRef<ReadonlySet<string>>(editableIds);
  useEffect(() => {
    editableIdsRef.current = editableIds;
  }, [editableIds]);

  const viewportWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[viewport];

  const targetUrl = useMemo(() => {
    if (website?.previewUrl && website.previewUrl.startsWith('http')) {
      return website.previewUrl.endsWith('/') ? website.previewUrl : `${website.previewUrl}/`;
    }
    return DEFAULT_TARGET_URL;
  }, [website?.previewUrl]);

  const targetOrigin = useMemo(() => {
    try {
      return new URL(targetUrl).origin;
    } catch {
      return DEFAULT_TARGET_ORIGIN;
    }
  }, [targetUrl]);

  // Trusted registry list for the quick tray (backend is source of truth).
  useEffect(() => {
    const controller = new AbortController();
    fetchEditableComponents(controller.signal)
      .then((components) => {
        setRegistry(components.filter((c) => c.editable));
        setRegistryError(null);
      })
      .catch((err: unknown) => {
        setRegistry([]);
        setRegistryError(err instanceof Error ? err.message : 'Could not load the component registry.');
      });
    return () => controller.abort();
  }, []);

  const handleBridgeSelect = useCallback(
    (msg: ElementSelectedMessage) => {
      setSelectError(null);
      fetchComponentMetadata(msg.componentId)
        .then((meta) => onSelect(toSelectedComponent(msg, meta)))
        .catch((err: unknown) => {
          // The runtime only sends registered IDs, so a backend rejection here
          // means registry drift — surface it instead of selecting blindly.
          setSelectError(
            err instanceof Error
              ? `Selection rejected by the backend: ${err.message}`
              : 'Selection rejected by the backend.',
          );
        });
    },
    [onSelect],
  );

  // Attach the iframe bridge once the frame exists.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const bridge = new PatchworkBridge(iframe, targetOrigin, () => editableIdsRef.current, {
      onReady: () => undefined,
      onSelect: handleBridgeSelect,
      onStatusChange: (status, detail) => {
        setBridgeStatus(status);
        setBridgeDetail(detail);
      },
    });
    bridgeRef.current = bridge;
    bridge.attach();
    return () => {
      bridge.detach();
      bridgeRef.current = null;
    };
  }, [frameKey, handleBridgeSelect, targetOrigin]);

  const toggleSelectionMode = useCallback(() => {
    const next = !selectionMode;
    setSelectionMode(next);
    bridgeRef.current?.setSelectionMode(next);
  }, [selectionMode]);

  const handleRetry = useCallback(() => {
    // Remount the iframe for a clean handshake, then re-ping.
    setBridgeStatus('connecting');
    setBridgeDetail(undefined);
    setFrameKey((k) => k + 1);
  }, []);

  const handleTraySelect = useCallback(
    (componentId: string) => {
      setSelectError(null);
      fetchComponentMetadata(componentId)
        .then((meta) =>
          onSelect(
            toSelectedComponent(
              { type: 'PATCHWORK_ELEMENT_SELECTED', componentId, tagName: '', text: '', route: '/' },
              meta,
            ),
          ),
        )
        .catch((err: unknown) => {
          setSelectError(err instanceof Error ? err.message : 'Could not load component metadata.');
        });
    },
    [onSelect],
  );

  const statusLabel =
    bridgeStatus === 'ready'
      ? 'Connected'
      : bridgeStatus === 'connecting'
        ? 'Connecting…'
        : bridgeStatus === 'error'
          ? 'Connection issue'
          : 'Idle';

  return (
    <div className={styles.pane}>
      {/* Top Browser URL Bar & Controls */}
      <div className={styles.toolbar}>
        <div className={styles.urlBar}>
          <span className={styles.urlDot} />
          <span className={styles.urlText}>{targetUrl}</span>
        </div>

        <div className={styles.viewportControls}>
          <button
            className={`${styles.viewportBtn} ${viewport === 'desktop' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('desktop')}
            title="Desktop view"
          >
            <span>Desktop</span>
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'tablet' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('tablet')}
            title="Tablet view"
          >
            <span>Tablet</span>
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'mobile' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('mobile')}
            title="Mobile view"
          >
            <span>Mobile</span>
          </button>
        </div>

        {/* Selection mode toggle (runtime opt-in protocol) */}
        <button
          className={`${styles.toolBtn} ${selectionMode ? styles.toolBtnActive : ''}`}
          onClick={toggleSelectionMode}
          title="Enable click-to-select inside the embedded website"
        >
          {selectionMode ? 'Selecting: On' : 'Select Element'}
        </button>

        {/* Live Snippet / Integration Tag button */}
        <button
          className={styles.toolBtn}
          onClick={() => setShowSnippetModal(true)}
          title="View the script tag for deployed production websites"
        >
          &lt;/&gt; Script Tag
        </button>

        <div className={styles.branchPill} title={bridgeDetail ?? `Target origin: ${targetOrigin}`}>
          <span className={styles.branchMain}>
            {statusLabel} • <strong>{website?.branch ?? 'main'}</strong>
          </span>
        </div>
      </div>

      {/* Guide Banner */}
      <div className={styles.instructionBanner}>
        <span>EDITOR</span>
        {bridgeStatus === 'error' ? (
          <span>
            {bridgeDetail ?? 'Website connection failed.'}{' '}
            <button type="button" className={styles.toolBtn} onClick={handleRetry}>
              Retry connection
            </button>
          </span>
        ) : selectionMode ? (
          <span>Selection mode is on — click a highlighted element inside the website to select it.</span>
        ) : (
          <span>Turn on “Select Element”, then click an element inside the embedded website.</span>
        )}
        {selectError && <span className={styles.mutatedAlert}>{selectError}</span>}
      </div>

      {/* Live website stage */}
      <div className={styles.stage}>
        <div className={styles.viewportFrame} style={{ width: viewportWidth }}>
          <iframe
            key={frameKey}
            ref={iframeRef}
            title="Instrumented target website"
            src={targetUrl}
            className={styles.siteFrame}
          />
        </div>
      </div>

      {/* Registry-backed quick selector */}
      <div className={styles.quickTray}>
        <span className={styles.trayLabel}>Elements:</span>
        {registryError ? (
          <span className={styles.trayLabel}>{registryError}</span>
        ) : (
          registry.map((c) => (
            <button
              key={c.id}
              className={`${styles.trayChip} ${selectedId === c.id ? styles.trayChipActive : ''}`}
              onClick={() => handleTraySelect(c.id)}
              title={c.description ?? c.componentName}
            >
              <span>{c.description ?? c.componentName}</span>
              <span className={styles.chipTag}>{c.id}</span>
            </button>
          ))
        )}
        {activeChange && (
          <span className={styles.trayLabel}>
            Proposal: {activeChange.simulated ? 'SIMULATED' : activeChange.provider} • target unchanged
          </span>
        )}
      </div>

      {/* Production Integration / Runtime Script Snippet Modal */}
      {showSnippetModal && (
        <div className={styles.embedSnippetModal} onClick={() => setShowSnippetModal(false)}>
          <div className={styles.embedSnippetCard} onClick={(e) => e.stopPropagation()}>
            <div className={styles.embedSnippetTitle}>
              <span>⚡ Live Deployed Website Integration</span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              To make changes to an actual deployed website without full rebuilds or redeploys, paste this lightweight Patchwork script tag into your website's <code>&lt;head&gt;</code>:
            </p>

            <pre className={styles.embedSnippetCode}>
              {`<script\n  src="http://localhost:4000/api/runtime/patchwork.js"\n  data-patchwork-site="${website?.id ?? 'default'}"\n  data-parent-origin="http://localhost:5173"\n  async>\n</script>`}
            </pre>

            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Once embedded on your live production site (e.g. Vercel, Netlify, or custom domain):
              <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                <li>Visual clicks and element selections in this editor immediately link to your live DOM.</li>
                <li>Published releases deliver instant client-side fixes and patches directly to your live visitors.</li>
                <li>No manual rebuild or wait time for CI/CD pipelines.</li>
              </ul>
            </div>

            <div className={styles.embedSnippetActions}>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => {
                  navigator.clipboard.writeText(`<script src="http://localhost:4000/api/runtime/patchwork.js" data-patchwork-site="${website?.id ?? 'default'}" data-parent-origin="http://localhost:5173" async></script>`);
                  setCopiedSnippet(true);
                  setTimeout(() => setCopiedSnippet(false), 2000);
                }}
              >
                {copiedSnippet ? '✓ Copied Script Tag!' : 'Copy Script Tag'}
              </button>
              <button
                type="button"
                className={styles.toolBtn}
                onClick={() => setShowSnippetModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
