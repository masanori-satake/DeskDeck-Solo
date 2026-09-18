/**
 * System control module for DeskDeck-Solo
 * Copyright (c) 2026 Masanori SATAKE
 *
 * Provides functions for sleep prevention (chrome.power),
 * pseudo brightness adjustment (CSS overlay opacity via content script),
 * and background tab muting (chrome.tabs).
 */

const STORAGE_KEY_KEEP_AWAKE = 'deskdeck_keep_awake';

/**
 * Get current keep awake status from storage.
 * @returns {Promise<boolean>}
 */
export async function getKeepAwakeStatus() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEY_KEEP_AWAKE], (result) => {
        if (chrome.runtime && chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(Boolean(result[STORAGE_KEY_KEEP_AWAKE]));
      });
    });
  }
  return false;
}

/**
 * Toggle or explicitly set keep awake (sleep prevention) state using chrome.power API.
 * Persists state to chrome.storage.local to survive Service Worker restarts.
 * @param {boolean} [enable] - Optional explicit state. If undefined, toggles current state.
 * @returns {Promise<boolean>} Current keep awake status.
 */
export async function toggleKeepAwake(enable) {
  const currentStatus = await getKeepAwakeStatus();
  const shouldEnable = enable !== undefined ? Boolean(enable) : !currentStatus;

  if (typeof chrome !== 'undefined' && chrome.power) {
    try {
      if (shouldEnable) {
        chrome.power.requestKeepAwake('display');
      } else {
        chrome.power.releaseKeepAwake();
      }
    } catch (err) {
      console.warn('chrome.power keep awake operation failed:', err);
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEY_KEEP_AWAKE]: shouldEnable }, () => {
        if (chrome.runtime && chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  }

  return shouldEnable;
}

/**
 * Mute all background (non-active) tabs using chrome.tabs API.
 * @returns {Promise<{mutedCount: number, totalTabs: number}>}
 */
export async function muteBackgroundTabs() {
  let mutedCount = 0;
  let totalTabs = 0;

  if (typeof chrome !== 'undefined' && chrome.tabs) {
    try {
      const backgroundTabs = await new Promise((resolve) => {
        chrome.tabs.query({ active: false }, (tabs) => {
          if (chrome.runtime && chrome.runtime.lastError) resolve([]);
          else resolve(tabs || []);
        });
      });

      totalTabs = backgroundTabs.length;

      const mutePromises = backgroundTabs.map((tab) => {
        if (!tab.id) return Promise.resolve();
        return new Promise((resolve) => {
          chrome.tabs.update(tab.id, { muted: true }, () => {
            if (!chrome.runtime || !chrome.runtime.lastError) {
              mutedCount++;
            }
            resolve();
          });
        });
      });

      await Promise.all(mutePromises);
    } catch (err) {
      console.warn('Muting background tabs failed:', err);
    }
  }

  return { mutedCount, totalTabs };
}

/**
 * Calculate overlay opacity for given brightness or opacity value.
 * Opacity is strictly clamped between 0.0 (0%) and 0.8 (80%).
 * If input is brightness percentage (10% - 100%), 100% brightness = 0% dim opacity,
 * and 20% brightness = 80% dim opacity.
 * @param {number} value - Brightness or opacity percentage/decimal.
 * @param {boolean} [isBrightnessValue=true] - Whether input value represents brightness (100 = bright/0% dark overlay).
 * @returns {number} Clamped opacity decimal between 0.0 and 0.8
 */
export function calculateDimmerOpacity(value, isBrightnessValue = true) {
  let numVal = Number(value);
  if (isNaN(numVal)) numVal = 100;

  let opacityDecimal = 0;

  if (isBrightnessValue) {
    if (numVal <= 1.0 && numVal >= 0) {
      numVal = numVal * 100;
    }
    const brightnessClamped = Math.max(20, Math.min(100, numVal));
    opacityDecimal = (100 - brightnessClamped) / 100;
  } else {
    if (numVal > 1.0) {
      opacityDecimal = numVal / 100;
    } else {
      opacityDecimal = numVal;
    }
  }

  return Math.max(0.0, Math.min(0.8, opacityDecimal));
}

/**
 * Send brightness/dimmer control message to target or active tab.
 * @param {number|null} tabId - Target tab ID. If null, sends to active tab in current window.
 * @param {number} opacityOrBrightness - Value representing brightness or opacity.
 * @param {boolean} [isBrightnessValue=true] - Whether value is brightness level.
 * @returns {Promise<Object>} Response from content script.
 */
export async function setTabBrightness(tabId, opacityOrBrightness, isBrightnessValue = true) {
  const opacity = calculateDimmerOpacity(opacityOrBrightness, isBrightnessValue);

  if (typeof chrome === 'undefined' || !chrome.tabs) {
    return { handled: false, opacity };
  }

  let targetTabId = tabId;

  if (!targetTabId) {
    const [activeTab] = await new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs || []);
      });
    });
    if (activeTab && activeTab.id) {
      targetTabId = activeTab.id;
    }
  }

  if (!targetTabId) {
    return { handled: false, opacity, reason: 'No active tab found' };
  }

  try {
    const response = await new Promise((resolve) => {
      chrome.tabs.sendMessage(
        targetTabId,
        { action: 'set_dimmer_opacity', payload: { opacity, value: opacityOrBrightness } },
        (res) => {
          if (chrome.runtime && chrome.runtime.lastError) {
            resolve({ handled: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(res || { handled: true });
          }
        }
      );
    });
    return { ...response, opacity };
  } catch (err) {
    return { handled: false, opacity, error: err.message };
  }
}
