/**
 * Local storage helper module wrapping chrome.storage.local
 * with fallback to window.localStorage for non-extension environments.
 */

const STORAGE_KEYS = {
  ACTIVE_DECK: 'deskdeck_active_deck',
  DECK_SLOT_STATES: 'deskdeck_slot_states',
  SETTINGS: 'deskdeck_settings'
};

const DEFAULT_SETTINGS = {
  soundEffects: true,
  hapticFeedback: true
};

/**
 * Get active deck ID from storage
 * @returns {Promise<string>}
 */
export async function getActiveDeckId() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.ACTIVE_DECK], (result) => {
        resolve(result[STORAGE_KEYS.ACTIVE_DECK] || 'media');
      });
    });
  } else {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_DECK) || 'media';
    } catch {
      return 'media';
    }
  }
}

/**
 * Save active deck ID to storage
 * @param {string} deckId
 * @returns {Promise<void>}
 */
export async function setActiveDeckId(deckId) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.ACTIVE_DECK]: deckId }, () => {
        resolve();
      });
    });
  } else {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_DECK, deckId);
    } catch (error) {
      console.warn('Unable to save the active deck to localStorage:', error);
    }
  }
}

/**
 * Get stored slot states for a deck
 * @param {string} deckId
 * @returns {Promise<Object|null>}
 */
export async function getDeckSlotStates(deckId) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.DECK_SLOT_STATES], (result) => {
        const allStates = result[STORAGE_KEYS.DECK_SLOT_STATES] || {};
        resolve(allStates[deckId] || null);
      });
    });
  } else {
    try {
      const allStates = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_SLOT_STATES) || '{}');
      return allStates[deckId] || null;
    } catch {
      return null;
    }
  }
}

/**
 * Save slot state for a deck
 * @param {string} deckId
 * @param {Object} slotStates
 * @returns {Promise<void>}
 */
export async function saveDeckSlotStates(deckId, slotStates) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.DECK_SLOT_STATES], (result) => {
        const allStates = result[STORAGE_KEYS.DECK_SLOT_STATES] || {};
        allStates[deckId] = { ...(allStates[deckId] || {}), ...slotStates };
        chrome.storage.local.set({ [STORAGE_KEYS.DECK_SLOT_STATES]: allStates }, () => {
          resolve();
        });
      });
    });
  } else {
    try {
      const allStates = JSON.parse(localStorage.getItem(STORAGE_KEYS.DECK_SLOT_STATES) || '{}');
      allStates[deckId] = { ...(allStates[deckId] || {}), ...slotStates };
      localStorage.setItem(STORAGE_KEYS.DECK_SLOT_STATES, JSON.stringify(allStates));
    } catch {
      // ignore write errors in fallback
    }
  }
}

/**
 * Get app settings
 * @returns {Promise<Object>}
 */
export async function getSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SETTINGS], (result) => {
        resolve({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] || {}) });
      });
    });
  } else {
    try {
      const settings = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
      return { ...DEFAULT_SETTINGS, ...settings };
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
}

/**
 * Save app settings
 * @param {Object} settings
 * @returns {Promise<void>}
 */
export async function saveSettings(settings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        resolve();
      });
    });
  } else {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.warn('Unable to save settings to localStorage:', error);
    }
  }
}
