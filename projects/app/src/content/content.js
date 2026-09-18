/**
 * Content script for DeskDeck-Solo
 * Executes page-level deck controls (media playback, video controls, scrolling, page zoom/theme, brightness dimmer overlay)
 */

let darkOverlayHost = null;
let dimmerHost = null;
let dimmerOverlay = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.action) return;

  const { action, payload } = message;

  // Delegate to YouTube-specific handler if on YouTube
  if (
    window.DeskDeckYouTube &&
    window.DeskDeckYouTube.isYouTube &&
    window.DeskDeckYouTube.isYouTube()
  ) {
    const handledByYT = window.DeskDeckYouTube.handleAction(action, payload);
    if (handledByYT) {
      sendResponse({ handled: true, source: 'youtube' });
      return true;
    }
  }

  switch (action) {
    case 'media_play_pause':
    case 'play_pause':
      toggleMediaPlayback();
      sendResponse({ handled: true });
      break;

    case 'media_play':
    case 'play':
      playMedia();
      sendResponse({ handled: true });
      break;

    case 'media_pause':
    case 'pause':
      pauseMedia();
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
    case 'next_track':
      skipMediaTrack(10);
      sendResponse({ handled: true });
      break;

    case 'media_prev':
    case 'prev_track':
      skipMediaTrack(-10);
      sendResponse({ handled: true });
      break;

    case 'seek':
    case 'seek_relative':
    case 'media_seek': {
      const delta = payload ? (payload.seconds ?? payload.value ?? payload.delta ?? 0) : 0;
      const isRelative = payload ? payload.absolute === undefined && payload.isRelative !== false : true;
      seekVideo(delta, isRelative);
      sendResponse({ handled: true });
      break;
    }

    case 'seek_dial':
    case 'scroll_dial': {
      // Relative seek from jog dial rotation
      if (payload && payload.value !== undefined) {
        const deltaSeconds = (payload.value - 50) * 0.2;
        if (deltaSeconds !== 0) {
          seekVideo(deltaSeconds, true);
        }
      } else {
        // Fallback for general page scroll dial
        const delta = ((payload ? payload.value : 50) - 50) * 10;
        window.scrollBy({ top: delta, behavior: 'smooth' });
      }
      sendResponse({ handled: true });
      break;
    }

    case 'set_speed':
    case 'set_playback_rate':
    case 'playback_rate': {
      const rate = payload ? (payload.value ?? payload.rate ?? payload.speed ?? 1.0) : 1.0;
      setVideoSpeed(rate);
      sendResponse({ handled: true });
      break;
    }

    case 'toggle_pip':
    case 'pip':
    case 'toggle_picture_in_picture':
      togglePictureInPicture();
      sendResponse({ handled: true });
      break;

    case 'pad_action': {
      const padId = payload ? payload.padId : null;
      if (padId === 'play') playMedia();
      else if (padId === 'pause') pauseMedia();
      else if (padId === 'prev') skipMediaTrack(-10);
      else if (padId === 'next') skipMediaTrack(10);
      else toggleMediaPlayback();
      sendResponse({ handled: true });
      break;
    }

    case 'set_fader': {
      // Playback fader maps to video volume
      const val = payload ? payload.value : 80;
      setPageMediaVolume(val);
      sendResponse({ handled: true });
      break;
    }

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

    case 'set_brightness': {
      const brightnessVal = payload ? (payload.value ?? payload.brightness ?? 100) : 100;
      // Convert brightness % (10 - 100) to dark overlay opacity (0.0 - 0.8)
      const opacityVal = (100 - Math.max(20, Math.min(100, Number(brightnessVal)))) / 100;
      const appliedOpacity = setDimmerOpacity(opacityVal);
      sendResponse({ handled: true, opacity: appliedOpacity });
      break;
    }

    case 'set_dimmer_opacity':
    case 'set_dimmer': {
      const opacityVal = payload ? (payload.opacity ?? payload.value ?? 0) : 0;
      const appliedOpacity = setDimmerOpacity(opacityVal);
      sendResponse({ handled: true, opacity: appliedOpacity });
      break;
    }

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

/**
 * Automatically detect primary video element on the page.
 * Returns playing video first, or largest visible video element.
 * @returns {HTMLVideoElement|null}
 */
function getPrimaryVideoElement() {
  const videos = Array.from(document.querySelectorAll('video'));
  if (videos.length === 0) return null;

  // 1. Look for currently playing video
  const playing = videos.find((v) => !v.paused && !v.ended && v.readyState > 2);
  if (playing) return playing;

  // 2. Look for largest visible video by bounding client rect area
  let bestVideo = videos[0];
  let maxArea = 0;

  videos.forEach((v) => {
    const rect = v.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > maxArea) {
      maxArea = area;
      bestVideo = v;
    }
  });

  return bestVideo;
}

function toggleMediaPlayback() {
  const primaryVideo = getPrimaryVideoElement();
  if (primaryVideo) {
    if (primaryVideo.paused) {
      primaryVideo.play().catch(() => {});
    } else {
      primaryVideo.pause();
    }
    return;
  }

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

function playMedia() {
  const primaryVideo = getPrimaryVideoElement();
  if (primaryVideo) {
    primaryVideo.play().catch(() => {});
    return;
  }
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach((m) => m.play().catch(() => {}));
}

function pauseMedia() {
  const primaryVideo = getPrimaryVideoElement();
  if (primaryVideo) {
    primaryVideo.pause();
    return;
  }
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach((m) => m.pause());
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

function skipMediaTrack(seconds) {
  seekVideo(seconds, true);
}

function seekVideo(seconds, isRelative = true) {
  const video = getPrimaryVideoElement();
  if (video) {
    let targetTime = isRelative ? video.currentTime + seconds : seconds;
    if (!isNaN(video.duration) && video.duration > 0) {
      targetTime = Math.max(0, Math.min(video.duration, targetTime));
    } else {
      targetTime = Math.max(0, targetTime);
    }
    video.currentTime = targetTime;
  } else {
    const mediaElements = document.querySelectorAll('audio');
    mediaElements.forEach((m) => {
      if (!isNaN(m.duration)) {
        const target = isRelative ? m.currentTime + seconds : seconds;
        m.currentTime = Math.max(0, Math.min(m.duration, target));
      }
    });
  }
}

function setVideoSpeed(rate) {
  const clampedRate = Math.max(0.25, Math.min(3.0, Number(rate) || 1.0));
  const mediaElements = document.querySelectorAll('video, audio');
  mediaElements.forEach((m) => {
    m.playbackRate = clampedRate;
  });
}

async function togglePictureInPicture() {
  if (document.pictureInPictureElement) {
    try {
      await document.exitPictureInPicture();
    } catch (err) {
      console.warn('Exit PiP failed:', err);
    }
    return;
  }

  const video = getPrimaryVideoElement();
  if (video && document.pictureInPictureEnabled) {
    try {
      await video.requestPictureInPicture();
    } catch (err) {
      console.warn('Request PiP failed:', err);
    }
  }
}

function setMicLevel(valPercent) {
  const volume = Math.max(0, Math.min(1, valPercent / 100));
  const audioTracks = [];
  if (window.stream && window.stream.getAudioTracks) {
    window.stream.getAudioTracks().forEach((track) => audioTracks.push(track));
  }
  audioTracks.forEach((track) => {
    track.enabled = volume > 0;
  });
}

/**
 * Get appropriate parent element for dimmer overlay host.
 * If non-root element is in fullscreen, attaches into document.fullscreenElement.
 * @returns {Element}
 */
function getDimmerTargetParent() {
  if (
    document.fullscreenElement &&
    document.fullscreenElement !== document.documentElement &&
    document.fullscreenElement !== document.body
  ) {
    return document.fullscreenElement;
  }
  return document.body || document.documentElement;
}

/**
 * Set pseudo brightness overlay opacity (0.0 to 0.8 / 0% to 80%)
 * Injects top-layer black overlay with pointer-events: none.
 * @param {number} opacityVal - Desired overlay opacity (0.0 to 0.8)
 * @returns {number} Clamped applied opacity
 */
function setDimmerOpacity(opacityVal) {
  let opacity = Number(opacityVal);
  if (isNaN(opacity)) opacity = 0;
  if (opacity > 1.0) opacity = opacity / 100;

  // Clamp opacity strictly between 0% (0.0) and 80% (0.8)
  opacity = Math.max(0.0, Math.min(0.8, opacity));

  if (opacity <= 0.001) {
    if (dimmerHost) {
      dimmerHost.remove();
      dimmerHost = null;
      dimmerOverlay = null;
    }
    return 0;
  }

  const targetParent = getDimmerTargetParent();

  if (!dimmerHost || !document.contains(dimmerHost)) {
    dimmerHost = document.createElement('div');
    dimmerHost.id = 'deskdeck-dimmer-host';
    dimmerHost.style.cssText = 'all: initial;';

    const shadowRoot = dimmerHost.attachShadow({ mode: 'open' });
    dimmerOverlay = document.createElement('div');
    dimmerOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: #000000;
      pointer-events: none;
      z-index: 2147483647;
      transition: opacity 0.15s ease;
    `;
    shadowRoot.appendChild(dimmerOverlay);
    targetParent.appendChild(dimmerHost);
  } else if (dimmerHost.parentElement !== targetParent) {
    targetParent.appendChild(dimmerHost);
  }

  dimmerOverlay.style.opacity = opacity.toFixed(3);
  return opacity;
}

// Reparent dimmer overlay dynamically when entering/exiting fullscreen mode
document.addEventListener('fullscreenchange', () => {
  if (dimmerHost && document.contains(dimmerHost)) {
    const targetParent = getDimmerTargetParent();
    if (dimmerHost.parentElement !== targetParent) {
      targetParent.appendChild(dimmerHost);
    }
  }
});

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
