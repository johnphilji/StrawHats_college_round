// Unit tests for the iframe selection protocol (Phase 8).
// Run with: node --test src/selection-protocol.test.ts
// (Node 22+ strips erasable TypeScript; no test runner dependency.)

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSelectionModeMessage,
  validateSelectionMessage,
} from './selection-protocol.ts';

const ORIGIN = 'http://localhost:5174';
const editableIds = new Set(['hero-heading', 'navbar-cta']);

const baseEvent = (overrides = {}) => ({
  origin: ORIGIN,
  source: 'iframe-window',
  data: {
    type: 'PATCHWORK_ELEMENT_SELECTED',
    componentId: 'hero-heading',
    tagName: 'H1',
    text: 'Persia Darbar',
    route: '/',
  },
  ...overrides,
});

const expected = (overrides = {}) => ({
  expectedOrigin: ORIGIN,
  isExpectedSource: true,
  editableIds,
  ...overrides,
});

describe('validateSelectionMessage', () => {
  it('accepts a well-formed selection from the expected origin and source', () => {
    const result = validateSelectionMessage(baseEvent(), expected());
    assert.equal(result.ok, true);
    if (result.ok === false) throw new Error('expected ok');
    assert.equal(result.kind, 'selected');
    if (result.kind === 'selected') {
      assert.equal(result.message.componentId, 'hero-heading');
      assert.equal(result.message.tagName, 'H1');
    }
  });

  it('accepts the READY handshake', () => {
    const result = validateSelectionMessage(
      baseEvent({ data: { type: 'PATCHWORK_READY', route: '/#menu' } }),
      expected(),
    );
    assert.equal(result.ok, true);
    if (result.ok === false) throw new Error('expected ok');
    assert.equal(result.kind, 'ready');
  });

  it('rejects messages from an unexpected origin', () => {
    const result = validateSelectionMessage(baseEvent({ origin: 'http://evil.example' }), expected());
    assert.equal(result.ok, false);
    if (result.ok !== false) throw new Error('expected rejection');
    assert.equal(result.reason, 'unexpected-origin');
  });

  it('rejects messages from an unexpected source window', () => {
    const result = validateSelectionMessage(baseEvent(), expected({ isExpectedSource: false }));
    assert.equal(result.ok, false);
    if (result.ok !== false) throw new Error('expected rejection');
    assert.equal(result.reason, 'unexpected-message-source');
  });

  it('rejects malformed payloads without crashing', () => {
    for (const data of [null, 'string', 42, {}, { type: 'PATCHWORK_ELEMENT_SELECTED' }, { type: 'UNKNOWN' }]) {
      const result = validateSelectionMessage(baseEvent({ data }), expected());
      assert.equal(result.ok, false);
    }
  });

  it('rejects unregistered component IDs', () => {
    const result = validateSelectionMessage(
      baseEvent({ data: { type: 'PATCHWORK_ELEMENT_SELECTED', componentId: 'review-card-1', tagName: 'DIV', text: 'x', route: '/' } }),
      expected(),
    );
    assert.equal(result.ok, false);
    if (result.ok !== false) throw new Error('expected rejection');
    assert.equal(result.reason, 'unregistered-component');
  });

  it('builds a selection-mode command with an explicit boolean', () => {
    assert.deepEqual(buildSelectionModeMessage(true), { type: 'PATCHWORK_SET_SELECTION_MODE', enabled: true });
  });
});
