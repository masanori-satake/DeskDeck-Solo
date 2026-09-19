/**
 * Unit tests for storage and deck manager modules
 * Copyright (c) 2026 Masanori SATAKE
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getActiveDeckId,
  setActiveDeckId,
  getDeckSlotStates,
  saveDeckSlotStates,
  getSlotMappings,
  saveSlotMappings,
  getSettings,
  saveSettings,
} from '../projects/app/src/lib/storage.js';

import {
  getDeckPreset,
  getAvailableDecks,
  DECK_PRESETS,
} from '../projects/app/src/lib/deck-manager.js';

// Setup mock for localStorage in Node environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) || null,
    setItem: (key, val) => store.set(key, String(val)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
  };
}

test('Storage Module Tests', async (t) => {
  await t.test('getActiveDeckId and setActiveDeckId', async () => {
    const defaultDeck = await getActiveDeckId();
    assert.strictEqual(defaultDeck, 'media');

    await setActiveDeckId('meeting');
    const updatedDeck = await getActiveDeckId();
    assert.strictEqual(updatedDeck, 'meeting');
  });

  await t.test('getSlotMappings and saveSlotMappings', async () => {
    const initialMappings = await getSlotMappings();
    assert.deepEqual(initialMappings, {});

    const testMappings = { media: { media_volume: { label: 'Custom Volume' } } };
    await saveSlotMappings(testMappings);

    const savedMappings = await getSlotMappings();
    assert.deepEqual(savedMappings, testMappings);
  });

  await t.test('getDeckSlotStates and saveDeckSlotStates', async () => {
    const initialState = await getDeckSlotStates('media');
    assert.strictEqual(initialState, null);

    await saveDeckSlotStates('media', { media_volume: 85 });
    const savedState = await getDeckSlotStates('media');
    assert.deepEqual(savedState, { media_volume: 85 });
  });

  await t.test('getSettings and saveSettings', async () => {
    const settings = await getSettings();
    assert.strictEqual(settings.soundEffects, true);
    assert.strictEqual(settings.hapticFeedback, true);

    await saveSettings({ soundEffects: false, hapticFeedback: true });
    const updated = await getSettings();
    assert.strictEqual(updated.soundEffects, false);
    assert.strictEqual(updated.hapticFeedback, true);
  });
});

test('Deck Manager Module Tests', async (t) => {
  await t.test('getAvailableDecks returns 5 deck options', () => {
    const decks = getAvailableDecks();
    assert.strictEqual(decks.length, 5);
    const ids = decks.map((d) => d.id);
    assert.deepEqual(ids, ['media', 'meeting', 'reader', 'audio', 'standard']);
  });

  await t.test('getDeckPreset returns correct preset structure', () => {
    const mediaPreset = getDeckPreset('media');
    assert.strictEqual(mediaPreset.id, 'media');
    assert.ok(Array.isArray(mediaPreset.slots));
    assert.ok(mediaPreset.slots.length > 0);
  });

  await t.test('getDeckPreset applies custom slotMappings overrides', () => {
    const customMappings = {
      media: {
        media_volume: { label: 'Custom Master Vol' },
      },
    };
    const preset = getDeckPreset('media', customMappings);
    const volumeSlot = preset.slots.find((s) => s.id === 'media_volume');
    assert.strictEqual(volumeSlot.label, 'Custom Master Vol');
  });

  await t.test('DECK_PRESETS contains all 5 virtual decks', () => {
    const keys = Object.keys(DECK_PRESETS);
    assert.deepEqual(keys, ['media', 'meeting', 'reader', 'audio', 'standard']);
  });
});
