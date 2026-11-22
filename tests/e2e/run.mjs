// DeskDeck-Solo E2E checks.
//
// Loads the real extension into Chromium (Playwright) and drives it the
// way the side panel does: runtime messages -> background -> content
// script -> DOM effects. Fixture pages are served at real youtube.com
// URLs via request interception, so content-script URL matching and
// hostname checks behave exactly as in the wild; the fixtures mirror
// only the DOM structure the content scripts actually query.
//
// These checks cover the layer the unit tests cannot: real message
// routing between the shipped scripts and a real DOM. They exist
// because the three 0.3.12 real-device findings (Scroll Wheel swallowed
// as a seek on YouTube, Shorts Play/Pause hitting the wrong reel,
// settings living outside the panel) all passed the mocked unit tests.
//
// Run: npm run test:e2e
// Headless machines need a virtual display: xvfb-run -a npm run test:e2e
// EXT_PATH overrides the extension directory (used to regression-check
// older trees); by default the repo's own projects/app is loaded.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const EXT_PATH = process.env.EXT_PATH || path.resolve(here, '../../projects/app');
const watchHtml = fs.readFileSync(path.join(here, 'fixtures/watch.html'), 'utf8');
const shortsHtml = fs.readFileSync(path.join(here, 'fixtures/shorts.html'), 'utf8');

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'deskdeck-e2e-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  headless: false,
  args: [
    `--disable-extensions-except=${EXT_PATH}`,
    `--load-extension=${EXT_PATH}`,
    '--no-first-run',
    '--mute-audio',
  ],
});

let worker = context.serviceWorkers()[0];
if (!worker) worker = await context.waitForEvent('serviceworker', { timeout: 15000 });
const extensionId = new URL(worker.url()).host;
console.log('extension id:', extensionId);

await context.route('https://www.youtube.com/**', (route) => {
  const url = route.request().url();
  const body = url.includes('/shorts/') ? shortsHtml : watchHtml;
  route.fulfill({ status: 200, contentType: 'text/html', body });
});

async function sendToTab(urlPart, message) {
  return worker.evaluate(
    async ([part, msg]) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url && t.url.includes(part));
      if (!tab) throw new Error('tab not found: ' + part);
      return chrome.tabs.sendMessage(tab.id, msg);
    },
    [urlPart, message]
  );
}

// --- 1. Watch page: the Scroll Wheel must scroll the page, not seek -----
try {
  const watch = await context.newPage();
  await watch.goto('https://www.youtube.com/watch?v=fixture');
  await watch.waitForTimeout(800);
  const before = await watch.evaluate(() => window.scrollY);
  const resp = await sendToTab('/watch', {
    action: 'scroll_dial',
    payload: { value: 60, delta: 10, speedFactor: 1 },
  });
  await watch.waitForTimeout(300);
  const after = await watch.evaluate(() => window.scrollY);
  check(
    'YouTube: Scroll Wheel scrolls the page',
    after > before,
    `scrollY ${before} -> ${after}, response=${JSON.stringify(resp)}`
  );
} catch (e) {
  check('YouTube: Scroll Wheel scrolls the page', false, String(e).split('\n')[0]);
}

// --- 2. Shorts: Play/Pause must act on the active reel only -------------
try {
  const shorts = await context.newPage();
  await shorts.goto('https://www.youtube.com/shorts/fixture');
  await shorts.waitForTimeout(800);
  const read = () =>
    shorts.evaluate(() => ({
      reel0: document.querySelector('#reel-0 video').paused,
      reel1: document.querySelector('#reel-1 video').paused,
    }));
  const state0 = await read();
  await sendToTab('/shorts/', { action: 'play_pause' });
  await shorts.waitForTimeout(300);
  const state1 = await read();
  check(
    'Shorts: Play/Pause starts the ACTIVE reel',
    state0.reel1 === true && state1.reel1 === false,
    `reel1 paused ${state0.reel1} -> ${state1.reel1}`
  );
  check(
    'Shorts: inactive reel untouched',
    state0.reel0 === false && state1.reel0 === false,
    `reel0 paused stayed ${state1.reel0}`
  );
} catch (e) {
  check('Shorts: Play/Pause acts on the active reel only', false, String(e).split('\n')[0]);
}

// --- 3. Panel: settings live inside the panel and persist ---------------
try {
  const panel = await context.newPage();
  await panel.goto(`chrome-extension://${extensionId}/src/sidepanel/sidepanel.html`);
  await panel.waitForSelector('#slotsContainer > *', { timeout: 10000 });
  await panel.click('#optionsBtn');
  const settingsVisible = await panel.evaluate(
    () => !document.getElementById('settingsView').hidden
  );
  check('Panel: gear opens the in-panel settings view', settingsVisible);
  const soundBefore = await panel.evaluate(() => document.getElementById('settingsSound').checked);
  await panel.click('#settingsSound');
  await panel.waitForTimeout(300);
  const soundAfter = await panel.evaluate(async () => {
    const s = await chrome.storage.local.get('deskdeck_settings');
    return s.deskdeck_settings?.soundEffects;
  });
  check(
    'Panel: sound toggle persists to storage',
    soundAfter === !soundBefore,
    `checkbox ${soundBefore} -> stored soundEffects ${soundAfter}`
  );
} catch (e) {
  check('Panel: in-panel settings', false, String(e).split('\n')[0]);
}

await context.close();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
