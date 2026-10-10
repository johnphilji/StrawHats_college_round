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
    document.body.innerHTML = `
      <div class="cart-actions">
        <button id="checkout-btn" class="btn btn-primary cart-actions__checkout">Checkout</button>
      </div>
    `;
    const v1Btn = document.getElementById('checkout-btn')!;
    const fpString = JSON.stringify(captureFingerprint(v1Btn));

    // V2 Setup (Redeploy break)
    document.body.innerHTML = `
      <aside class="mini-cart">
        <div class="cart-wrapper">
          <a class="cta cta--pay" data-action="pay" href="/checkout">Proceed to Checkout</a>
        </div>
      </aside>
    `;
    
    const result = healElement(fpString);
    
    expect(result.score).toBeGreaterThanOrEqual(0.75); // Target threshold
    expect(result.element).not.toBeNull();
    expect(result.element?.tagName.toLowerCase()).toBe('a');
    expect(result.element?.className).toContain('cta--pay');
  });

  it('should return broken on ambiguous matches', () => {
    // Setup initial
    document.body.innerHTML = `<button id="btn1" class="btn">Submit</button>`;
    const fpString = JSON.stringify(captureFingerprint(document.getElementById('btn1')!));

    // V2 Setup with duplicate identical buttons
    document.body.innerHTML = `
      <button class="btn">Submit</button>
      <button class="btn">Submit</button>
    `;

    const result = healElement(fpString);
    expect(result.element).toBeNull(); // Should reject because runner-up is too close
  });
});
