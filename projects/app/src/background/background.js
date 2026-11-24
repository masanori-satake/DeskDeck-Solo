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

  handleDeckAction(message, sender)
    .then((result) => sendResponse({ success: true, result }))
    .catch((error) => sendResponse({ success: false, error: error.message }));

  return true; // Keep channel open for async response
});

/**
 * Handle incoming deck hardware actions
 */
async function handleDeckAction(message, sender) {
  const { action, payload } = message;

  // Pin the window at input time: in a service worker, currentWindow
  // resolves to the last focused window, which may have changed by
  // the time a queued operation actually runs.
  // A tab sender pins its window directly; a side-panel sender has
  // no tab, so the panel includes its own window id in the message.
  const senderWindowId =
    sender && sender.tab
      ? sender.tab.windowId
      : typeof message.windowId === 'number'
        ? message.windowId
        : undefined;
  const activeQuery =
    senderWindowId !== undefined
      ? { active: true, windowId: senderWindowId }
      : { active: true, currentWindow: true };

  const [activeTab] = await chrome.tabs.query(activeQuery);

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
      // The source window may have closed between the message and
      // the tab query: with a pinned window id and no tab in it, do
      // not fall through to another window's tab.
      if (!activeTab && senderWindowId !== undefined) return { handled: false };
      return await setTabBrightness(activeTab ? activeTab.id : null, val, true);
    }

    case 'set_dimmer_opacity':
    case 'set_dimmer': {
      const opacityVal = payload ? (payload.opacity ?? payload.value ?? 0) : 0;
      if (!activeTab && senderWindowId !== undefined) return { handled: false };
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
        // Clamp to the range Chrome itself supports (25%–500%), so a
        // malformed payload can never push an out-of-range value at
        // the API. Panel-originated values are already inside it.
        const rawZoom = ((payload && payload.value) || 100) / 100;
        const zoomFactor = Math.min(5, Math.max(0.25, rawZoom));
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
        await queueTabOperation(() =>
          chrome.tabs.create(senderWindowId !== undefined ? { windowId: senderWindowId } : {})
        );
        return { created: true };
      }
      if (padId === 'close') {
        const outcome = await queueTabOperation(() => closeActiveTab(senderWindowId));
        return outcome === TAB_OP_TIMEOUT ? { timedOut: true } : { closed: outcome };
      }
      if (padId === 'prev' || padId === 'next') {
        await queueCycleTab(padId === 'next' ? 1 : -1, senderWindowId);
        return { cycled: true };
      }
      break;
    }

    // Standard Tab Navigation actions
    case 'new_tab':
      await queueTabOperation(() =>
        chrome.tabs.create(senderWindowId !== undefined ? { windowId: senderWindowId } : {})
      );
      return { created: true };

    case 'close_tab': {
      const outcome = await queueTabOperation(() => closeActiveTab(senderWindowId));
      return outcome === TAB_OP_TIMEOUT ? { timedOut: true } : { closed: outcome };
    }

    case 'prev_tab':
    case 'next_tab':
      await queueCycleTab(action === 'next_tab' ? 1 : -1, senderWindowId);
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

// Tab operations that depend on which tab is active are serialized
// on one chain: two rapid Next presses must each move one tab, and a
// Close that follows a Next must close the tab the Next landed on —
// both resolve the active tab when they run, not when they arrive.
let tabOpChain = Promise.resolve();
// Resolves from queueTabOperation when the 3s guard fires instead of
// the operation: the caller must tell a timeout apart from a real
// result, since a timed-out Close is neither "closed" nor "no tab".
const TAB_OP_TIMEOUT = Symbol('tab-op-timeout');
function queueTabOperation(operation) {
  // A single operation must never wedge the chain: tabs.remove() can
  // stay unsettled when a tab lingers (e.g. a leave confirmation), so
  // the chain races each operation against a timeout and moves on.
  // The operation itself is left to finish in the background.
  const op = Promise.resolve().then(operation);
  op.catch(() => {});
  const run = Promise.race([
    op,
    new Promise((resolve) => setTimeout(() => resolve(TAB_OP_TIMEOUT), 3000)),
  ]);
  tabOpChain = run.catch(() => {});
  return run;
}
function queueCycleTab(direction, windowId) {
  return queueTabOperation(() => cycleTab(direction, windowId));
}
async function closeActiveTab(windowId) {
  const [tab] = await chrome.tabs.query(
    windowId !== undefined ? { active: true, windowId } : { active: true, currentWindow: true }
  );
  if (tab && tab.id) {
    await chrome.tabs.remove(tab.id);
    return true;
  }
  return false;
}

/**
 * Cycle active tab left (-1) or right (+1)
 */
async function cycleTab(direction, windowId) {
  const tabs = await chrome.tabs.query(
    windowId !== undefined ? { windowId } : { currentWindow: true }
  );
  if (tabs.length <= 1) return;

  const activeIndex = tabs.findIndex((t) => t.active);
  if (activeIndex === -1) return;

  let newIndex = (activeIndex + direction) % tabs.length;
  if (newIndex < 0) newIndex = tabs.length - 1;

  await chrome.tabs.update(tabs[newIndex].id, { active: true });
}
