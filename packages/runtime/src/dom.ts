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
      navigator.sendBeacon(`http://localhost:4001/api/sites/${siteId}/telemetry`, payload);
    } else {
      fetch(`http://localhost:4001/api/sites/${siteId}/telemetry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true
      });
    }
  } catch(e) {}
}
