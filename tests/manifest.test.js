/**
 * Manifest least-privilege checks.
 *
 * The site-specific content scripts (Teams / Meet / YouTube) must be
 * declared with matches for their own sites only, so they are not
 * injected into every page. Only the generic content script runs on
 * <all_urls>. The background re-injection list must stay consistent:
 * it re-injects all four files on demand, which host_permissions
 * (not the content_scripts matches) governs.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, 'projects/app/manifest.json'), 'utf8'));

function entryFor(file) {
  return manifest.content_scripts.find((entry) => entry.js.includes(file));
}

test('site-specific content scripts are restricted to their sites', () => {
  const teams = entryFor('src/content/teams.js');
  assert.ok(teams, 'teams.js must be declared');
  assert.ok(!teams.matches.includes('<all_urls>'));
  assert.ok(teams.matches.some((m) => m.includes('teams.microsoft.com')));
  assert.ok(teams.matches.some((m) => m.includes('teams.live.com')));

  const meet = entryFor('src/content/meet.js');
  assert.ok(meet, 'meet.js must be declared');
  assert.deepEqual(meet.matches, ['*://meet.google.com/*']);

  const youtube = entryFor('src/content/youtube.js');
  assert.ok(youtube, 'youtube.js must be declared');
  assert.ok(!youtube.matches.includes('<all_urls>'));
  assert.ok(youtube.matches.some((m) => m.includes('youtube.com')));
});

test('only the generic content script runs on all urls', () => {
  const allUrls = manifest.content_scripts.filter((entry) => entry.matches.includes('<all_urls>'));
  assert.equal(allUrls.length, 1);
  assert.deepEqual(allUrls[0].js, ['src/content/content.js']);
});

test('background re-injection list covers every declared content script', () => {
  const background = readFileSync(join(root, 'projects/app/src/background/background.js'), 'utf8');
  const declared = manifest.content_scripts.flatMap((entry) => entry.js);
  for (const file of declared) {
    assert.ok(
      background.includes(`'${file}'`),
      `background CONTENT_SCRIPT_FILES must include ${file} for on-demand re-injection`
    );
  }
});
