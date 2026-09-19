/**
 * Automated Test Suite for Teams and Meet Content Scripts
 * Copyright (c) 2026 Masanori SATAKE
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Minimal DOM & MutationObserver mock for Node testing environment
function setupDOMMock(hostname = 'teams.microsoft.com') {
  const elements = new Map();
  const listeners = new Map();
  const observerCallbacks = new Set();

  class MockElement {
    constructor(tagName, attributes = {}) {
      this.tagName = tagName.toUpperCase();
      this.attributes = { ...attributes };
      this.children = [];
      this.parentElement = null;
      this.clicked = false;
      this.offsetWidth = 100;
      this.offsetHeight = 40;
    }

    getAttribute(attr) {
      return this.attributes[attr] || null;
    }

    setAttribute(attr, val) {
      this.attributes[attr] = String(val);
    }

    getClientRects() {
      return [{ width: 100, height: 40 }];
    }

    click() {
      this.clicked = true;
      if (listeners.has(this)) {
        const cb = listeners.get(this);
        cb();
      }
    }

    appendChild(child) {
      child.parentElement = this;
      this.children.push(child);
      notifyObservers();
    }
  }

  function notifyObservers() {
    for (const cb of observerCallbacks) {
      cb([], null);
    }
  }

  class MockMutationObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      observerCallbacks.add(this.callback);
    }

    disconnect() {
      observerCallbacks.delete(this.callback);
    }
  }

  globalThis.window = {
    location: { hostname },
  };

  globalThis.document = {
    body: new MockElement('body'),
    documentElement: new MockElement('html'),
    querySelector(selector) {
      for (const [sel, el] of elements.entries()) {
        if (matchesSelector(el, sel, selector)) {
          return el;
        }
      }
      return null;
    },
    querySelectorAll(selector) {
      const results = [];
      for (const [sel, el] of elements.entries()) {
        if (matchesSelector(el, sel, selector)) {
          results.push(el);
        }
      }
      return results;
    },
    createElement(tagName) {
      return new MockElement(tagName);
    },
  };

  globalThis.MutationObserver = MockMutationObserver;

  function matchesSelector(el, elementKeySelector, querySelector) {
    if (elementKeySelector === querySelector) return true;

    // Check simple attribute attribute*=value selector matching
    const attrMatch = querySelector.match(/^(\w+)?\[([\w-]+)\*="([^"]+)"\]$/);
    if (attrMatch) {
      const [, tag, attr, val] = attrMatch;
      if (tag && tag.toUpperCase() !== el.tagName) return false;
      const attrVal = el.getAttribute(attr);
      return attrVal && attrVal.toLowerCase().includes(val.toLowerCase());
    }

    const exactAttrMatch = querySelector.match(/^(\w+)?\[([\w-]+)="([^"]+)"\]$/);
    if (exactAttrMatch) {
      const [, tag, attr, val] = exactAttrMatch;
      if (tag && tag.toUpperCase() !== el.tagName) return false;
      return el.getAttribute(attr) === val;
    }

    const hasAttrMatch = querySelector.match(/^(\w+)?\[([\w-]+)\]$/);
    if (hasAttrMatch) {
      const [, tag, attr] = hasAttrMatch;
      if (tag && tag.toUpperCase() !== el.tagName) return false;
      return el.getAttribute(attr) !== null;
    }

    return false;
  }

  return {
    registerElement(selectorKey, attributes = {}) {
      const el = new MockElement(selectorKey.startsWith('button') ? 'button' : 'div', attributes);
      elements.set(selectorKey, el);
      notifyObservers();
      return el;
    },
    removeElement(selectorKey) {
      elements.delete(selectorKey);
      notifyObservers();
    },
    onElementClick(el, cb) {
      listeners.set(el, cb);
    },
  };
}

// Load content scripts in Node context
function loadScript(filepath) {
  const code = fs.readFileSync(path.resolve(filepath), 'utf8');
  eval(code);
}

test('Teams Content Script tests', async (t) => {
  const dom = setupDOMMock('teams.microsoft.com');
  loadScript('projects/app/src/content/teams.js');

  await t.test('Domain detection', () => {
    assert.strictEqual(window.DeskDeckTeams.isTeams(), true);
  });

  await t.test('Mic & Camera Toggles via DOM click', () => {
    const micBtn = dom.registerElement('button[aria-label*="Mute"]', {
      'aria-label': 'Mute microphone',
    });
    const camBtn = dom.registerElement('button[aria-label*="Camera"]', {
      'aria-label': 'Turn Camera off',
    });

    assert.strictEqual(window.DeskDeckTeams.toggleMic(), true);
    assert.strictEqual(micBtn.clicked, true);

    assert.strictEqual(window.DeskDeckTeams.toggleCamera(), true);
    assert.strictEqual(camBtn.clicked, true);
  });

  await t.test('Reaction tray fallback & emoji sending', async () => {
    const trayBtn = dom.registerElement('button[aria-label*="Reactions"]', {
      'aria-label': 'Reactions menu',
    });

    // When tray is clicked, register applause reaction button dynamically
    dom.onElementClick(trayBtn, () => {
      dom.registerElement('button[data-tid*="applause"]', {
        'data-tid': 'applause-btn',
        'aria-label': 'Clap',
      });
    });

    const reactionSent = await window.DeskDeckTeams.sendReaction('applause');
    assert.strictEqual(reactionSent, true);
  });

  await t.test('Safe leave call protection', () => {
    const leaveBtn = dom.registerElement('button[aria-label*="Leave"]', {
      'aria-label': 'Leave meeting',
    });

    // 1. Without protective cover authorization -> MUST be blocked
    const unprotectedResult = window.DeskDeckTeams.leaveCall({});
    assert.strictEqual(unprotectedResult, false);
    assert.strictEqual(leaveBtn.clicked, false);

    // 2. With protective cover authorization -> MUST click leave button
    const protectedResult = window.DeskDeckTeams.leaveCall({
      protectedCover: true,
      fromFlipSwitch: true,
    });
    assert.strictEqual(protectedResult, true);
    assert.strictEqual(leaveBtn.clicked, true);
  });
});

test('Meet Content Script tests', async (t) => {
  const dom = setupDOMMock('meet.google.com');
  loadScript('projects/app/src/content/meet.js');

  await t.test('Domain detection', () => {
    assert.strictEqual(window.DeskDeckMeet.isMeet(), true);
  });

  await t.test('Mic & Camera Toggles via DOM click', () => {
    const micBtn = dom.registerElement('button[aria-label*="turn off microphone"]', {
      'aria-label': 'turn off microphone',
    });
    const camBtn = dom.registerElement('button[aria-label*="turn off camera"]', {
      'aria-label': 'turn off camera',
    });

    assert.strictEqual(window.DeskDeckMeet.toggleMic(), true);
    assert.strictEqual(micBtn.clicked, true);

    assert.strictEqual(window.DeskDeckMeet.toggleCamera(), true);
    assert.strictEqual(camBtn.clicked, true);
  });

  await t.test('Reaction tray fallback & emoji sending', async () => {
    const trayBtn = dom.registerElement('button[aria-label*="Send a reaction"]', {
      'aria-label': 'Send a reaction',
    });

    dom.onElementClick(trayBtn, () => {
      dom.registerElement('button[data-emoji="👍"]', {
        'data-emoji': '👍',
        'aria-label': 'thumbs up',
      });
    });

    const reactionSent = await window.DeskDeckMeet.sendReaction('thumbsup');
    assert.strictEqual(reactionSent, true);
  });

  await t.test('Safe leave call protection', () => {
    const leaveBtn = dom.registerElement('button[aria-label*="Leave call"]', {
      'aria-label': 'Leave call',
    });

    // 1. Without protective cover authorization -> MUST be blocked
    const unprotectedResult = window.DeskDeckMeet.leaveCall({});
    assert.strictEqual(unprotectedResult, false);
    assert.strictEqual(leaveBtn.clicked, false);

    // 2. With protective cover authorization -> MUST click leave button
    const protectedResult = window.DeskDeckMeet.leaveCall({
      protectedCover: true,
      fromFlipSwitch: true,
    });
    assert.strictEqual(protectedResult, true);
    assert.strictEqual(leaveBtn.clicked, true);
  });
});
