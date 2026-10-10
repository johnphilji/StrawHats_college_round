import { captureFingerprint } from './heal.js';
import { applyOperations } from './dom.js';

let hoveredEl: HTMLElement | null = null;
let selectedEl: HTMLElement | null = null;
let outlineEl: HTMLElement | null = null;
let selectedOutlineEl: HTMLElement | null = null;

// Store original values so we can undo
const originalValues = new Map<string, { text: string, styles: Record<string, string> }>();

export function initEditorBridge(siteId: string) {
  const DASHBOARD_ORIGIN = 'http://localhost:5173';

  // Create highlight outline
  outlineEl = document.createElement('div');
  outlineEl.style.position = 'fixed';
  outlineEl.style.pointerEvents = 'none';
  outlineEl.style.border = '2px dashed #6366f1';
  outlineEl.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
  outlineEl.style.zIndex = '999998';
  outlineEl.style.display = 'none';
  document.body.appendChild(outlineEl);

  // Create selected outline
  selectedOutlineEl = document.createElement('div');
  selectedOutlineEl.style.position = 'fixed';
  selectedOutlineEl.style.pointerEvents = 'none';
  selectedOutlineEl.style.border = '2px solid #4f46e5';
  selectedOutlineEl.style.backgroundColor = 'rgba(79, 70, 229, 0.2)';
  selectedOutlineEl.style.zIndex = '999999';
  selectedOutlineEl.style.display = 'none';
  document.body.appendChild(selectedOutlineEl);

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target === outlineEl || target === selectedOutlineEl || target.tagName === 'BODY' || target.tagName === 'HTML') return;
    hoveredEl = target;
    const rect = target.getBoundingClientRect();
    outlineEl!.style.display = 'block';
    outlineEl!.style.top = rect.top + 'px';
    outlineEl!.style.left = rect.left + 'px';
    outlineEl!.style.width = rect.width + 'px';
    outlineEl!.style.height = rect.height + 'px';
  });

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (!hoveredEl) return;
    e.preventDefault();
    e.stopPropagation();

    selectedEl = target;
    const rect = target.getBoundingClientRect();
    selectedOutlineEl!.style.display = 'block';
    selectedOutlineEl!.style.top = rect.top + 'px';
    selectedOutlineEl!.style.left = rect.left + 'px';
    selectedOutlineEl!.style.width = rect.width + 'px';
    selectedOutlineEl!.style.height = rect.height + 'px';

    // Save original state if not saved
    if (!originalValues.has(target.outerHTML)) {
       originalValues.set(target.outerHTML, {
         text: target.textContent || '',
         styles: {
           color: target.style.color,
           backgroundColor: target.style.backgroundColor
         }
       });
    }

    // Compute minimal selector
    let selector = target.tagName.toLowerCase();
    if (target.id) {
      selector = '#' + target.id;
    } else if (target.className && typeof target.className === 'string') {
      const classes = target.className.split(' ').filter(c => c.trim().length > 0).join('.');
      if (classes) selector += '.' + classes;
    }

    const fp = captureFingerprint(target);
    const fingerprintString = JSON.stringify(fp);

    // Send to dashboard
    window.parent.postMessage({
      type: 'ELEMENT_SELECTED',
      payload: {
        selector,
        fingerprint: fingerprintString,
        tag: target.tagName,
        textContent: target.textContent?.trim().substring(0, 50),
        computedStyles: {
          color: window.getComputedStyle(target).color,
          backgroundColor: window.getComputedStyle(target).backgroundColor,
        }
      }
    }, DASHBOARD_ORIGIN);
  }, true);

  window.addEventListener('message', (e) => {
    if (e.origin !== DASHBOARD_ORIGIN) return;
    
    if (e.data.type === 'PREVIEW_OPS') {
       const ops = e.data.payload.operations;
       
       // First, reset all elements we know about to their original state to support Undo
       if (selectedEl) {
          const original = originalValues.get(selectedEl.outerHTML);
          if (original) {
             selectedEl.textContent = original.text;
             selectedEl.style.color = original.styles.color;
             selectedEl.style.backgroundColor = original.styles.backgroundColor;
          }
       }

       // Mock apply
       ops.forEach((op: any) => {
          const el = document.querySelector(op.selector) as HTMLElement;
          if (el) {
            if (op.operationType === 'setText') el.textContent = op.newValue;
            else if (op.operationType === 'setStyle') (el.style as any)[op.property] = op.newValue;
          }
       });
    }
  });

  // Notify parent we are ready
  window.parent.postMessage({ type: 'RUNTIME_READY' }, DASHBOARD_ORIGIN);
}
