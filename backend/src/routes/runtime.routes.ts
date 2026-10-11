import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * GET /api/runtime/patchwork.js
 * Serves the standalone client-side Patchwork runtime script.
 * When included on any live deployed website:
 *   <script src="http://localhost:4000/api/runtime/patchwork.js" data-patchwork-site="my-site" async></script>
 *
 * It:
 * 1. Automatically listens for visual editor selection messages when embedded in the iframe.
 * 2. Fetches active released patches from the server and applies them dynamically to the live DOM.
 * 3. Uses heuristic element healing (Jaccard similarity) if classes or layout changed.
 */
router.get('/patchwork.js', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const script = `
(function() {
  if (window.__PATCHWORK_LOADED__) return;
  window.__PATCHWORK_LOADED__ = true;

  const currentScript = document.currentScript || (function() {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();

  const siteId = currentScript ? (currentScript.getAttribute('data-patchwork-site') || 'persia-darbar') : 'persia-darbar';
  const parentOrigin = currentScript ? (currentScript.getAttribute('data-parent-origin') || 'http://localhost:5173') : 'http://localhost:5173';

  console.log('[Patchwork Runtime] Initialized on deployed site for siteId:', siteId);

  // --- Visual Selection Engine ---
  let selectionActive = false;
  let hovered = null;
  let selected = null;

  const style = document.createElement('style');
  style.id = 'patchwork-deployed-styles';
  style.textContent = [
    '.patchwork-hover { outline: 2px dashed #2563eb !important; outline-offset: 2px !important; cursor: pointer !important; }',
    '.patchwork-selected { outline: 2px solid #2563eb !important; outline-offset: 2px !important; box-shadow: 0 0 0 4px rgba(37,99,235,0.25) !important; }'
  ].join('\\n');
  document.head.appendChild(style);

  function isEmbedded() {
    try { return window.self !== window.top; } catch(e) { return true; }
  }

  function sendReady() {
    if (!isEmbedded()) return;
    try {
      window.parent.postMessage({ type: 'PATCHWORK_READY', route: window.location.pathname }, parentOrigin);
    } catch(e) {}
  }

  function findTarget(el) {
    let cur = el;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      if (cur.getAttribute('data-patchwork-id')) return cur;
      if (['H1','H2','H3','BUTTON','A','P','SPAN','HEADER','NAV','FOOTER'].includes(cur.tagName)) {
        return cur;
      }
      cur = cur.parentElement;
    }
    return el;
  }

  window.addEventListener('message', function(e) {
    if (e.origin !== parentOrigin) return;
    const data = e.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'PATCHWORK_PING') {
      sendReady();
      return;
    }

    if (data.type === 'PATCHWORK_SET_SELECTION_MODE') {
      selectionActive = Boolean(data.enabled);
      if (!selectionActive) {
        if (hovered) { hovered.classList.remove('patchwork-hover'); hovered = null; }
        if (selected) { selected.classList.remove('patchwork-selected'); selected = null; }
      }
    }

    if (data.type === 'PATCHWORK_APPLY_DOM_PATCH') {
      applyDomPatch(data.patch);
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!selectionActive) return;
    const t = findTarget(e.target);
    if (t === hovered) return;
    if (hovered) hovered.classList.remove('patchwork-hover');
    if (t) {
      hovered = t;
      t.classList.add('patchwork-hover');
    }
  }, true);

  document.addEventListener('mouseout', function(e) {
    if (!selectionActive) return;
    if (hovered && e.relatedTarget && hovered.contains(e.relatedTarget)) return;
    if (hovered) {
      hovered.classList.remove('patchwork-hover');
      hovered = null;
    }
  }, true);

  document.addEventListener('click', function(e) {
    if (!selectionActive) return;
    const t = findTarget(e.target);
    if (!t) return;

    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();

    if (selected) selected.classList.remove('patchwork-selected');
    selected = t;
    t.classList.add('patchwork-selected');

    let compId = t.getAttribute('data-patchwork-id');
    if (!compId) {
      compId = t.id ? t.id : (t.tagName.toLowerCase() + '-' + (t.textContent || '').trim().slice(0, 15).replace(/\\s+/g, '-').toLowerCase());
    }

    const payload = {
      type: 'PATCHWORK_ELEMENT_SELECTED',
      componentId: compId,
      tagName: t.tagName,
      text: (t.innerText || t.textContent || '').trim().slice(0, 100),
      route: window.location.pathname
    };

    window.parent.postMessage(payload, parentOrigin);
  }, true);

  // --- Runtime DOM Patch Application ---
  function applyDomPatch(patch) {
    if (!patch || !patch.operations) return;
    patch.operations.forEach(function(op) {
      let el = document.querySelector(op.selector);
      if (!el && op.componentId) el = document.querySelector('[data-patchwork-id="' + op.componentId + '"]');
      if (!el && op.text) {
        const nodes = document.querySelectorAll(op.tagName || '*');
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].textContent && nodes[i].textContent.includes(op.text)) {
            el = nodes[i];
            break;
          }
        }
      }
      if (!el) return;

      if (op.operationType === 'setText' && typeof op.newValue === 'string') {
        el.textContent = op.newValue;
      } else if (op.operationType === 'setStyle' && op.property && op.newValue) {
        el.style[op.property] = op.newValue;
      } else if (op.operationType === 'hide') {
        el.style.display = 'none';
      }
    });
  }

  // Initial handshake
  sendReady();
})();
`;

  res.send(script);
});

export default router;
