import test from 'node:test';
import assert from 'node:assert/strict';

class MockElement {
  constructor() {
    this.children = [];
    this.listeners = new Map();
    this.attributes = new Map();
    this.style = {};
    this.className = '';
    this.classList = {
      add: (name) => {
        this.className = `${this.className} ${name}`;
      },
      remove: (name) => {
        this.className = this.className
          .split(' ')
          .filter((part) => part !== name)
          .join(' ');
      },
    };
  }

  set innerHTML(_html) {
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  setAttribute(name, value) {
    this.attributes.set(name, value);
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  addEventListener(name, listener) {
    this.listeners.set(name, listener);
  }

  dispatch(name, clientX, pointerId = 1) {
    const target =
      (name === 'pointermove' || name === 'pointerup') && MockElement.pointerCaptures.get(pointerId)
        ? MockElement.pointerCaptures.get(pointerId)
        : this;
    target.listeners.get(name)?.({ type: name, clientX, pointerId });
  }

  getBoundingClientRect() {
    return { left: 100, width: 240 };
  }

  setPointerCapture(pointerId) {
    MockElement.pointerCaptures.set(pointerId, this);
  }

  releasePointerCapture(pointerId) {
    if (MockElement.pointerCaptures.get(pointerId) === this) {
      MockElement.pointerCaptures.delete(pointerId);
    }
  }
}

MockElement.pointerCaptures = new Map();

function findByClass(element, name) {
  if (element.className.split(' ').includes(name)) return element;
  for (const child of element.children) {
    const match = findByClass(child, name);
    if (match) return match;
  }
  return null;
}

test('discrete scale selects captured taps without reselecting after swipes or cancellation', async () => {
  const originalDocument = globalThis.document;
  const originalChrome = globalThis.chrome;
  const slotsContainer = new MockElement();
  const deckSelect = new MockElement();
  const documentListeners = new Map();
  const messages = [];
  const stored = { deskdeck_settings: { soundEffects: false, hapticFeedback: false } };

  globalThis.document = {
    addEventListener: (name, listener) => documentListeners.set(name, listener),
    getElementById: (id) => ({ slotsContainer, deckSelect })[id] || null,
    querySelectorAll: () => [],
    createElement: () => new MockElement(),
  };
  globalThis.chrome = {
    storage: {
      local: {
        get: (_keys, callback) => callback(stored),
        set: (values, callback) => {
          Object.assign(stored, values);
          callback();
        },
      },
    },
    runtime: {
      onMessage: { addListener() {} },
      sendMessage: (message, callback) => {
        messages.push(message);
        callback();
      },
    },
  };

  try {
    await import('../projects/app/src/sidepanel/sidepanel.js');
    await documentListeners.get('DOMContentLoaded')();

    const scale = findByClass(slotsContainer, 'discrete-scale-control');
    assert.ok(scale);
    const outside = new MockElement();
    const track = findByClass(scale, 'scale-ticks-track');
    assert.equal(track.children[0].listeners.has('click'), false);

    scale.dispatch('pointerdown', 169);
    outside.dispatch('pointerup', 184);
    assert.equal(scale.getAttribute('aria-valuenow'), '1.25');
    assert.equal(MockElement.pointerCaptures.has(1), false);

    scale.dispatch('pointerdown', 150);
    outside.dispatch('pointerup', 150);
    assert.equal(scale.getAttribute('aria-valuenow'), '0.75');
    assert.deepEqual(messages.at(-1), { action: 'set_speed', payload: { value: 0.75 } });

    scale.dispatch('pointerdown', 150);
    outside.dispatch('pointermove', 181);
    outside.dispatch('pointerup', 150);
    assert.equal(scale.getAttribute('aria-valuenow'), '1');

    scale.dispatch('pointerdown', 400);
    outside.dispatch('pointerup', 400);
    assert.equal(scale.getAttribute('aria-valuenow'), '3');

    scale.dispatch('pointerdown', 150);
    outside.dispatch('pointermove', 181);
    outside.dispatch('pointerup', 150);
    assert.equal(scale.getAttribute('aria-valuenow'), '3');

    scale.dispatch('pointerdown', 150);
    scale.dispatch('pointercancel', 150);
    assert.equal(scale.getAttribute('aria-valuenow'), '3');
  } finally {
    globalThis.document = originalDocument;
    globalThis.chrome = originalChrome;
  }
});
