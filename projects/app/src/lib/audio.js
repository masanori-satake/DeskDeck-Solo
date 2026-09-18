/**
 * Audio feedback and Web Audio API control utility for DeskDeck-Solo.
 * Handles tactile feedback sounds, tab volume amplification (100% to 300%),
 * limiter distortion prevention, and chrome.audio API system controls with fallback.
 */

// Global state for Tab Audio Booster
let boostContext = null;
let boostGainNode = null;
let boostCompressorNode = null;
let boostSourceNode = null;
let boundMediaElement = null;
let cleanupListenersAttached = false;

// Tactile feedback AudioContext instance
let soundEffectsCtx = null;

function getSoundEffectsContext() {
  if (!soundEffectsCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      soundEffectsCtx = new AudioContextClass();
    }
  }
  if (soundEffectsCtx && soundEffectsCtx.state === 'suspended') {
    soundEffectsCtx.resume().catch(() => {});
  }
  return soundEffectsCtx;
}

/**
 * Clamp audio boost level strictly between 1.0 (100%) and 3.0 (300%).
 * Handles both factor numbers (1.0 - 3.0) and percentages (100 - 300).
 * @param {number} level
 * @returns {number} Clamped boost factor in range 1.0 to 3.0
 */
export function clampBoostLevel(level) {
  let val = Number(level);
  if (isNaN(val)) val = 1.0;

  if (val >= 100 && val <= 300) {
    val = val / 100;
  } else if (val > 300) {
    val = 3.0;
  } else if (val < 1.0) {
    val = 1.0;
  }

  return Math.max(1.0, Math.min(3.0, val));
}

/**
 * Initialize or update tab audio gain amplification with Web Audio API.
 * Route: Source -> GainNode -> DynamicsCompressorNode (Limiter) -> Destination
 * @param {HTMLMediaElement} [mediaElement] - Target HTMLMediaElement to connect
 * @param {number} [boostLevel=1.0] - Desired boost level (1.0 to 3.0 or 100% to 300%)
 * @returns {Object|null} Controller state
 */
export function boostTabAudio(mediaElement, boostLevel = 1.0) {
  const targetLevel = clampBoostLevel(boostLevel);

  if (typeof window === 'undefined') return null;

  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!boostContext || boostContext.state === 'closed') {
      boostContext = new AudioContextClass();
    }

    if (boostContext.state === 'suspended') {
      boostContext.resume().catch(() => {});
    }

    if (!boostGainNode) {
      boostGainNode = boostContext.createGain();
    }

    if (!boostCompressorNode) {
      // Simple fast brickwall limiter processing to prevent clipping distortion
      boostCompressorNode = boostContext.createDynamicsCompressor();
      boostCompressorNode.threshold.setValueAtTime(-1.0, boostContext.currentTime);
      boostCompressorNode.knee.setValueAtTime(0, boostContext.currentTime);
      boostCompressorNode.ratio.setValueAtTime(20, boostContext.currentTime);
      boostCompressorNode.attack.setValueAtTime(0.003, boostContext.currentTime);
      boostCompressorNode.release.setValueAtTime(0.1, boostContext.currentTime);
    }

    if (mediaElement && mediaElement instanceof HTMLMediaElement) {
      if (boundMediaElement !== mediaElement || !boostSourceNode) {
        if (boostSourceNode) {
          try { boostSourceNode.disconnect(); } catch {}
        }
        boostSourceNode = boostContext.createMediaElementSource(mediaElement);
        boundMediaElement = mediaElement;

        // Connect chain: Source -> Gain -> Limiter -> Destination
        boostSourceNode.connect(boostGainNode);
        boostGainNode.connect(boostCompressorNode);
        boostCompressorNode.connect(boostContext.destination);
      }
    }

    boostGainNode.gain.setValueAtTime(targetLevel, boostContext.currentTime);

    attachCleanupListeners();

    return {
      context: boostContext,
      gainNode: boostGainNode,
      compressorNode: boostCompressorNode,
      level: targetLevel
    };
  } catch (err) {
    console.warn('Tab audio boost initialization failed:', err);
    return null;
  }
}

/**
 * Set boost level for active tab audio session
 * @param {number} boostLevel
 * @returns {number} Applied clamped boost level
 */
export function setBoostLevel(boostLevel) {
  const level = clampBoostLevel(boostLevel);
  if (boostGainNode && boostContext) {
    boostGainNode.gain.setValueAtTime(level, boostContext.currentTime);
  } else {
    boostTabAudio(boundMediaElement, level);
  }
  return level;
}

/**
 * Clean up AudioContext and disconnect Web Audio API nodes to prevent memory leaks.
 */
export function cleanupTabAudioBoost() {
  if (boostSourceNode) {
    try { boostSourceNode.disconnect(); } catch {}
    boostSourceNode = null;
  }
  if (boostGainNode) {
    try { boostGainNode.disconnect(); } catch {}
    boostGainNode = null;
  }
  if (boostCompressorNode) {
    try { boostCompressorNode.disconnect(); } catch {}
    boostCompressorNode = null;
  }
  if (boostContext) {
    try {
      if (boostContext.state !== 'closed') {
        boostContext.close().catch(() => {});
      }
    } catch {}
    boostContext = null;
  }
  boundMediaElement = null;
  detachCleanupListeners();
}

function handlePageUnload() {
  cleanupTabAudioBoost();
}

function attachCleanupListeners() {
  if (cleanupListenersAttached || typeof window === 'undefined') return;
  window.addEventListener('beforeunload', handlePageUnload);
  window.addEventListener('unload', handlePageUnload);
  window.addEventListener('pagehide', handlePageUnload);
  cleanupListenersAttached = true;
}

function detachCleanupListeners() {
  if (!cleanupListenersAttached || typeof window === 'undefined') return;
  window.removeEventListener('beforeunload', handlePageUnload);
  window.removeEventListener('unload', handlePageUnload);
  window.removeEventListener('pagehide', handlePageUnload);
  cleanupListenersAttached = false;
}

/**
 * Check if Chrome OS chrome.audio API is available
 * @returns {boolean}
 */
export function isChromeAudioSupported() {
  return typeof chrome !== 'undefined' && Boolean(chrome.audio);
}

/**
 * Set system volume (0 to 100) using chrome.audio API on Chrome OS, with fallback to DOM media elements.
 * @param {number} volumePercent
 * @returns {Promise<boolean>} Success status
 */
export async function setSystemVolume(volumePercent) {
  const vol = Math.max(0, Math.min(100, Number(volumePercent) || 0));

  if (isChromeAudioSupported()) {
    try {
      const devices = await new Promise((resolve) => {
        chrome.audio.getDevices({ streamTypes: ['OUTPUT'] }, (devs) => {
          if (chrome.runtime && chrome.runtime.lastError) resolve([]);
          else resolve(devs || []);
        });
      });

      const activeOutput = devices.find((d) => d.isActive) || devices[0];
      if (activeOutput) {
        await new Promise((resolve) => {
          chrome.audio.setProperties(activeOutput.id, { volume: Math.round(vol) }, () => resolve());
        });
        return true;
      }
    } catch (err) {
      console.warn('chrome.audio.setProperties failed, using fallback:', err);
    }
  }

  // Fallback: set HTML media elements volume
  if (typeof document !== 'undefined') {
    const mediaElements = document.querySelectorAll('video, audio');
    const ratio = vol / 100;
    mediaElements.forEach((m) => {
      m.volume = ratio;
    });
    return true;
  }

  return false;
}

/**
 * Set system output mute state using chrome.audio API with DOM media elements fallback.
 * @param {boolean} muted
 * @returns {Promise<boolean>} Success status
 */
export async function setSystemMute(muted) {
  const isMuted = Boolean(muted);

  if (isChromeAudioSupported()) {
    try {
      await new Promise((resolve) => {
        chrome.audio.setMute('OUTPUT', isMuted, () => resolve());
      });
      return true;
    } catch (err) {
      console.warn('chrome.audio.setMute OUTPUT failed, using fallback:', err);
    }
  }

  // Fallback: toggle muted on DOM media elements
  if (typeof document !== 'undefined') {
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((m) => {
      m.muted = isMuted;
    });
    return true;
  }

  return false;
}

/**
 * Set system microphone mute state using chrome.audio API with MediaStreamTrack fallback.
 * @param {boolean} muted
 * @returns {Promise<boolean>} Success status
 */
export async function setMicMute(muted) {
  const isMuted = Boolean(muted);

  if (isChromeAudioSupported()) {
    try {
      await new Promise((resolve) => {
        chrome.audio.setMute('INPUT', isMuted, () => resolve());
      });
      return true;
    } catch (err) {
      console.warn('chrome.audio.setMute INPUT failed, using fallback:', err);
    }
  }

  // Fallback: toggle enabled on active MediaStream audio tracks
  if (typeof window !== 'undefined' && window.stream && window.stream.getAudioTracks) {
    window.stream.getAudioTracks().forEach((track) => {
      track.enabled = !isMuted;
    });
    return true;
  }

  return false;
}

/**
 * Play a light click/tick sound for knob rotation
 */
export function playKnobTickSound() {
  try {
    const ctx = getSoundEffectsContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.02);
  } catch {
    // Audio context initialization error or blocked by policy
  }
}

/**
 * Play switch toggle sound
 * @param {boolean} newState
 */
export function playSwitchSound(newState) {
  try {
    const ctx = getSoundEffectsContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const startFreq = newState ? 440 : 330;
    const endFreq = newState ? 880 : 220;

    osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {
    // ignore
  }
}

/**
 * Play button press sound
 */
export function playButtonSound() {
  try {
    const ctx = getSoundEffectsContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(220, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.04);
  } catch {
    // ignore
  }
}

/**
 * Trigger haptic vibration if supported (useful on Chromebook touchscreen / tablet mode)
 * @param {number} [duration=15]
 */
export function triggerHaptic(duration = 15) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(duration);
    } catch {
      // ignore
    }
  }
}
