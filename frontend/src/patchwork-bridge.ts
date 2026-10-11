import {
  buildPingMessage,
  buildSelectionModeMessage,
  validateSelectionMessage,
  type ElementSelectedMessage,
} from './selection-protocol';

// Framework-agnostic bridge between the PATCHWORK editor and the embedded
// instrumented website (Phase 2). Owns exactly one iframe relationship:
//   - sends PATCHWORK_SET_SELECTION_MODE / PATCHWORK_PING with the explicit
//     configured target origin (never "*")
//   - accepts messages only when event.origin exactly matches that origin
//     AND event.source === iframe.contentWindow
//   - shape-checks payloads and accepts only editable registry IDs
//     (the backend re-validates every ID server-side before resolving)
// Ordinary site clicks/navigation are untouched while selection mode is off:
// enabling/disabling is solely the runtime's opt-in protocol, and this
// bridge never injects scripts or styles into the site.

export type BridgeStatus = 'idle' | 'connecting' | 'ready' | 'error';

export interface BridgeCallbacks {
  onReady: (route: string) => void;
  onSelect: (message: ElementSelectedMessage) => void;
  onStatusChange: (status: BridgeStatus, detail?: string) => void;
}

const HANDSHAKE_TIMEOUT_MS = 10_000;

export class PatchworkBridge {
  private readonly iframe: HTMLIFrameElement;
  private readonly targetOrigin: string;
  private readonly getEditableIds: () => ReadonlySet<string>;
  private readonly callbacks: BridgeCallbacks;
  private selectionMode = false;
  private handshakeTimer: ReturnType<typeof setTimeout> | null = null;
  private attached = false;

  private readonly handleMessage = (event: MessageEvent): void => {
    const iframeWindow = this.iframe.contentWindow;
    const result = validateSelectionMessage(
      { origin: event.origin, source: event.source, data: event.data },
      {
        expectedOrigin: this.targetOrigin,
        isExpectedSource: iframeWindow != null && event.source === iframeWindow,
        editableIds: this.getEditableIds(),
      },
    );
    if (!result.ok) return; // ignore foreign/malformed/unregistered traffic
    if (result.kind === 'ready') {
      this.markReady();
      this.callbacks.onStatusChange('ready');
      this.callbacks.onReady(result.route);
      // Re-assert the current mode in case the site (re)loaded mid-session.
      if (this.selectionMode) this.sendSelectionMode(true);
    } else {
      this.callbacks.onSelect(result.message);
    }
  };

  private readonly handleLoad = (): void => {
    this.ping();
  };

  private readonly handleFrameError = (): void => {
    this.callbacks.onStatusChange('error', 'The website iframe failed to load. Check that the target site is running.');
  };

  constructor(
    iframe: HTMLIFrameElement,
    targetOrigin: string,
    getEditableIds: () => ReadonlySet<string>,
    callbacks: BridgeCallbacks,
  ) {
    this.iframe = iframe;
    this.targetOrigin = targetOrigin;
    this.getEditableIds = getEditableIds;
    this.callbacks = callbacks;
  }

  attach(): void {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener('message', this.handleMessage);
    this.iframe.addEventListener('load', this.handleLoad);
    this.iframe.addEventListener('error', this.handleFrameError);
    this.callbacks.onStatusChange('connecting');
    this.armHandshakeTimer();
  }

  detach(): void {
    this.attached = false;
    window.removeEventListener('message', this.handleMessage);
    this.iframe.removeEventListener('load', this.handleLoad);
    this.iframe.removeEventListener('error', this.handleFrameError);
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = null;
  }

  /** Re-send the handshake ping (used by the UI retry control). */
  ping(): void {
    this.send(buildPingMessage());
    this.armHandshakeTimer();
  }

  setSelectionMode(enabled: boolean): void {
    this.selectionMode = enabled;
    this.sendSelectionMode(enabled);
  }

  getSelectionMode(): boolean {
    return this.selectionMode;
  }

  private sendSelectionMode(enabled: boolean): void {
    this.send(buildSelectionModeMessage(enabled));
  }

  private send(message: unknown): void {
    const target = this.iframe.contentWindow;
    if (!target) {
      this.callbacks.onStatusChange('error', 'Website iframe is not available yet.');
      return;
    }
    try {
      // Explicit target origin — never "*".
      target.postMessage(message, this.targetOrigin);
    } catch {
      this.callbacks.onStatusChange('error', 'Could not message the website iframe. Is the target origin correct?');
    }
  }

  private armHandshakeTimer(): void {
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = setTimeout(() => {
      this.callbacks.onStatusChange(
        'error',
        'No handshake from the website (PATCHWORK_READY not received). Verify the target origin matches and selection runtime is enabled.',
      );
    }, HANDSHAKE_TIMEOUT_MS);
  }

  /** Clears a pending handshake timeout once READY arrives. */
  markReady(): void {
    if (this.handshakeTimer) clearTimeout(this.handshakeTimer);
    this.handshakeTimer = null;
  }
}
