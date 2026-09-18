/**
 * Service Worker background script for DeskDeck-Solo
 */

// Enable side panel to open on extension icon click
chrome.runtime.onInstalled.addListener(() => {
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((err) => {
      console.warn('Side panel behavior set error:', err);
    });
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
    // Media & Volume actions
    case 'set_volume':
    case 'toggle_mute':
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
      await cycleTab(action === 'next_tab' ? 1 : -1);
      return { cycled: true };

    case 'bookmark_page':
      if (activeTab && activeTab.url && activeTab.title && chrome.bookmarks) {
        await chrome.bookmarks.create({
          title: activeTab.title,
          url: activeTab.url
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

/**
 * Helper to send message to tab content script safely
 */
async function sendToTab(tabId, msg) {
  try {
    return await chrome.tabs.sendMessage(tabId, msg);
  } catch (err) {
    // Content script might not be injected in chrome:// or special pages
    return { status: 'no_content_script', message: err.message };
  }
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
