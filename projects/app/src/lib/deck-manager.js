/**
 * Deck Manager defines data structures and presets for the 5 virtual hardware decks:
 * 1. Media Deck
 * 2. Meeting Deck
 * 3. Reader Deck
 * 4. Audio Deck
 * 5. Standard Deck
 * Copyright (c) 2026 Masanori SATAKE
 */

export const DECK_PRESETS = {
  media: {
    id: 'media',
    nameKey: 'deckMedia',
    title: 'Media Deck',
    accentColor: '#6366f1',
    slots: [
      {
        id: 'media_volume',
        type: 'knob',
        label: 'Master Volume',
        min: 0,
        max: 100,
        defaultValue: 70,
        step: 1,
        unit: '%',
        action: 'set_volume'
      },
      {
        id: 'media_speed',
        type: 'knob',
        label: 'Playback Speed',
        min: 0.25,
        max: 3.0,
        defaultValue: 1.0,
        step: 0.25,
        unit: 'x',
        action: 'set_speed'
      },
      {
        id: 'media_fader',
        type: 'fader',
        label: 'Playback Fader',
        min: 0,
        max: 100,
        defaultValue: 80,
        step: 1,
        unit: '%',
        action: 'set_fader'
      },
      {
        id: 'jog_seek',
        type: 'knob',
        label: 'Jog Dial Seek',
        min: 0,
        max: 100,
        defaultValue: 50,
        step: 1,
        unit: '',
        action: 'seek_dial'
      },
      {
        id: 'media_pad',
        type: 'pad2x2',
        label: 'Transport Pad Grid',
        defaultValue: {},
        action: 'pad_action',
        pads: [
          { id: 'play', label: 'Play', icon: '▶' },
          { id: 'pause', label: 'Pause', icon: '⏸' },
          { id: 'prev', label: 'Prev', icon: '⏮' },
          { id: 'next', label: 'Next', icon: '⏭' }
        ]
      },
      {
        id: 'media_mute',
        type: 'switch',
        label: 'Soft Mute',
        defaultValue: false,
        action: 'toggle_mute'
      },
      {
        id: 'media_pip',
        type: 'button',
        label: 'Picture-in-Picture',
        icon: '🖼️',
        variant: 'secondary',
        action: 'toggle_pip'
      },
      {
        id: 'media_fullscreen',
        type: 'button',
        label: 'Fullscreen',
        icon: '⛶',
        variant: 'secondary',
        action: 'toggle_fullscreen'
      }
    ]
  },
  meeting: {
    id: 'meeting',
    nameKey: 'deckMeeting',
    title: 'Meeting Deck',
    accentColor: '#10b981',
    slots: [
      {
        id: 'mic_volume',
        type: 'knob',
        label: 'Mic Gain',
        min: 0,
        max: 100,
        defaultValue: 80,
        step: 1,
        unit: '%',
        action: 'set_mic_level'
      },
      {
        id: 'broadcast_fader',
        type: 'fader',
        label: 'Stream Level',
        min: 0,
        max: 100,
        defaultValue: 90,
        step: 1,
        unit: '%',
        action: 'set_stream_level'
      },
      {
        id: 'emergency_cut',
        type: 'flip_switch',
        label: 'Emergency Guard',
        defaultValue: false,
        action: 'toggle_emergency_cut'
      },
      {
        id: 'camera_toggle',
        type: 'switch',
        label: 'Camera On',
        defaultValue: true,
        action: 'toggle_camera'
      },
      {
        id: 'meeting_pad',
        type: 'pad2x2',
        label: 'Reactions Pad',
        defaultValue: {},
        action: 'pad_reaction',
        pads: [
          { id: 'hand', label: 'Hand', icon: '✋' },
          { id: 'applause', label: 'Clap', icon: '👏' },
          { id: 'thumbsup', label: 'Like', icon: '👍' },
          { id: 'heart', label: 'Love', icon: '❤️' }
        ]
      },
      {
        id: 'leave_call',
        type: 'button',
        label: 'Leave Call',
        icon: '📞',
        variant: 'danger',
        action: 'leave_call'
      }
    ]
  },
  reader: {
    id: 'reader',
    nameKey: 'deckReader',
    title: 'Reader Deck',
    accentColor: '#f59e0b',
    slots: [
      {
        id: 'reader_zoom',
        type: 'knob',
        label: 'Zoom Dial',
        min: 50,
        max: 200,
        defaultValue: 100,
        step: 5,
        unit: '%',
        action: 'set_zoom'
      },
      {
        id: 'brightness_fader',
        type: 'fader',
        label: 'Brightness',
        min: 20,
        max: 100,
        defaultValue: 100,
        step: 1,
        unit: '%',
        action: 'set_brightness'
      },
      {
        id: 'contrast_guard',
        type: 'flip_switch',
        label: 'High Contrast',
        defaultValue: false,
        action: 'toggle_contrast_lock'
      },
      {
        id: 'dark_mode',
        type: 'switch',
        label: 'Dark Theme',
        defaultValue: true,
        action: 'toggle_dark_reader'
      },
      {
        id: 'reader_pad',
        type: 'pad2x2',
        label: 'Nav Pad Grid',
        defaultValue: {},
        action: 'pad_nav',
        pads: [
          { id: 'top', label: 'Top', icon: '⏫' },
          { id: 'pgup', label: 'PgUp', icon: '▲' },
          { id: 'pgdn', label: 'PgDn', icon: '▼' },
          { id: 'bot', label: 'Bot', icon: '⏬' }
        ]
      },
      {
        id: 'reader_toggle',
        type: 'button',
        label: 'Reader View',
        icon: '📖',
        variant: 'primary',
        action: 'toggle_reader_mode'
      }
    ]
  },
  audio: {
    id: 'audio',
    nameKey: 'deckAudio',
    title: 'Audio Deck',
    accentColor: '#ec4899',
    slots: [
      {
        id: 'master_gain',
        type: 'knob',
        label: 'Master Gain',
        min: 0,
        max: 100,
        defaultValue: 75,
        step: 1,
        unit: '%',
        action: 'set_master_gain'
      },
      {
        id: 'main_fader',
        type: 'fader',
        label: 'PA Channel Fader',
        min: -60,
        max: 10,
        defaultValue: 0,
        step: 1,
        unit: 'dB',
        action: 'set_channel_fader'
      },
      {
        id: 'soundboard_pad',
        type: 'pad4x4',
        label: '16-Pad Soundboard FX',
        defaultValue: {},
        action: 'soundboard_trigger'
      },
      {
        id: 'master_mute',
        type: 'switch',
        label: 'Mute All',
        defaultValue: false,
        action: 'toggle_master_mute'
      },
      {
        id: 'reset_eq',
        type: 'button',
        label: 'Reset EQ',
        icon: '↺',
        variant: 'secondary',
        action: 'reset_audio_eq'
      }
    ]
  },
  standard: {
    id: 'standard',
    nameKey: 'deckStandard',
    title: 'Standard Deck',
    accentColor: '#3b82f6',
    slots: [
      {
        id: 'standard_dial',
        type: 'knob',
        label: 'Scroll Wheel',
        min: 0,
        max: 100,
        defaultValue: 50,
        step: 2,
        unit: '',
        action: 'scroll_dial'
      },
      {
        id: 'speed_fader',
        type: 'fader',
        label: 'Scroll Speed',
        min: 1,
        max: 10,
        defaultValue: 5,
        step: 1,
        unit: 'x',
        action: 'set_scroll_speed'
      },
      {
        id: 'tab_pad',
        type: 'pad2x2',
        label: 'Tab Management Grid',
        defaultValue: {},
        action: 'pad_tab',
        pads: [
          { id: 'new', label: 'New', icon: '➕' },
          { id: 'close', label: 'Close', icon: '✖' },
          { id: 'prev', label: 'Prev', icon: '◀' },
          { id: 'next', label: 'Next', icon: '▶' }
        ]
      },
      {
        id: 'keep_awake',
        type: 'switch',
        label: 'Keep Awake',
        defaultValue: false,
        action: 'toggle_keep_awake'
      },
      {
        id: 'mute_bg_tabs',
        type: 'button',
        label: 'Mute BG Tabs',
        icon: '🔇',
        variant: 'secondary',
        action: 'mute_background_tabs'
      },
      {
        id: 'bookmark_page',
        type: 'button',
        label: 'Bookmark',
        icon: '⭐',
        variant: 'secondary',
        action: 'bookmark_page'
      }
    ]
  }
};

/**
 * Available action options for UI dropdown customizer per slot type
 */
export const ACTION_OPTIONS_BY_TYPE = {
  knob: [
    { value: 'set_volume', label: 'Master Volume (0-100%)' },
    { value: 'set_speed', label: 'Playback Speed (0.25x - 3.0x)' },
    { value: 'seek_dial', label: 'Jog Dial Seek' },
    { value: 'set_mic_level', label: 'Mic Gain' },
    { value: 'set_zoom', label: 'Zoom Dial (50-200%)' },
    { value: 'scroll_dial', label: 'Scroll Wheel Dial' }
  ],
  fader: [
    { value: 'set_fader', label: 'Playback Fader' },
    { value: 'set_brightness', label: 'Brightness Dimmer' }
  ],
  switch: [
    { value: 'toggle_mute', label: 'Soft Mute' },
    { value: 'toggle_camera', label: 'Camera On / Off' },
    { value: 'toggle_dark_reader', label: 'Dark Theme Toggle' },
    { value: 'toggle_master_mute', label: 'Master Mute All' },
    { value: 'toggle_keep_awake', label: 'Keep Awake Switch' }
  ],
  flip_switch: [
    { value: 'toggle_emergency_cut', label: 'Emergency Guard Switch' }
  ],
  button: [
    { value: 'toggle_pip', label: 'Picture-in-Picture' },
    { value: 'toggle_fullscreen', label: 'Toggle Fullscreen' },
    { value: 'leave_call', label: 'Leave Call / Exit' },
    { value: 'toggle_reader_mode', label: 'Reader View' },
    { value: 'mute_background_tabs', label: 'Mute Background Tabs' },
    { value: 'bookmark_page', label: 'Bookmark Page' }
  ],
  pad2x2: [
    { value: 'pad_action', label: 'Transport Pad (Play/Pause/Prev/Next)' },
    { value: 'pad_reaction', label: 'Reactions Pad (Hand/Clap/Like/Love)' }
  ],
  pad4x4: []
};

const ACTION_NUMERIC_PROFILES = {
  set_volume: { min: 0, max: 100, defaultValue: 70, step: 1, unit: '%' },
  set_speed: { min: 0.25, max: 3, defaultValue: 1, step: 0.25, unit: 'x' },
  seek_dial: { min: 0, max: 100, defaultValue: 50, step: 1, unit: '' },
  set_mic_level: { min: 0, max: 100, defaultValue: 80, step: 1, unit: '%' },
  set_zoom: { min: 50, max: 200, defaultValue: 100, step: 5, unit: '%' },
  scroll_dial: { min: 0, max: 100, defaultValue: 50, step: 2, unit: '' },
  set_fader: { min: 0, max: 100, defaultValue: 80, step: 1, unit: '%' },
  set_brightness: { min: 20, max: 100, defaultValue: 100, step: 1, unit: '%' }
};

export function getEffectiveSlotAction(slot, configuredAction) {
  const options = ACTION_OPTIONS_BY_TYPE[slot.type] || [];
  return options.some((option) => option.value === configuredAction)
    ? configuredAction
    : slot.action;
}

export function normalizeSlotMappings(slotMappings) {
  Object.values(DECK_PRESETS).forEach((deck) => {
    const deckMappings = slotMappings[deck.id];
    if (!deckMappings || typeof deckMappings !== 'object') return;

    deck.slots.forEach((slot) => {
      const mapping = deckMappings[slot.id];
      if (!mapping || !Object.prototype.hasOwnProperty.call(mapping, 'action')) return;
      mapping.action = getEffectiveSlotAction(slot, mapping.action);
    });
  });
  return slotMappings;
}

export function normalizeNumericSlotValue(slot, value) {
  const numericValue = Number(value);
  const fallbackValue = Number(slot.defaultValue);
  const candidate = Number.isFinite(numericValue) ? numericValue : fallbackValue;
  const clamped = Math.max(slot.min, Math.min(slot.max, candidate));
  const step = slot.step || 1;
  const snapped = slot.min + Math.round((clamped - slot.min) / step) * step;
  const precision = Math.max(
    String(slot.min).split('.')[1]?.length || 0,
    String(slot.max).split('.')[1]?.length || 0,
    String(step).split('.')[1]?.length || 0
  );
  return Number(Math.max(slot.min, Math.min(slot.max, snapped)).toFixed(precision));
}

/**
 * Retrieve deck preset by ID with optional custom slot mappings applied
 * @param {string} deckId
 * @param {Object} [customSlotMappings] Custom action overrides
 * @returns {Object}
 */
export function getDeckPreset(deckId, customSlotMappings = {}) {
  const basePreset = DECK_PRESETS[deckId] || DECK_PRESETS.media;
  const deckOverrides = customSlotMappings[deckId] || {};

  const slots = basePreset.slots.map((slot) => {
    if (deckOverrides[slot.id]) {
      const override = deckOverrides[slot.id];
      const action = getEffectiveSlotAction(slot, override.action);
      const numericProfile = slot.type === 'knob' || slot.type === 'fader'
        ? ACTION_NUMERIC_PROFILES[action] || {
          min: slot.min,
          max: slot.max,
          defaultValue: slot.defaultValue,
          step: slot.step,
          unit: slot.unit
        }
        : {};
      return {
        ...slot,
        ...override,
        action,
        ...numericProfile
      };
    }
    return { ...slot };
  });

  return {
    ...basePreset,
    slots
  };
}

/**
 * Get all available deck options for select dropdown
 * @returns {Array<{id: string, nameKey: string, title: string}>}
 */
export function getAvailableDecks() {
  return Object.values(DECK_PRESETS).map(deck => ({
    id: deck.id,
    nameKey: deck.nameKey,
    title: deck.title
  }));
}
