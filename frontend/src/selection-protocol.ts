// PATCHWORK iframe selection protocol (Phase 2).
//
// Pure, DOM-free validators mirroring the contract implemented by the
// instrumented website's selection runtime
// (`apps/react-website/selection-runtime.js`):
//   parent -> site : { type: "PATCHWORK_SET_SELECTION_MODE", enabled: bool }
//   parent -> site : { type: "PATCHWORK_PING" }
//   site -> parent : { type: "PATCHWORK_READY", route }
//   site -> parent : { type: "PATCHWORK_ELEMENT_SELECTED",
//                      componentId, tagName, text, route }
//
// Kept free of DOM types so the logic is unit-testable with node --test
// (see selection-protocol.test.ts). The iframe bridge
// (patchwork-bridge.ts) supplies `isExpectedSource` from
// `event.source === iframe.contentWindow`.

export const SELECTION_MODE_TYPE = 'PATCHWORK_SET_SELECTION_MODE';
export const PING_TYPE = 'PATCHWORK_PING';
export const READY_TYPE = 'PATCHWORK_READY';
export const ELEMENT_SELECTED_TYPE = 'PATCHWORK_ELEMENT_SELECTED';

export interface SelectionModeCommand {
  type: typeof SELECTION_MODE_TYPE;
  enabled: boolean;
}

export interface ElementSelectedMessage {
  type: typeof ELEMENT_SELECTED_TYPE;
  componentId: string;
  tagName: string;
  text: string;
  route: string;
}

export interface ReadyMessage {
  type: typeof READY_TYPE;
  route: string;
}

export type SelectionValidationResult =
  | { ok: true; kind: 'ready'; route: string }
  | { ok: true; kind: 'selected'; message: ElementSelectedMessage }
  | { ok: false; reason: string };

export function buildSelectionModeMessage(enabled: boolean): SelectionModeCommand {
  return { type: SELECTION_MODE_TYPE, enabled };
}

export function buildPingMessage(): { type: typeof PING_TYPE } {
  return { type: PING_TYPE };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

type SelectedPayload = Record<string, unknown> & ElementSelectedMessage;

function isValidSelectedPayload(data: Record<string, unknown>): data is SelectedPayload {
  return (
    data['type'] === ELEMENT_SELECTED_TYPE &&
    typeof data['componentId'] === 'string' &&
    (data['componentId'] as string).trim().length > 0 &&
    typeof data['tagName'] === 'string' &&
    typeof data['text'] === 'string' &&
    typeof data['route'] === 'string'
  );
}

/**
 * Validate an incoming window message purportedly from the embedded site.
 * Every check must pass; anything else is ignored without crashing.
 */
export function validateSelectionMessage(
  event: { origin: string; source: unknown; data: unknown },
  expected: { expectedOrigin: string; isExpectedSource: boolean; editableIds: ReadonlySet<string> },
): SelectionValidationResult {
  if (!expected.isExpectedSource) return { ok: false, reason: 'unexpected-message-source' };
  if (event.origin !== expected.expectedOrigin) return { ok: false, reason: 'unexpected-origin' };
  if (!isRecord(event.data)) return { ok: false, reason: 'malformed-payload' };

  if (event.data['type'] === READY_TYPE) {
    const route = event.data['route'];
    return { ok: true, kind: 'ready', route: typeof route === 'string' ? route : '/' };
  }

  if (!isValidSelectedPayload(event.data)) return { ok: false, reason: 'malformed-payload' };
  const componentId = (event.data['componentId'] as string).trim();
  if (!expected.editableIds.has(componentId)) return { ok: false, reason: 'unregistered-component' };
  return {
    ok: true,
    kind: 'selected',
    message: {
      type: ELEMENT_SELECTED_TYPE,
      componentId,
      tagName: event.data['tagName'] as string,
      text: event.data['text'] as string,
      route: event.data['route'] as string,
    },
  };
}
