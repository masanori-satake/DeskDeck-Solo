/**
 * Service Worker background script for DeskDeck-Solo
 * Copyright (c) 2026 Masanori SATAKE
 */

import {
  toggleKeepAwake,
  getKeepAwakeStatus,
  muteBackgroundTabs,
  setTabBrightness,
} from '../lib/system.js';

// Enable side panel to open on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Side panel behavior set error:', err);
    });
  }
});

// Restore keep awake state if persisted across Service Worker restarts
getKeepAwakeStatus().then((isActive) => {
  if (isActive && typeof chrome !== 'undefined' && chrome.power) {
    try {
      chrome.power.requestKeepAwake('display');
    } catch (err) {
      console.warn('Restoring keep awake on SW restart failed:', err);
    }
  }
});

// Message listener for deck actions
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return false;

  handleDeckAction(message)
    .then((result) => sendResponse({ success: true, result }))
    .catch((error) => sendResponse({ success: false, error: error.message }));

  return true; // Keep channel open for async response
});

/**
 * Handle incoming deck hardware actions
 */
async function handleDeckAction(message) {
  const { action, payload } = message;

  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (action) {
    // System control actions
    case 'toggle_keep_awake':
    case 'keep_awake': {
      const isKeepAwake = await toggleKeepAwake(payload ? payload.enabled : undefined);
      return { keepAwake: isKeepAwake };
    }

    case 'mute_background_tabs':
    case 'mute_tabs': {
      const muteResult = await muteBackgroundTabs();
      return muteResult;
    }

    case 'set_brightness': {
      const val = payload ? (payload.value ?? payload.brightness ?? 100) : 100;
      return await setTabBrightness(activeTab ? activeTab.id : null, val, true);
    }

    case 'set_dimmer_opacity':
    case 'set_dimmer': {
      const opacityVal = payload ? (payload.opacity ?? payload.value ?? 0) : 0;
      return await setTabBrightness(activeTab ? activeTab.id : null, opacityVal, false);
    }

    // Media & Volume actions
    case 'set_volume':
    case 'toggle_mute':
    case 'toggle_master_mute':
    case 'media_play_pause':
    case 'play_pause':
    case 'media_play':
    case 'play':
    case 'media_pause':
    case 'pause':
    case 'media_prev':
    case 'prev_track':
    case 'media_next':
    case 'next_track':
    case 'seek':
    case 'seek_relative':
    case 'media_seek':
    case 'seek_dial':
    case 'set_speed':
    case 'set_playback_rate':
    case 'playback_rate':
    case 'toggle_pip':
    case 'pip':
    case 'toggle_picture_in_picture':
    case 'pad_action':
    case 'set_fader':
    case 'toggle_fullscreen':
      if (activeTab && activeTab.id) {
        return await sendToTab(activeTab.id, { action, payload });
      }
      break;

    // Meeting actions
    case 'set_mic_level':
    case 'toggle_mic_mute':
    case 'toggle_camera':
    case 'raise_hand':
    case 'leave_call':
      if (activeTab && activeTab.id) {
        return await sendToTab(activeTab.id, { action, payload });
      }
      break;

    // Reader & Zoom actions
    case 'set_zoom':
      if (activeTab && activeTab.id && chrome.tabs.setZoom) {
        const zoomFactor = (payload.value || 100) / 100;
        await chrome.tabs.setZoom(activeTab.id, zoomFactor);
        return { zoomFactor };
      }
      break;

    case 'page_up':
    case 'page_down':
    case 'toggle_dark_reader':
    case 'toggle_reader_mode':
      if (activeTab && activeTab.id) {
        return await sendToTab(activeTab.id, { action, payload });
      }
      break;

    // Standard Tab Management Grid: the pads send one 'pad_tab' action
    // with a padId. This case was missing, so the message fell through
    // to the content script (which cannot manage tabs) and every pad —
    // New, Close, Prev, Next — silently did nothing.
    case 'pad_tab': {
      const padId = payload && payload.padId;
      if (padId === 'new') {
        await chrome.tabs.create({});
        return { created: true };
      }
      if (padId === 'close') {
        if (activeTab && activeTab.id) {
          await chrome.tabs.remove(activeTab.id);
          return { closed: true };
        }
        break;
      }
      if (padId === 'prev' || padId === 'next') {
        await queueCycleTab(padId === 'next' ? 1 : -1);
        return { cycled: true };
      }
      break;
    }

    // Standard Tab Navigation actions
    case 'new_tab':
      await chrome.tabs.create({});
      return { created: true };

    case 'close_tab':
      if (activeTab && activeTab.id) {
        await chrome.tabs.remove(activeTab.id);
        return { closed: true };
      }
      break;

    case 'prev_tab':
    case 'next_tab':
      await queueCycleTab(action === 'next_tab' ? 1 : -1);
      return { cycled: true };

    case 'bookmark_page':
      if (activeTab && activeTab.url && activeTab.title && chrome.bookmarks) {
        await chrome.bookmarks.create({
          title: activeTab.title,
          url: activeTab.url,
        });
        return { bookmarked: true };
      }
      break;

    case 'scroll_dial':
      if (activeTab && activeTab.id) {
        return await sendToTab(activeTab.id, { action, payload });
      }
      break;

    default:
      if (activeTab && activeTab.id) {
        return await sendToTab(activeTab.id, { action, payload });
      }
  }
}

const CONTENT_SCRIPT_FILES = [
  'src/content/teams.js',
  'src/content/meet.js',
  'src/content/youtube.js',
  'src/content/content.js',
];

/**
 * Helper to send message to tab content script safely
 */
async function sendToTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (err) {
    // The tab's content script is often orphaned after the extension is
    // reloaded: the page keeps running but its scripts are disconnected,
    // so the action used to be dropped silently — from the panel this
    // looked like a button that randomly does nothing. Re-inject the
    // content scripts once and retry the action.
    try {
      await chrome.scripting.executeScript({
        target: { tabId },
        files: CONTENT_SCRIPT_FILES,
      });
      return await chrome.tabs.sendMessage(tabId, msg);
    } catch (retryErr) {
      // Content scripts cannot run on chrome:// or other special pages.
      return { status: 'no_content_script', message: retryErr.message };
    }
  }
}

// Tab cycling is serialized: two rapid Next presses must each move
// one tab. Without the chain, both could read the same active tab
// before either update lands and collapse into a single move.
let tabCycleChain = Promise.resolve();
function queueCycleTab(direction) {
  const run = tabCycleChain.then(() => cycleTab(direction));
  tabCycleChain = run.catch(() => {});
  return run;
}

/**
 * Cycle active tab left (-1) or right (+1)
 */
async function cycleTab(direction) {
  const tabs = await chrome.tabs.query({ currentWindow: true });
  if (tabs.length <= 1) return;

  const activeIndex = tabs.findIndex((t) => t.active);
  if (activeIndex === -1) return;

  let newIndex = (activeIndex + direction) % tabs.length;
  if (newIndex < 0) newIndex = tabs.length - 1;

  await chrome.tabs.update(tabs[newIndex].id, { active: true });
}
