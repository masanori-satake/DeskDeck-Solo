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
        action: 'set_volume',
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
        discrete: true,
        action: 'set_speed',
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
        action: 'set_fader',
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
        action: 'seek_dial',
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
          { id: 'next', label: 'Next', icon: '⏭' },
        ],
      },
      {
        id: 'media_mute',
        type: 'switch',
        label: 'Soft Mute',
        defaultValue: false,
        action: 'toggle_mute',
      },
      {
        id: 'media_pip',
        type: 'button',
        label: 'Picture-in-Picture',
        icon: '🖼️',
        variant: 'secondary',
        action: 'toggle_pip',
      },
      {
        id: 'media_fullscreen',
        type: 'button',
        label: 'Fullscreen',
        icon: '⛶',
        variant: 'secondary',
        action: 'toggle_fullscreen',
      },
    ],
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
        action: 'set_mic_level',
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
        action: 'set_stream_level',
      },
      {
        id: 'emergency_cut',
        type: 'flip_switch',
        label: 'Emergency Guard',
        defaultValue: false,
        action: 'toggle_emergency_cut',
      },
      {
        id: 'camera_toggle',
        type: 'switch',
        label: 'Camera On',
        defaultValue: true,
        action: 'toggle_camera',
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
          { id: 'heart', label: 'Love', icon: '❤️' },
        ],
      },
      {
        id: 'leave_call',
        type: 'button',
        label: 'Leave Call',
        icon: '📞',
        variant: 'danger',
        action: 'leave_call',
      },
    ],
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
        action: 'set_zoom',
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
        action: 'set_brightness',
      },
      {
        id: 'contrast_guard',
        type: 'flip_switch',
        label: 'High Contrast',
        defaultValue: false,
        action: 'toggle_contrast_lock',
      },
      {
        id: 'dark_mode',
        type: 'switch',
        label: 'Dark Theme',
        defaultValue: true,
        action: 'toggle_dark_reader',
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
          { id: 'bot', label: 'Bot', icon: '⏬' },
        ],
      },
      {
        id: 'reader_toggle',
        type: 'button',
        label: 'Reader View',
        icon: '📖',
        variant: 'primary',
        action: 'toggle_reader_mode',
      },
    ],
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
        action: 'set_master_gain',
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
        action: 'set_channel_fader',
      },
      {
        id: 'soundboard_pad',
        type: 'pad4x4',
        label: '16-Pad Soundboard FX',
        defaultValue: {},
        action: 'soundboard_trigger',
      },
      {
        id: 'master_mute',
        type: 'switch',
        label: 'Mute All',
        defaultValue: false,
        action: 'toggle_master_mute',
      },
      {
        id: 'reset_eq',
        type: 'button',
        label: 'Reset EQ',
        icon: '↺',
        variant: 'secondary',
        action: 'reset_audio_eq',
      },
    ],
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
        action: 'scroll_dial',
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
        action: 'set_scroll_speed',
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
          { id: 'next', label: 'Next', icon: '▶' },
        ],
      },
      {
        id: 'keep_awake',
        type: 'switch',
        label: 'Keep Awake',
        defaultValue: false,
        action: 'toggle_keep_awake',
      },
      {
        id: 'mute_bg_tabs',
        type: 'button',
        label: 'Mute BG Tabs',
        icon: '🔇',
        variant: 'secondary',
        action: 'mute_background_tabs',
      },
      {
        id: 'bookmark_page',
        type: 'button',
        label: 'Bookmark',
        icon: '⭐',
        variant: 'secondary',
        action: 'bookmark_page',
      },
    ],
  },
};

/**
 * Retrieve deck preset by ID, applying custom slot mappings if present
 * @param {string} deckId
 * @param {Object} [slotMappings]
 * @returns {Object}
 */
export function getDeckPreset(deckId, slotMappings = {}) {
  const basePreset = DECK_PRESETS[deckId] || DECK_PRESETS.media;
  if (!slotMappings || !slotMappings[deckId]) {
    return basePreset;
  }
  const deckMappings = slotMappings[deckId];
  const modifiedSlots = basePreset.slots.map((slot) => {
    if (deckMappings[slot.id]) {
      return { ...slot, ...deckMappings[slot.id] };
    }
    return slot;
  });
  return { ...basePreset, slots: modifiedSlots };
}

/**
 * Get all available deck options for select dropdown
 * @returns {Array<{id: string, nameKey: string, title: string}>}
 */
export function getAvailableDecks() {
  return Object.values(DECK_PRESETS).map((deck) => ({
    id: deck.id,
    nameKey: deck.nameKey,
    title: deck.title,
  }));
}
