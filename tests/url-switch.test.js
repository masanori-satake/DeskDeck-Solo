import test from 'node:test';
import assert from 'node:assert/strict';
import { matchUrlToDeck } from '../projects/app/src/background/background.js';
import {
  importBackupData,
  exportBackupData
} from '../projects/app/src/lib/storage.js';

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

  await t.test('Ignores disabled rules', () => {
    assert.equal(matchUrlToDeck('https://open.spotify.com/track/123', sampleRules), null);
  });

  await t.test('Ignores chrome:// internal pages and invalid URLs', () => {
    assert.equal(matchUrlToDeck('chrome://extensions', sampleRules), null);
    assert.equal(matchUrlToDeck('about:blank', sampleRules), null);
    assert.equal(matchUrlToDeck('', sampleRules), null);
  });
});

test('Backup & Restore JSON Validation Tests', async (t) => {
  await t.test('Rejects invalid JSON backup data', async () => {
    const invalidResult = await importBackupData(null);
    assert.equal(invalidResult.success, false);
    assert.match(invalidResult.error, /Invalid backup JSON data format/);
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
});
