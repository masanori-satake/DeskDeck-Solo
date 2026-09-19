import test from 'node:test';
import assert from 'node:assert/strict';
import { matchUrlToDeck } from '../projects/app/src/background/background.js';
import {
  importBackupData,
  exportBackupData
} from '../projects/app/src/lib/storage.js';
import {
  ACTION_OPTIONS_BY_TYPE,
  getDeckPreset,
  getEffectiveSlotAction,
  normalizeNumericSlotValue,
  normalizeSlotMappings
} from '../projects/app/src/lib/deck-manager.js';

test('URL Auto-Switch Matching Tests', async (t) => {
  const sampleRules = [
    { id: '1', pattern: 'youtube.com', deckId: 'media', enabled: true },
    { id: '2', pattern: 'meet.google.com', deckId: 'meeting', enabled: true },
    { id: '3', pattern: 'teams.microsoft.com', deckId: 'meeting', enabled: true },
    { id: '4', pattern: 'wikipedia.org', deckId: 'reader', enabled: true },
    { id: '5', pattern: 'spotify.com', deckId: 'audio', enabled: false }
  ];

  await t.test('Matches direct domain exact match', () => {
    assert.equal(matchUrlToDeck('https://youtube.com/watch?v=123', sampleRules), 'media');
    assert.equal(matchUrlToDeck('https://meet.google.com/abc-defg-hij', sampleRules), 'meeting');
  });

  await t.test('Matches subdomains', () => {
    assert.equal(matchUrlToDeck('https://music.youtube.com/', sampleRules), 'media');
    assert.equal(matchUrlToDeck('https://en.wikipedia.org/wiki/Main_Page', sampleRules), 'reader');
  });

  await t.test('Does not match hostname text in a URL path or query', () => {
    assert.equal(matchUrlToDeck('https://example.com/youtube.com/watch', sampleRules), null);
    assert.equal(matchUrlToDeck('https://example.com/?next=meet.google.com', sampleRules), null);
  });

  await t.test('Parses full URL patterns as hostname rules', () => {
    const fullUrlRule = [
      { id: 'full', pattern: 'https://youtube.com/watch?v=123', deckId: 'media', enabled: true }
    ];
    assert.equal(matchUrlToDeck('https://music.youtube.com/', fullUrlRule), 'media');
    assert.equal(matchUrlToDeck('https://example.com/youtube.com/watch', fullUrlRule), null);
  });

  await t.test('Ignores disabled rules', () => {
    assert.equal(matchUrlToDeck('https://open.spotify.com/track/123', sampleRules), null);
  });

  await t.test('Ignores chrome:// internal pages and invalid URLs', () => {
    assert.equal(matchUrlToDeck('chrome://extensions', sampleRules), null);
    assert.equal(matchUrlToDeck('about:blank', sampleRules), null);
    assert.equal(matchUrlToDeck('', sampleRules), null);
  });
});

test('URL auto-switch discards stale tab activation work', async () => {
  let onActivated;
  let activeTab = { id: 1, active: true, url: 'https://youtube.com/' };
  const storageState = {
    deskdeck_active_deck: 'media',
    deskdeck_url_mappings: [
      { id: 'youtube', pattern: 'youtube.com', deckId: 'media', enabled: true },
      { id: 'meet', pattern: 'meet.google.com', deckId: 'meeting', enabled: true }
    ]
  };
  const sentMessages = [];

  globalThis.chrome = {
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener() {} },
      sendMessage(message) {
        sentMessages.push(message);
        return Promise.resolve();
      }
    },
    storage: {
      local: {
        get(keys, callback) {
          const result = {};
          keys.forEach((key) => { result[key] = storageState[key]; });
          callback(result);
        },
        set(values, callback) {
          Object.assign(storageState, values);
          callback();
        }
      }
    },
    tabs: {
      onActivated: { addListener(listener) { onActivated = listener; } },
      onUpdated: { addListener() {} },
      async get(tabId) {
        if (tabId === 1) {
          await new Promise((resolve) => setTimeout(resolve, 20));
          return { id: 1, active: true, url: 'https://youtube.com/' };
        }
        return { id: 2, active: true, url: 'https://meet.google.com/call' };
      },
      async query() {
        return [activeTab];
      }
    }
  };

  try {
    await import(`../projects/app/src/background/background.js?race=${Date.now()}`);
    const staleCheck = onActivated({ tabId: 1 });
    activeTab = { id: 2, active: true, url: 'https://meet.google.com/call' };
    const latestCheck = onActivated({ tabId: 2 });
    await Promise.all([staleCheck, latestCheck]);

    assert.equal(storageState.deskdeck_active_deck, 'meeting');
    assert.deepEqual(sentMessages.map((message) => message.deckId), ['meeting']);
  } finally {
    delete globalThis.chrome;
  }
});

test('Backup & Restore JSON Validation Tests', async (t) => {
  await t.test('Rejects invalid JSON backup data', async () => {
    const invalidResult = await importBackupData(null);
    assert.equal(invalidResult.success, false);
    assert.match(invalidResult.error, /Invalid backup JSON data format/);
  });

  await t.test('Rejects arrays, unsupported versions, and backups without restoration fields', async () => {
    for (const invalidData of [
      [],
      { version: '1.0.0' },
      { version: '2.0.0', settings: {} },
      { version: '1.0.0', settings: [] }
    ]) {
      const result = await importBackupData(invalidData);
      assert.deepEqual(result, { success: false, error: 'Invalid backup JSON data format' });
    }
  });

  await t.test('Successfully imports structured JSON backup object', async () => {
    const validData = {
      version: '1.0.0',
      activeDeck: 'meeting',
      settings: { soundEffects: false, hapticFeedback: true },
      urlMappings: [{ id: 'test_1', pattern: 'test.com', deckId: 'reader', enabled: true }],
      slotMappings: { media: { media_volume: { action: 'set_speed' } } }
    };

    const importRes = await importBackupData(validData);
    assert.equal(importRes.success, true);
  });

  await t.test('Writes all restored fields in one chrome.storage call', async () => {
    const calls = [];
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          set(values, callback) {
            calls.push(values);
            callback();
          }
        }
      }
    };

    try {
      const result = await importBackupData({
        version: '1.0.0',
        activeDeck: 'reader',
        settings: { soundEffects: false },
        urlMappings: []
      });
      assert.equal(result.success, true);
      assert.equal(calls.length, 1);
      assert.deepEqual(calls[0], {
        deskdeck_active_deck: 'reader',
        deskdeck_settings: { soundEffects: false },
        deskdeck_url_mappings: []
      });
    } finally {
      delete globalThis.chrome;
    }
  });

  await t.test('Reports chrome.storage write failures', async () => {
    globalThis.chrome = {
      runtime: {},
      storage: {
        local: {
          set(values, callback) {
            globalThis.chrome.runtime.lastError = { message: 'Storage write failed' };
            callback();
            delete globalThis.chrome.runtime.lastError;
          }
        }
      }
    };

    try {
      const result = await importBackupData({ version: '1.0.0', settings: {} });
      assert.deepEqual(result, { success: false, error: 'Storage write failed' });
    } finally {
      delete globalThis.chrome;
    }
  });
});

test('Slot action customization tests', async (t) => {
  await t.test('Removes actions without handlers from customization options', () => {
    const unavailableActions = new Set([
      'set_master_gain',
      'set_stream_level',
      'set_channel_fader',
      'set_scroll_speed',
      'toggle_contrast_lock',
      'reset_audio_eq',
      'pad_nav',
      'pad_tab',
      'soundboard_trigger'
    ]);
    const availableActions = Object.values(ACTION_OPTIONS_BY_TYPE)
      .flat()
      .map((option) => option.value);
    assert.equal(availableActions.some((action) => unavailableActions.has(action)), false);
  });

  await t.test('Applies the selected action numeric profile instead of the original slot range', () => {
    const preset = getDeckPreset('media', {
      media: {
        media_volume: {
          action: 'set_speed',
          min: -100,
          max: 100,
          step: 50,
          unit: '%'
        }
      }
    });
    const slot = preset.slots.find((candidate) => candidate.id === 'media_volume');
    assert.deepEqual(
      { min: slot.min, max: slot.max, step: slot.step, unit: slot.unit, defaultValue: slot.defaultValue },
      { min: 0.25, max: 3, step: 0.25, unit: 'x', defaultValue: 1 }
    );
    assert.equal(normalizeNumericSlotValue(slot, 70), 3);
  });

  await t.test('Falls back to the preset action for an unknown override', () => {
    const slot = getDeckPreset('media').slots.find((candidate) => candidate.id === 'media_volume');
    assert.equal(getEffectiveSlotAction(slot, 'unknown_action'), 'set_volume');
    assert.equal(
      getDeckPreset('media', { media: { media_volume: { action: 'unknown_action' } } })
        .slots.find((candidate) => candidate.id === 'media_volume').action,
      'set_volume'
    );
  });

  await t.test('Normalizes unknown stored actions before mappings are saved', () => {
    const mappings = {
      media: {
        media_volume: { action: 'unknown_action', label: 'Custom volume' },
        media_speed: { action: 'set_zoom' }
      }
    };
    assert.equal(normalizeSlotMappings(mappings), mappings);
    assert.deepEqual(mappings.media.media_volume, {
      action: 'set_volume',
      label: 'Custom volume'
    });
    assert.equal(mappings.media.media_speed.action, 'set_zoom');
  });
});
