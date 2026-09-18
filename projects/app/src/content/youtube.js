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

    if (player && typeof player.seekTo === 'function') {
      player.seekTo(targetTime, true);
    } else if (video) {
      video.currentTime = targetTime;
    }
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
        console.warn('YouTube PiP exit error:', err);
      }
      return;
    }

    if (video && document.pictureInPictureEnabled) {
      try {
        await video.requestPictureInPicture();
        return;
      } catch (err) {
        console.warn('YouTube video.requestPictureInPicture failed, trying fallback:', err);
      }
    }

    // Fallback: Click YouTube PiP button if available
    const pipBtn = document.querySelector('.ytp-pip-button');
    if (pipBtn) {
      pipBtn.click();
    }
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
   * Skip to next track/video
   */
  function nextTrack() {
    const player = getYouTubePlayer();
    const nextBtn = document.querySelector('.ytp-next-button');

    if (nextBtn && nextBtn.offsetParent !== null) {
      nextBtn.click();
    } else if (player && typeof player.nextVideo === 'function') {
      player.nextVideo();
    } else {
      seek(10, true);
    }
  }

  /**
   * Skip to previous track/video or seek -10s
   */
  function prevTrack() {
    const player = getYouTubePlayer();
    const prevBtn = document.querySelector('.ytp-prev-button');

    if (prevBtn && prevBtn.offsetParent !== null) {
      prevBtn.click();
    } else if (player && typeof player.previousVideo === 'function') {
      player.previousVideo();
    } else {
      seek(-10, true);
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
        else if (padId === 'prev') prevTrack();
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
    handleAction
  };
})();
