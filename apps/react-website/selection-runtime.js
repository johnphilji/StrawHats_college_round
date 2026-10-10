/**
 * PATCHWORK selection runtime.
 *
 * Disabled by default — the site behaves exactly as before until an
 * authorized PATCHWORK parent enables selection mode via postMessage.
 *
 * Message contract:
 *   parent -> site : { type: "PATCHWORK_SET_SELECTION_MODE", enabled: bool }
 *   parent -> site : { type: "PATCHWORK_PING" } (handshake, optional)
 *   site -> parent : { type: "PATCHWORK_READY", route }
 *   site -> parent : { type: "PATCHWORK_ELEMENT_SELECTED",
 *                      componentId, tagName, text, route }
 *
 * Security: event.origin is validated against VITE_PATCHWORK_PARENT_ORIGIN
 * (comma-separated allow-list), event.source must be window.parent, payloads
 * are shape-checked, and outbound messages use the exact configured origin
 * (never "*"). Only IDs present in the registry's editable set are
 * selectable; clicks on them are intercepted in the capture phase so the
 * site's normal navigation / form / modal behaviour never fires.
 */

import { patchworkComponentRegistry } from "./component-registry.js";

const STYLE_ELEMENT_ID = "patchwork-selection-styles";
const HOVER_CLASS = "patchwork-hover";
const SELECTED_CLASS = "patchwork-selected";
const SELECTION_MODE_ATTR = "data-patchwork-selection-mode";
const MAX_TEXT_LENGTH = 200;

const editableIds = new Set(
  patchworkComponentRegistry.filter((entry) => entry.editable).map((e) => e.id),
);

let enabled = false;
let destroyed = false;
let styleElement = null;
let hoveredElement = null;
let selectedElement = null;
let messageHandler = null;
let mouseOverHandler = null;
let mouseOutHandler = null;
let clickHandler = null;
let submitHandler = null;

/** Parse the allow-listed parent origin(s) from env. */
function getAllowedOrigins() {
  const raw =
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_PATCHWORK_PARENT_ORIGIN) ||
    "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** True when running embedded inside an iframe. */
function isEmbedded() {
  try {
    return typeof window !== "undefined" && window.parent !== window;
  } catch {
    return false;
  }
}

/** Current page route label (SPA: pathname + hash). */
function currentRoute() {
  try {
    const hash = window.location.hash || "";
    return `${window.location.pathname}${hash}`;
  } catch {
    return "/";
  }
}

/** Nearest ancestor-or-self carrying a registered editable patchwork ID. */
function findSelectableTarget(node) {
  if (!(node instanceof Element)) return null;
  const closest = node.closest("[data-patchwork-id]");
  if (!closest) return null;
  const id = closest.getAttribute("data-patchwork-id");
  if (!id || !editableIds.has(id)) return null;
  return closest;
}

function ensureStyles() {
  if (styleElement || !document.head) return;
  styleElement = document.createElement("style");
  styleElement.id = STYLE_ELEMENT_ID;
  // Outline (not border/margin) so highlighting never shifts page layout.
  styleElement.textContent = `
    [${SELECTION_MODE_ATTR}="on"] [data-patchwork-id] { cursor: pointer; }
    .${HOVER_CLASS} { outline: 2px dashed #d4a017 !important; outline-offset: 3px !important; }
    .${SELECTED_CLASS} { outline: 3px solid #d4a017 !important; outline-offset: 3px !important; }
  `;
  document.head.appendChild(styleElement);
}

function removeStyles() {
  if (styleElement && styleElement.parentNode) {
    styleElement.parentNode.removeChild(styleElement);
  }
  styleElement = null;
}

function clearHover() {
  if (hoveredElement) {
    hoveredElement.classList.remove(HOVER_CLASS);
    hoveredElement = null;
  }
}

function clearSelection() {
  if (selectedElement) {
    selectedElement.classList.remove(SELECTED_CLASS);
    selectedElement = null;
  }
}

/** Send the selected ID + minimal metadata to the authorized parent. */
function reportSelection(element) {
  const componentId = element.getAttribute("data-patchwork-id");
  if (!componentId) return;
  const allowed = getAllowedOrigins();
  if (allowed.length === 0) return;
  const tagName = element.tagName || "UNKNOWN";
  const text = (element.innerText || element.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
  const message = {
    type: "PATCHWORK_ELEMENT_SELECTED",
    componentId,
    tagName,
    text,
    route: currentRoute(),
  };
  for (const origin of allowed) {
    try {
      window.parent.postMessage(message, origin);
    } catch {
      // Ignore unreachable origins; keep trying the rest of the allow-list.
    }
  }
}

/** Announce readiness so the parent knows selection mode is available. */
function sendReady() {
  const allowed = getAllowedOrigins();
  if (!isEmbedded() || allowed.length === 0) return;
  const message = { type: "PATCHWORK_READY", route: currentRoute() };
  for (const origin of allowed) {
    try {
      window.parent.postMessage(message, origin);
    } catch {
      // Ignore unreachable origins.
    }
  }
}

function enableSelectionMode() {
  if (enabled) return;
  enabled = true;
  ensureStyles();
  try {
    document.documentElement.setAttribute(SELECTION_MODE_ATTR, "on");
  } catch {
    // Non-fatal: highlighting still works without the attribute.
  }
}

function disableSelectionMode() {
  if (!enabled) return;
  enabled = false;
  clearHover();
  clearSelection();
  try {
    document.documentElement.removeAttribute(SELECTION_MODE_ATTR);
  } catch {
    // Non-fatal.
  }
}

function isValidSelectionCommand(data) {
  return (
    data &&
    typeof data === "object" &&
    data.type === "PATCHWORK_SET_SELECTION_MODE" &&
    typeof data.enabled === "boolean"
  );
}

function attachListeners() {
  messageHandler = (event) => {
    // 1) Only accept messages from the embedding parent window.
    if (event.source !== window.parent) return;
    // 2) Origin must be on the configured allow-list (exact match).
    const allowed = getAllowedOrigins();
    if (allowed.length === 0 || !allowed.includes(event.origin)) return;
    const data = event.data;
    if (!data || typeof data !== "object") return;
    // 3) Optional handshake: parent pings, site answers with READY.
    if (data.type === "PATCHWORK_PING") {
      sendReady();
      return;
    }
    // 4) Only valid selection-mode commands take effect.
    if (!isValidSelectionCommand(data)) return;
    if (data.enabled) enableSelectionMode();
    else disableSelectionMode();
  };
  window.addEventListener("message", messageHandler);

  // Hover highlight via delegation (no per-element listeners).
  mouseOverHandler = (event) => {
    if (!enabled) return;
    const target = findSelectableTarget(event.target);
    if (target === hoveredElement) return;
    clearHover();
    if (target) {
      hoveredElement = target;
      target.classList.add(HOVER_CLASS);
    }
  };
  mouseOutHandler = (event) => {
    if (!enabled) return;
    // Only clear when the pointer truly leaves the highlighted element.
    if (
      hoveredElement &&
      event.relatedTarget instanceof Node &&
      hoveredElement.contains(event.relatedTarget)
    ) {
      return;
    }
    clearHover();
  };
  document.addEventListener("mouseover", mouseOverHandler);
  document.addEventListener("mouseout", mouseOutHandler);

  // Capture-phase click interception: selecting must never trigger the
  // element's normal action (navigation, form submit, modal, booking, ...).
  // Only clicks on registered editable targets are intercepted.
  clickHandler = (event) => {
    if (!enabled) return;
    const target = findSelectableTarget(event.target);
    if (!target) return; // Non-editable clicks behave normally.
    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") {
      event.stopImmediatePropagation();
    }
    clearSelection();
    selectedElement = target;
    target.classList.add(SELECTED_CLASS);
    reportSelection(target);
  };
  document.addEventListener("click", clickHandler, true);

  // Keyboard-initiated submits (Enter inside the form) bypass click
  // interception, so guard submits whose submitter is a registered target.
  submitHandler = (event) => {
    if (!enabled) return;
    const submitter = event.submitter;
    if (submitter && findSelectableTarget(submitter)) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
  document.addEventListener("submit", submitHandler, true);
}

function detachListeners() {
  if (messageHandler) window.removeEventListener("message", messageHandler);
  if (mouseOverHandler)
    document.removeEventListener("mouseover", mouseOverHandler);
  if (mouseOutHandler) document.removeEventListener("mouseout", mouseOutHandler);
  if (clickHandler) document.removeEventListener("click", clickHandler, true);
  if (submitHandler)
    document.removeEventListener("submit", submitHandler, true);
  messageHandler = mouseOverHandler = mouseOutHandler = null;
  clickHandler = submitHandler = null;
}

/**
 * Initialise the PATCHWORK selection runtime. Safe to call once; further
 * calls are no-ops. Normal site behaviour is untouched (runtime starts
 * disabled) and cleanup removes all listeners/styles without residue.
 */
export function initPatchworkSelection() {
  if (destroyed) return;
  if (messageHandler) return; // Already initialised.
  attachListeners();
  // Handshake: let an authorized, embedding parent know we're ready.
  sendReady();
}

/** Tear down listeners, styles, and selection state (for HMR / unmount). */
export function destroyPatchworkSelection() {
  disableSelectionMode();
  detachListeners();
  removeStyles();
  destroyed = true;
}

/** Test/introspection helper: whether selection mode is currently on. */
export function isPatchworkSelectionEnabled() {
  return enabled;
}
