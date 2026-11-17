/**
 * YouTube-specific video player controller for DeskDeck-Solo
 * Handles YouTube HTML5 video player, #movie_player API, playback rate, seeking, and PiP.
 */

(function () {
  'use strict';

  /**
   * Check if current page is YouTube
   * @returns {boolean}
   */
  function isYouTube() {
    return window.location.hostname.includes('youtube.com');
  }

  /**
   * Get YouTube #movie_player DOM element (exposes YouTube JS API)
   * @returns {HTMLElement|null}
   */
  function getYouTubePlayer() {
    return document.getElementById('movie_player') || document.querySelector('.html5-video-player');
  }

  /**
   * Get YouTube main HTML5 video element
   * @returns {HTMLVideoElement|null}
   */
  function getYouTubeVideo() {
    return (
      document.querySelector('video.html5-main-video') ||
      document.querySelector('.html5-video-container video') ||
      document.querySelector('video')
    );
  }

  /**
   * Toggle play/pause on YouTube player
   */
  function togglePlayPause() {
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();

    if (player && typeof player.getPlayerState === 'function') {
      const state = player.getPlayerState();
      // PlayerState: 1 = PLAYING, 2 = PAUSED, 3 = BUFFERING
      if (state === 1) {
        if (typeof player.pauseVideo === 'function') player.pauseVideo();
      } else {
        if (typeof player.playVideo === 'function') player.playVideo();
      }
    } else if (video) {
      if (video.paused) {
        video.play().catch(() => {});
      } else {
        video.pause();
      }
    }
  }

  /**
   * Explicit play
   */
  function play() {
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();
    if (player && typeof player.playVideo === 'function') {
      player.playVideo();
    } else if (video) {
      video.play().catch(() => {});
    }
  }

  /**
   * Explicit pause
   */
  function pause() {
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();
    if (player && typeof player.pauseVideo === 'function') {
      player.pauseVideo();
    } else if (video) {
      video.pause();
    }
  }

  /**
   * Seek operation on YouTube player
   * @param {number} value - Delta in seconds (relative) or target time in seconds (absolute)
   * @param {boolean} [isRelative=true] - True for relative seek, false for absolute seek
   */
  function seek(value, isRelative = true) {
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();

    let targetTime = 0;
    let duration = 0;

    if (player && typeof player.getDuration === 'function') {
      duration = player.getDuration() || (video ? video.duration : 0);
    } else if (video) {
      duration = video.duration || 0;
    }

    if (isRelative) {
      let currentTime = 0;
      if (player && typeof player.getCurrentTime === 'function') {
        currentTime = player.getCurrentTime();
      } else if (video) {
        currentTime = video.currentTime;
      }
      targetTime = currentTime + value;
    } else {
      targetTime = value;
    }

    if (duration > 0) {
      targetTime = Math.max(0, Math.min(duration, targetTime));
    } else {
      targetTime = Math.max(0, targetTime);
    }

    const beforeTime =
      player && typeof player.getCurrentTime === 'function'
        ? player.getCurrentTime()
        : video
          ? video.currentTime
          : targetTime;

    if (player && typeof player.seekTo === 'function') {
      player.seekTo(targetTime, true);
    } else if (video) {
      video.currentTime = targetTime;
    }

    showSeekFeedback(video, targetTime - beforeTime, targetTime, duration);
  }

  let seekToastEl = null;
  let seekToastTimer = null;

  function formatClock(totalSeconds) {
    const s = Math.max(0, Math.floor(totalSeconds || 0));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
    return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(secs).padStart(2, '0')}`;
  }

  /**
   * Brief on-video feedback after a seek ("+24s → 12:34 / 45:00"),
   * shown for ~1.2s. Jog seeking in particular moves blind without it.
   */
  function showSeekFeedback(video, deltaSeconds, landedTime, totalDuration) {
    if (!video) return;
    const rect = video.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    if (!seekToastEl) {
      seekToastEl = document.createElement('div');
      seekToastEl.style.cssText =
        'position:fixed;z-index:2147483647;pointer-events:none;' +
        'background:rgba(0,0,0,0.78);color:#fff;' +
        'font:600 14px/1.4 system-ui,sans-serif;padding:8px 16px;' +
        'border-radius:999px;transform:translateX(-50%);' +
        'opacity:0;transition:opacity 0.18s ease;white-space:nowrap;';
      document.documentElement.appendChild(seekToastEl);
    }

    const delta = Math.round(deltaSeconds);
    const sign = delta >= 0 ? '+' : '-';
    seekToastEl.textContent =
      `${sign}${Math.abs(delta)}s → ` +
      `${formatClock(landedTime)} / ${formatClock(totalDuration)}`;
    seekToastEl.style.left = `${rect.left + rect.width / 2}px`;
    seekToastEl.style.top = `${rect.top + Math.max(12, rect.height * 0.12)}px`;
    seekToastEl.style.opacity = '1';

    if (seekToastTimer) clearTimeout(seekToastTimer);
    seekToastTimer = setTimeout(() => {
      if (seekToastEl) seekToastEl.style.opacity = '0';
    }, 1200);
  }

  function showInfoToast(video, text) {
    if (!video) return;
    const rect = video.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;

    if (!seekToastEl) {
      seekToastEl = document.createElement('div');
      seekToastEl.style.cssText =
        'position:fixed;z-index:2147483647;pointer-events:none;' +
        'background:rgba(0,0,0,0.78);color:#fff;' +
        'font:600 14px/1.4 system-ui,sans-serif;padding:8px 16px;' +
        'border-radius:999px;transform:translateX(-50%);' +
        'opacity:0;transition:opacity 0.18s ease;white-space:nowrap;';
      document.documentElement.appendChild(seekToastEl);
    }

    seekToastEl.textContent = text;
    seekToastEl.style.left = `${rect.left + rect.width / 2}px`;
    seekToastEl.style.top = `${rect.top + Math.max(12, rect.height * 0.12)}px`;
    seekToastEl.style.opacity = '1';

    if (seekToastTimer) clearTimeout(seekToastTimer);
    seekToastTimer = setTimeout(() => {
      if (seekToastEl) seekToastEl.style.opacity = '0';
    }, 2400);
  }

  /**
   * Fullscreen and PiP require a recent real touch inside the page
   * (transient activation); a click in the side panel does not count,
   * and even clicking the player's own button from a script cannot
   * substitute. When no activation is present the request will have
   * been rejected, so say what to do instead of failing silently.
   */
  function hintActivationIfNeeded(video) {
    if (navigator.userActivation && !navigator.userActivation.isActive) {
      showInfoToast(video, '先に動画をタッチしてから押してください');
    }
  }

  /**
   * Tap an element the way a finger would: the full pointer/mouse
   * sequence, not a bare click(). Some player controls arm their
   * handlers on pointerdown and ignore a synthetic click alone.
   */
  function tapElement(el) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const opts = {
      bubbles: true,
      cancelable: true,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
    };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.dispatchEvent(new MouseEvent('click', opts));
  }

  /**
   * Change playback speed (0.25x - 3.0x)
   * @param {number} rate - Target playback rate
   */
  function setPlaybackRate(rate) {
    const clampedRate = Math.max(0.25, Math.min(3.0, Number(rate) || 1.0));
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();

    if (player && typeof player.setPlaybackRate === 'function') {
      player.setPlaybackRate(clampedRate);
    }

    if (video) {
      video.playbackRate = clampedRate;
    }
  }

  /**
   * Toggle Picture-in-Picture mode
   */
  async function togglePip() {
    const video = getYouTubeVideo();

    if (document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch (err) {
        console.debug('YouTube PiP exit error:', err);
      }
      return;
    }

    // Prefer the player's own PiP button, like fullscreen: the raw
    // requestPictureInPicture() call is rejected when it is triggered
    // from the side panel (no user activation in the page), which used
    // to land in the extension's error list as a scary-looking warning
    // even though the fallback then worked. The API stays as the
    // fallback for layouts without the button, and its (expected)
    // rejection is only debug-logged.
    const pipBtn = document.querySelector('.ytp-pip-button');
    if (pipBtn) {
      tapElement(pipBtn);
    } else if (video && document.pictureInPictureEnabled) {
      try {
        await video.requestPictureInPicture();
      } catch (err) {
        console.debug('YouTube video.requestPictureInPicture failed:', err);
      }
    }

    // Verify instead of guessing: if PiP did not engage, say so on the
    // video itself rather than failing silently.
    setTimeout(() => {
      if (!document.pictureInPictureElement) {
        showInfoToast(video, 'PiPにできませんでした。動画タッチ直後に押してください');
      }
    }, 900);
  }

  /**
   * Set volume (0-100)
   * @param {number} valPercent
   */
  function setVolume(valPercent) {
    const volume = Math.max(0, Math.min(100, Number(valPercent) || 0));
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();

    if (player && typeof player.setVolume === 'function') {
      player.setVolume(volume);
    }
    if (video) {
      video.volume = volume / 100;
    }
  }

  /**
   * Toggle mute
   */
  function toggleMute() {
    const player = getYouTubePlayer();
    const video = getYouTubeVideo();

    if (player && typeof player.isMuted === 'function') {
      if (player.isMuted()) {
        if (typeof player.unMute === 'function') player.unMute();
      } else {
        if (typeof player.mute === 'function') player.mute();
      }
    } else if (video) {
      video.muted = !video.muted;
    }
  }

  /**
   * Skip to next video
   */
  function nextTrack() {
    // Click the player's own Next button whenever it exists. Do not gate
    // on visibility (offsetParent): in tablet mode the control bar stays
    // display:none until the screen is touched, which failed the check and
    // silently fell back to a +10s seek. A "Next Video" button must never
    // quietly become a seek button, so when no video navigation exists
    // this deliberately does nothing.
    const nextBtn = document.querySelector('.ytp-next-button');
    if (nextBtn) {
      nextBtn.click();
      return;
    }

    const player = getYouTubePlayer();
    if (player && typeof player.nextVideo === 'function') {
      player.nextVideo();
    }
  }

  /**
   * Skip to previous video
   */
  function prevTrack() {
    // Same reasoning as nextTrack: no visibility gate, no seek fallback.
    const prevBtn = document.querySelector('.ytp-prev-button');
    if (prevBtn) {
      prevBtn.click();
      return;
    }

    const player = getYouTubePlayer();
    if (player && typeof player.previousVideo === 'function') {
      player.previousVideo();
    }
  }

  /**
   * Handle incoming action message on YouTube
   * @param {string} action
   * @param {Object} [payload]
   * @returns {boolean} True if handled
   */
  function handleAction(action, payload = {}) {
    if (!isYouTube()) return false;

    switch (action) {
      case 'media_play_pause':
      case 'play_pause':
        togglePlayPause();
        return true;

      case 'media_play':
      case 'play':
        play();
        return true;

      case 'media_pause':
      case 'pause':
        pause();
        return true;

      case 'seek':
      case 'seek_relative':
      case 'media_seek': {
        const delta = payload.seconds ?? payload.value ?? payload.delta ?? 0;
        const isRelative = payload.absolute === undefined && payload.isRelative !== false;
        seek(delta, isRelative);
        return true;
      }

      case 'seek_dial':
      case 'scroll_dial': {
        const value = payload.value ?? 50;
        const deltaSeconds = (value - 50) * 0.2; // Dial rotation mapped to relative seek
        if (deltaSeconds !== 0) {
          seek(deltaSeconds, true);
        }
        return true;
      }

      case 'set_speed':
      case 'set_playback_rate':
      case 'playback_rate': {
        const rate = payload.value ?? payload.rate ?? payload.speed ?? 1.0;
        setPlaybackRate(rate);
        return true;
      }

      case 'toggle_pip':
      case 'pip':
      case 'toggle_picture_in_picture':
        togglePip();
        return true;

      case 'set_volume':
        setVolume(payload.value ?? 100);
        return true;

      case 'toggle_mute':
        toggleMute();
        return true;

      case 'media_next':
      case 'next_track':
        nextTrack();
        return true;

      case 'media_prev':
      case 'prev_track':
        prevTrack();
        return true;

      case 'pad_action': {
        const padId = payload.padId;
        if (padId === 'play') play();
        else if (padId === 'pause') pause();
        else if (padId === 'play_pause') togglePlayPause();
        // The ±10s pads always seek, even on YouTube; moving between
        // videos lives on the dedicated video navigation pads.
        else if (padId === 'back10') seek(-10, true);
        else if (padId === 'fwd10') seek(10, true);
        else if (padId === 'prev_video') prevTrack();
        else if (padId === 'next_video') nextTrack();
        else if (padId === 'pip') togglePip();
        else if (padId === 'fullscreen') {
          // Go through the player's own fullscreen button: a scripted
          // requestFullscreen() triggered from the side panel lacks the
          // user activation the page needs, and in practice only works
          // after the video itself was clicked. The button path works
          // without that warm-up click.
          const wasFullscreen = !!document.fullscreenElement;
          const fsBtn = document.querySelector('.ytp-fullscreen-button');
          if (fsBtn) {
            tapElement(fsBtn);
          } else if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
          if (!wasFullscreen) {
            // Verify instead of guessing: if fullscreen did not engage,
            // tell the user on the video itself.
            const video = getYouTubeVideo();
            setTimeout(() => {
              if (!document.fullscreenElement) {
                showInfoToast(video, '全画面にできませんでした。動画タッチ直後に押してください');
              }
            }, 900);
          }
        } else if (padId === 'prev') prevTrack();
        else if (padId === 'next') nextTrack();
        else togglePlayPause();
        return true;
      }

      default:
        return false;
    }
  }

  // Export YouTube controller on window object
  window.DeskDeckYouTube = {
    isYouTube,
    getYouTubePlayer,
    getYouTubeVideo,
    togglePlayPause,
    play,
    pause,
    seek,
    setPlaybackRate,
    togglePip,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
    handleAction,
  };
})();
