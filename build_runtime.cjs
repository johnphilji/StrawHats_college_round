const fs = require('fs');
const path = require('path');

const write = (p, content) => {
  const fullPath = path.join(__dirname, p);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content.trim());
};

write('packages/runtime/package.json', \`
{
  "name": "@patchwork/runtime",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --minify --format=iife --outfile=../../apps/server/public/pw.js",
    "dev": "esbuild src/index.ts --bundle --format=iife --outfile=../../apps/server/public/pw.js --watch",
    "test": "vitest run"
  },
  "devDependencies": {
    "esbuild": "^0.20.2",
    "typescript": "^5.0.0",
    "vitest": "^2.1.1",
    "jsdom": "^25.0.1"
  }
}
\`);

write('packages/runtime/tsconfig.json', \`
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["DOM", "DOM.Iterable", "ESNext"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
\`);

write('packages/runtime/src/index.ts', \`
import { initEditorBridge } from './editorBridge.js';
import { applyOperations } from './dom.js';

(async () => {
  // 1. Identify site ID from script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-site]');
  if (!scriptTag) return;
  const siteId = scriptTag.getAttribute('data-site');
  if (!siteId) return;

  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('pw_edit') === '1' && window.parent !== window;
  const previewReleaseId = urlParams.get('pw_release');

  // If in edit mode, initialize the bridge and stop auto-fetching releases
  if (isEditMode) {
    initEditorBridge(siteId);
    return;
  }

  // 2. Fetch Release
  let endpoint = \`http://localhost:4001/api/sites/\${siteId}/release/active.json\`;
  if (previewReleaseId) {
    endpoint = \`http://localhost:4001/api/sites/\${siteId}/release/\${previewReleaseId}.json\`;
  }

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const data = await res.json();
    if (data.operations && data.operations.length > 0) {
      // 3. Apply operations with healing
      applyOperations(siteId, data.operations);
    }
  } catch (e) {
    // Fail silently in production
  }
})();
\`);

write('packages/runtime/src/dom.ts', \`
import { healElement } from './heal.js';

export function applyOperations(siteId: string, operations: any[]) {
  // Group by targetFingerprint/selector to minimize healing passes
  const grouped = new Map<string, any[]>();
  for (const op of operations) {
    const key = op.selector + '|' + op.targetFingerprint;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(op);
  }

  for (const [key, ops] of grouped.entries()) {
    const firstOp = ops[0];
    
    // Attempt standard selection
    let target = document.querySelector(firstOp.selector) as HTMLElement | null;
    let newSelector: string | undefined;
    let confidence = 1.0;
    let status = 'applied';

    // Verification check - if not found or ambiguous (multiple matches)
    const matches = document.querySelectorAll(firstOp.selector);
    if (!target || matches.length > 1) {
      // HEAL
      const result = healElement(firstOp.targetFingerprint);
      if (result.score >= 0.75) {
        target = result.element as HTMLElement;
        status = 'healed';
        confidence = result.score;
        newSelector = result.newSelector;
      } else if (result.score >= 0.55) {
        target = result.element as HTMLElement;
        status = 'healed_pending';
        confidence = result.score;
        newSelector = result.newSelector;
      } else {
        status = 'broken';
        confidence = result.score;
        target = null;
      }
    }

    // Apply ops if target found
    if (target) {
      for (const op of ops) {
        safeApply(target, op);
      }
    }

    // Report Telemetry for the first operation in the patch (assuming one patch per group for simplicity)
    const patchId = firstOp.patchId || (firstOp.id ? firstOp.id.split('_')[0] : 'UNKNOWN');
    sendTelemetry(siteId, {
      patchId,
      status: status as any,
      confidence,
      newSelector,
      timestamp: new Date().toISOString()
    });
  }
}

function safeApply(el: HTMLElement, op: any) {
  if (op.operationType === 'setText') {
    el.textContent = op.newValue;
  } else if (op.operationType === 'hide') {
    el.style.display = 'none';
  } else if (op.operationType === 'setStyle' && op.property) {
    const allowedStyles = ['color', 'backgroundColor', 'fontSize', 'fontWeight', 'padding', 'margin', 'borderRadius', 'display', 'visibility', 'opacity', 'width', 'height'];
    if (allowedStyles.includes(op.property)) {
      const val = op.newValue.toString().toLowerCase();
      if (!val.includes('url(') && !val.includes('expression') && !val.includes('javascript:') && !val.includes(';')) {
        (el.style as any)[op.property] = op.newValue;
      }
    }
  } else if (op.operationType === 'setAttribute' && op.property) {
    const allowedAttrs = ['href', 'title', 'alt', 'aria-label', 'placeholder', 'disabled', 'src'];
    if (allowedAttrs.includes(op.property) && !op.property.startsWith('on')) {
      const val = op.newValue.toString().toLowerCase();
      if (!val.startsWith('javascript:') && !val.startsWith('data:text/html')) {
        el.setAttribute(op.property, op.newValue);
      }
    }
  }
}

function sendTelemetry(siteId: string, data: any) {
  try {
    const payload = JSON.stringify(data);
    if (navigator.sendBeacon) {
      navigator.sendBeacon(\`http://localhost:4001/api/sites/\${siteId}/telemetry\`, payload);
    } else {
      fetch(\`http://localhost:4001/api/sites/\${siteId}/telemetry\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    }
  } catch(e) {}
}
\`);

write('packages/runtime/src/editorBridge.ts', \`
import { captureFingerprint } from './heal.js';
import { applyOperations } from './dom.js';

let hoveredEl: HTMLElement | null = null;
let outlineEl: HTMLElement | null = null;

export function initEditorBridge(siteId: string) {
  const DASHBOARD_ORIGIN = 'http://localhost:5173';

  // Create highlight outline
  outlineEl = document.createElement('div');
  outlineEl.style.position = 'fixed';
  outlineEl.style.pointerEvents = 'none';
  outlineEl.style.border = '2px solid #6366f1';
  outlineEl.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
  outlineEl.style.zIndex = '999999';
  outlineEl.style.display = 'none';
  document.body.appendChild(outlineEl);

  document.addEventListener('mouseover', (e) => {
    const target = e.target as HTMLElement;
    if (target === outlineEl || target.tagName === 'BODY' || target.tagName === 'HTML') return;
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
       // Re-apply preview operations
       // We should ideally reset first, but for the hackathon prototype applying directly is fine
       const ops = e.data.payload.operations;
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
\`);

write('packages/runtime/src/heal.ts', \`
export interface Fingerprint {
  tag: string;
  text: string;
  id: string;
  classes: string[];
  attributes: Record<string, string>;
  ancestors: string[];
  siblingText: string;
  index: number;
}

export function captureFingerprint(el: HTMLElement): Fingerprint {
  const fp: Fingerprint = {
    tag: el.tagName.toLowerCase(),
    text: (el.textContent || '').trim().toLowerCase().replace(/\\s+/g, ' '),
    id: el.id || '',
    classes: Array.from(el.classList),
    attributes: {},
    ancestors: [],
    siblingText: '',
    index: 0
  };

  ['href', 'name', 'type', 'role', 'aria-label', 'data-action'].forEach(attr => {
    if (el.hasAttribute(attr)) fp.attributes[attr] = el.getAttribute(attr)!;
  });

  let curr: HTMLElement | null = el.parentElement;
  let depth = 0;
  while (curr && depth < 4) {
    let aStr = curr.tagName.toLowerCase();
    if (curr.hasAttribute('role')) aStr += \`[role=\${curr.getAttribute('role')}]\`;
    fp.ancestors.push(aStr);
    curr = curr.parentElement;
    depth++;
  }

  if (el.parentElement) {
    const siblings = Array.from(el.parentElement.children);
    fp.index = siblings.indexOf(el);
    const prev = el.previousElementSibling;
    const next = el.nextElementSibling;
    fp.siblingText = ((prev?.textContent || '') + ' ' + (next?.textContent || '')).trim().toLowerCase();
  }

  return fp;
}

function jaccard(a: string[], b: string[]) {
  if (a.length === 0 && b.length === 0) return 1.0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersect = 0;
  for (const item of setA) if (setB.has(item)) intersect++;
  const union = setA.size + setB.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

export function healElement(fingerprintStr: string): { element: Element | null, score: number, newSelector?: string } {
  const fp: Fingerprint = JSON.parse(fingerprintStr);
  const candidates = Array.from(document.querySelectorAll(fp.tag));
  
  if (['button', 'a'].includes(fp.tag)) {
    Array.from(document.querySelectorAll('button, a, [role="button"]')).forEach(el => {
      if (!candidates.includes(el)) candidates.push(el);
    });
  }

  let bestScore = 0;
  let bestEl: Element | null = null;
  let runnerUpScore = 0;

  for (const el of candidates) {
    const cfp = captureFingerprint(el as HTMLElement);
    
    // Text Similarity (Token Jaccard simplified for hackathon)
    const tA = fp.text.split(' ');
    const tB = cfp.text.split(' ');
    const textScore = jaccard(tA, tB);

    // Attributes
    let attrMatches = 0;
    let attrTotal = Object.keys(fp.attributes).length;
    for (const [k, v] of Object.entries(fp.attributes)) {
      if (cfp.attributes[k] === v) attrMatches++;
    }
    const attrScore = attrTotal > 0 ? attrMatches / attrTotal : (Object.keys(cfp.attributes).length === 0 ? 1 : 0.5);

    // Classes
    const classScore = jaccard(fp.classes, cfp.classes);

    // Ancestors
    const ancScore = jaccard(fp.ancestors, cfp.ancestors);

    // Sibling
    const sibScore = jaccard(fp.siblingText.split(' '), cfp.siblingText.split(' '));

    const totalScore = 
      (textScore * 0.35) +
      (attrScore * 0.20) +
      (classScore * 0.10) +
      (ancScore * 0.15) +
      (sibScore * 0.10) +
      (0.10); // Region bucket simplified

    if (totalScore > bestScore) {
      runnerUpScore = bestScore;
      bestScore = totalScore;
      bestEl = el;
    } else if (totalScore > runnerUpScore) {
      runnerUpScore = totalScore;
    }
  }

  if (bestScore >= 0.55 && (bestScore - runnerUpScore) >= 0.10) {
    let selector = bestEl!.tagName.toLowerCase();
    if (bestEl!.id) selector = '#' + bestEl!.id;
    else if (bestEl!.className && typeof bestEl!.className === 'string') {
       selector += '.' + bestEl!.className.split(' ').filter(c => c.trim().length > 0).join('.');
    }
    return { element: bestEl, score: bestScore, newSelector: selector };
  }

  return { element: null, score: bestScore };
}
\`);

write('packages/runtime/tests/heal.test.ts', \`
import { describe, it, expect, beforeEach } from 'vitest';
import { JSDOM } from 'jsdom';
import { captureFingerprint, healElement } from '../src/heal.js';

describe('Heal Algorithm', () => {
  beforeEach(() => {
    const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    // @ts-ignore
    global.window = dom.window;
    // @ts-ignore
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Element = dom.window.Element;
  });

  it('should heal the checkout button from v1 to v2', () => {
    // V1 Setup
    document.body.innerHTML = \`
      <div class="cart-actions">
        <button id="checkout-btn" class="btn btn-primary cart-actions__checkout">Checkout</button>
      </div>
    \`;
    const v1Btn = document.getElementById('checkout-btn')!;
    const fpString = JSON.stringify(captureFingerprint(v1Btn));

    // V2 Setup (Redeploy break)
    document.body.innerHTML = \`
      <aside class="mini-cart">
        <div class="cart-wrapper">
          <a class="cta cta--pay" data-action="pay" href="/checkout">Proceed to Checkout</a>
        </div>
      </aside>
    \`;
    
    const result = healElement(fpString);
    
    expect(result.score).toBeGreaterThanOrEqual(0.75); // Target threshold
    expect(result.element).not.toBeNull();
    expect(result.element?.tagName.toLowerCase()).toBe('a');
    expect(result.element?.className).toContain('cta--pay');
  });

  it('should return broken on ambiguous matches', () => {
    // Setup initial
    document.body.innerHTML = \`<button id="btn1" class="btn">Submit</button>\`;
    const fpString = JSON.stringify(captureFingerprint(document.getElementById('btn1')!));

    // V2 Setup with duplicate identical buttons
    document.body.innerHTML = \`
      <button class="btn">Submit</button>
      <button class="btn">Submit</button>
    \`;

    const result = healElement(fpString);
    expect(result.element).toBeNull(); // Should reject because runner-up is too close
  });
});
\`);

console.log('Runtime script scaffolding complete.');
