/**
 * Unit tests for audio module and manifest permissions
 * Copyright (c) 2026 Masanori SATAKE
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { triggerHaptic, isChromeAudioSupported } from '../projects/app/src/lib/audio.js';

test('Manifest Permissions Test', () => {
  const rootDir = process.cwd();
  const manifestPath = path.join(rootDir, 'projects', 'app', 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.ok(
    !manifest.permissions.includes('audio'),
    'manifest.json permissions should not contain kiosk-only "audio" permission'
  );
});

test('Audio Haptic Feedback Tests', async (t) => {
  await t.test('triggerHaptic skips vibrate when user activation has not occurred', () => {
    let vibrateCalled = false;
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: () => {
          vibrateCalled = true;
        },
        userActivation: {
          hasBeenActive: false,
        },
      },
      configurable: true,
      writable: true,
    });

    try {
      triggerHaptic(15);
      assert.strictEqual(vibrateCalled, false);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalDescriptor);
      } else {
        delete globalThis.navigator;
      }
    }
  });

  await t.test('triggerHaptic calls vibrate when user activation has occurred', () => {
    let vibrateDuration = null;
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: (duration) => {
          vibrateDuration = duration;
        },
        userActivation: {
          hasBeenActive: true,
        },
      },
      configurable: true,
      writable: true,
    });

    try {
      triggerHaptic(20);
      assert.strictEqual(vibrateDuration, 20);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalDescriptor);
      } else {
        delete globalThis.navigator;
      }
    }
  });

  await t.test('triggerHaptic calls vibrate if navigator.userActivation is undefined', () => {
    let vibrateDuration = null;
    const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

    Object.defineProperty(globalThis, 'navigator', {
      value: {
        vibrate: (duration) => {
          vibrateDuration = duration;
        },
      },
      configurable: true,
      writable: true,
    });

    try {
      triggerHaptic(10);
      assert.strictEqual(vibrateDuration, 10);
    } finally {
      if (originalDescriptor) {
        Object.defineProperty(globalThis, 'navigator', originalDescriptor);
      } else {
        delete globalThis.navigator;
      }
    }
  });

  await t.test('isChromeAudioSupported requires chrome.audio and getDevices function', () => {
    const originalChrome = globalThis.chrome;

    globalThis.chrome = {};
    assert.strictEqual(isChromeAudioSupported(), false);

    globalThis.chrome = { audio: {} };
    assert.strictEqual(isChromeAudioSupported(), false);

    globalThis.chrome = { audio: { getDevices: () => {} } };
    assert.strictEqual(isChromeAudioSupported(), true);

    if (originalChrome === undefined) {
      delete globalThis.chrome;
    } else {
      globalThis.chrome = originalChrome;
    }
  });
});
