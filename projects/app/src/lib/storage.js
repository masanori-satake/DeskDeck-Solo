/**
 * Local storage helper module wrapping chrome.storage.local
 * with fallback to window.localStorage for non-extension environments.
 */

const STORAGE_KEYS = {
  ACTIVE_DECK: 'deskdeck_active_deck',
  DECK_SLOT_STATES: 'deskdeck_slot_states',
  SLOT_MAPPINGS: 'deskdeck_slot_mappings',
  SETTINGS: 'deskdeck_settings',
};

const DEFAULT_SETTINGS = {
  soundEffects: true,
  hapticFeedback: true,
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
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_DECK) || 'media';
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
    localStorage.setItem(STORAGE_KEYS.ACTIVE_DECK, deckId);
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
 * Get slot mappings
 * @returns {Promise<Object>}
 */
export async function getSlotMappings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.SLOT_MAPPINGS], (result) => {
        resolve(result[STORAGE_KEYS.SLOT_MAPPINGS] || {});
      });
    });
  } else {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SLOT_MAPPINGS) || '{}');
    } catch {
      return {};
    }
  }
}

/**
 * Save slot mappings
 * @param {Object} mappings
 * @returns {Promise<void>}
 */
export async function saveSlotMappings(mappings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.SLOT_MAPPINGS]: mappings }, () => {
        resolve();
      });
    });
  } else {
    try {
      localStorage.setItem(STORAGE_KEYS.SLOT_MAPPINGS, JSON.stringify(mappings));
    } catch {
      // ignore write errors in fallback
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
    return new Promise((resolve, reject) => {
      chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve();
      });
    });
  } else {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}
