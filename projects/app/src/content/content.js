/**
 * Content script for DeskDeck-Solo
 * Executes page-level deck controls (media playback, scrolling, page zoom/theme)
 */

let darkOverlayHost = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  const { action, payload } = message;

  switch (action) {
    case 'media_play_pause':
      toggleMediaPlayback();
      sendResponse({ handled: true });
      break;

    case 'set_volume':
      setPageMediaVolume(payload ? payload.value : 100);
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

    case 'set_mic_level':
      setMicLevel(payload ? payload.value : 100);
      sendResponse({ handled: true, micLevel: payload ? payload.value : 100 });
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
      const delta = ((payload ? payload.value : 50) - 50) * 10;
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
});

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

function setMicLevel(valPercent) {
  // If web meeting media stream input elements exist or page audio context exists
  const volume = Math.max(0, Math.min(1, valPercent / 100));
  const audioTracks = [];
  if (window.stream && window.stream.getAudioTracks) {
    window.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
  }
  audioTracks.forEach((track) => {
    track.enabled = volume > 0;
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
  if (darkOverlayHost) {
    darkOverlayHost.remove();
    darkOverlayHost = null;
  } else {
    darkOverlayHost = document.createElement('div');
    darkOverlayHost.id = 'deskdeck-dark-host';
    darkOverlayHost.style.cssText = 'all: initial;';

    const shadowRoot = darkOverlayHost.attachShadow({ mode: 'open' });
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.35);
      pointer-events: none;
      z-index: 2147483647;
      mix-blend-mode: multiply;
    `;
    shadowRoot.appendChild(overlay);
    (document.body || document.documentElement).appendChild(darkOverlayHost);
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
