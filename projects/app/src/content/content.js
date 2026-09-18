/**
 * Content script for DeskDeck-Solo
 * Executes page-level deck controls (media playback, scrolling, page zoom/theme)
 */

function handleContentMessage(message, sender, sendResponse) {
  if (!message || !message.action) return;

  const { action, payload } = message;

  switch (action) {
    case 'media_play_pause':
      toggleMediaPlayback();
      sendResponse({ handled: true });
      break;

    case 'set_volume':
      setPageMediaVolume(payload.value);
      sendResponse({ handled: true });
      break;

    case 'toggle_mute':
      togglePageMediaMute();
      sendResponse({ handled: true });
      break;

    case 'media_next':
      skipMediaTrack(1);
      sendResponse({ handled: true });
      break;

    case 'media_prev':
      skipMediaTrack(-1);
      sendResponse({ handled: true });
      break;

    case 'toggle_fullscreen':
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
      sendResponse({ handled: true });
      break;

    case 'page_up':
      window.scrollBy({ top: -window.innerHeight * 0.8, behavior: 'smooth' });
      sendResponse({ handled: true });
      break;

    case 'page_down':
      window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' });
      sendResponse({ handled: true });
      break;

    case 'scroll_dial':
      const delta = (payload.value - 50) * 10;
      window.scrollBy({ top: delta, behavior: 'smooth' });
      sendResponse({ handled: true });
      break;

    case 'toggle_dark_reader':
      toggleDarkReaderOverlay();
      sendResponse({ handled: true });
      break;

    case 'toggle_mic_mute':
    case 'toggle_camera':
    case 'raise_hand':
    case 'leave_call':
      attemptWebMeetingAction(action);
      sendResponse({ handled: true });
      break;

    default:
      sendResponse({ handled: false });
  }

  return true;
}

if (!globalThis.__deskDeckContentListenerRegistered) {
  globalThis.__deskDeckContentListenerRegistered = true;
  chrome.runtime.onMessage.addListener(handleContentMessage);
}

function toggleMediaPlayback() {
  const mediaElements = document.querySelectorAll('video, audio');
  if (mediaElements.length > 0) {
    let hasPlaying = false;
    mediaElements.forEach((m) => {
      if (!m.paused) hasPlaying = true;
    });

    mediaElements.forEach((m) => {
      if (hasPlaying) {
        m.pause();
      } else {
        m.play().catch(() => {});
      }
    });
  }
}

function setPageMediaVolume(valPercent) {
  const mediaElements = document.querySelectorAll('video, audio');
  const volume = Math.max(0, Math.min(1, valPercent / 100));
  mediaElements.forEach((m) => {
    m.volume = volume;
  });
}

function togglePageMediaMute() {
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach((m) => {
    m.muted = !m.muted;
  });
}

function skipMediaTrack(direction) {
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach((m) => {
    if (!isNaN(m.duration)) {
      m.currentTime = Math.max(0, Math.min(m.duration, m.currentTime + direction * 10));
    }
  });
}

function toggleDarkReaderOverlay() {
  let overlay = document.getElementById('deskdeck-dark-filter');
  if (overlay) {
    overlay.remove();
  } else {
    overlay = document.createElement('div');
    overlay.id = 'deskdeck-dark-filter';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 9999999;
      mix-blend-mode: multiply;
    `;
    document.body.appendChild(overlay);
  }
}

function attemptWebMeetingAction(action) {
  // Generic selector fallback for Google Meet / Zoom / Teams web buttons
  const selectors = {
    toggle_mic_mute: ['[aria-label*="mute"]', '[aria-label*="マイク"]', 'button[data-is-muted]'],
    toggle_camera: ['[aria-label*="camera"]', '[aria-label*="カメラ"]'],
    raise_hand: ['[aria-label*="hand"]', '[aria-label*="挙手"]'],
    leave_call: ['[aria-label*="leave"]', '[aria-label*="退出"]', '[aria-label*="通話の終了"]']
  };

  const currentSelectors = selectors[action] || [];
  for (const selector of currentSelectors) {
    const btn = document.querySelector(selector);
    if (btn) {
      btn.click();
      break;
    }
  }
}
