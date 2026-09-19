/**
 * Local storage helper module wrapping chrome.storage.local
 * with fallback to window.localStorage / memory storage for non-extension environments.
 * Copyright (c) 2026 Masanori SATAKE
 */

const STORAGE_KEYS = {
  ACTIVE_DECK: 'deskdeck_active_deck',
  DECK_SLOT_STATES: 'deskdeck_slot_states',
  SETTINGS: 'deskdeck_settings',
  URL_MAPPINGS: 'deskdeck_url_mappings',
  SLOT_MAPPINGS: 'deskdeck_slot_mappings'
};

const DEFAULT_SETTINGS = {
  soundEffects: true,
  hapticFeedback: true
};

const DEFAULT_URL_MAPPINGS = [
  { id: 'rule_youtube', pattern: 'youtube.com', deckId: 'media', enabled: true },
  { id: 'rule_meet', pattern: 'meet.google.com', deckId: 'meeting', enabled: true },
  { id: 'rule_teams', pattern: 'teams.microsoft.com', deckId: 'meeting', enabled: true },
  { id: 'rule_wikipedia', pattern: 'wikipedia.org', deckId: 'reader', enabled: true },
  { id: 'rule_spotify', pattern: 'spotify.com', deckId: 'audio', enabled: true }
];

const BACKUP_VERSION = '1.0.0';
const BACKUP_FIELD_VALIDATORS = {
  activeDeck: (value) => typeof value === 'string',
  settings: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  urlMappings: (value) => Array.isArray(value),
  slotMappings: (value) => value !== null && typeof value === 'object' && !Array.isArray(value),
  deckSlotStates: (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
};

// Fallback in-memory storage for non-browser Node test environments
const memoryStorage = new Map();

function safeGetStorageItem(key) {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem(key);
  }
  return memoryStorage.get(key) || null;
}

function safeSetStorageItem(key, value) {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  } else {
    memoryStorage.set(key, value);
  }
}

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
    return safeGetStorageItem(STORAGE_KEYS.ACTIVE_DECK) || 'media';
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
    safeSetStorageItem(STORAGE_KEYS.ACTIVE_DECK, deckId);
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
      const allStates = JSON.parse(safeGetStorageItem(STORAGE_KEYS.DECK_SLOT_STATES) || '{}');
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
      const allStates = JSON.parse(safeGetStorageItem(STORAGE_KEYS.DECK_SLOT_STATES) || '{}');
      allStates[deckId] = { ...(allStates[deckId] || {}), ...slotStates };
      safeSetStorageItem(STORAGE_KEYS.DECK_SLOT_STATES, JSON.stringify(allStates));
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
      const settings = JSON.parse(safeGetStorageItem(STORAGE_KEYS.SETTINGS) || '{}');
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
    safeSetStorageItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  }
}

/**
 * Get URL domain mappings table
 * @returns {Promise<Array<{id: string, pattern: string, deckId: string, enabled: boolean}>>}
 */
export async function getUrlMappings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.URL_MAPPINGS], (result) => {
        resolve(result[STORAGE_KEYS.URL_MAPPINGS] || DEFAULT_URL_MAPPINGS);
      });
    });
  } else {
    try {
      const data = safeGetStorageItem(STORAGE_KEYS.URL_MAPPINGS);
      return data ? JSON.parse(data) : DEFAULT_URL_MAPPINGS;
    } catch {
      return DEFAULT_URL_MAPPINGS;
    }
  }
}

/**
 * Save URL domain mappings table
 * @param {Array<{id: string, pattern: string, deckId: string, enabled: boolean}>} mappings
 * @returns {Promise<void>}
 */
export async function saveUrlMappings(mappings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.URL_MAPPINGS]: mappings }, () => {
        resolve();
      });
    });
  } else {
    safeSetStorageItem(STORAGE_KEYS.URL_MAPPINGS, JSON.stringify(mappings));
  }
}

/**
 * Get custom slot mappings configuration
 * @returns {Promise<Object>} Object mapping deckId -> slotId -> action/label customization
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
      const data = safeGetStorageItem(STORAGE_KEYS.SLOT_MAPPINGS);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
}

/**
 * Save custom slot mappings configuration
 * @param {Object} slotMappings
 * @returns {Promise<void>}
 */
export async function saveSlotMappings(slotMappings) {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ [STORAGE_KEYS.SLOT_MAPPINGS]: slotMappings }, () => {
        resolve();
      });
    });
  } else {
    safeSetStorageItem(STORAGE_KEYS.SLOT_MAPPINGS, JSON.stringify(slotMappings));
  }
}

/**
 * Export all DeskDeck settings and custom mappings as JSON object
 * @returns {Promise<Object>}
 */
export async function exportBackupData() {
  const activeDeck = await getActiveDeckId();
  const settings = await getSettings();
  const urlMappings = await getUrlMappings();
  const slotMappings = await getSlotMappings();

  let deckSlotStates = {};
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
    deckSlotStates = await new Promise((resolve) => {
      chrome.storage.local.get([STORAGE_KEYS.DECK_SLOT_STATES], (result) => {
        resolve(result[STORAGE_KEYS.DECK_SLOT_STATES] || {});
      });
    });
  } else {
    try {
      deckSlotStates = JSON.parse(safeGetStorageItem(STORAGE_KEYS.DECK_SLOT_STATES) || '{}');
    } catch {
      deckSlotStates = {};
    }
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    activeDeck,
    settings,
    urlMappings,
    slotMappings,
    deckSlotStates
  };
}

/**
 * Import backup data from JSON object
 * @param {Object} data
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function importBackupData(data) {
  const isObject = data !== null && typeof data === 'object' && !Array.isArray(data);
  const restorationFields = isObject
    ? Object.keys(BACKUP_FIELD_VALIDATORS).filter((field) => Object.hasOwn(data, field))
    : [];

  if (
    !isObject ||
    data.version !== BACKUP_VERSION ||
    restorationFields.length === 0 ||
    restorationFields.some((field) => !BACKUP_FIELD_VALIDATORS[field](data[field]))
  ) {
    return { success: false, error: 'Invalid backup JSON data format' };
  }

  try {
    const storageValues = {};
    const storageKeyByField = {
      activeDeck: STORAGE_KEYS.ACTIVE_DECK,
      settings: STORAGE_KEYS.SETTINGS,
      urlMappings: STORAGE_KEYS.URL_MAPPINGS,
      slotMappings: STORAGE_KEYS.SLOT_MAPPINGS,
      deckSlotStates: STORAGE_KEYS.DECK_SLOT_STATES
    };
    restorationFields.forEach((field) => {
      storageValues[storageKeyByField[field]] = data[field];
    });

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set(storageValues, () => {
          const lastError = chrome.runtime && chrome.runtime.lastError;
          if (lastError) {
            reject(new Error(lastError.message || 'Failed to restore backup data'));
          } else {
            resolve();
          }
        });
      });
    } else {
      Object.entries(storageValues).forEach(([key, value]) => {
        safeSetStorageItem(key, typeof value === 'string' ? value : JSON.stringify(value));
      });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
