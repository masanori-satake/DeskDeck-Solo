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
    // Two flick-switched pages instead of one scrolling column.
    // Page 2 (transport) is what you land on; flick down for the levels
    // page (volume/speed/jog plus the PiP/Fullscreen pads).
    pages: [
      ['media_volume', 'media_speed', 'jog_seek', 'media_screen_pad'],
      ['media_pad', 'media_video_nav'],
    ],
    initialPage: 1,
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
        muteAction: 'toggle_mute',
        dense: true,
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
        homeValue: 1.0,
        action: 'set_speed',
        dense: true,
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
        dense: true,
      },
      {
        id: 'media_pad',
        type: 'pad2x2',
        label: 'Transport Pad Grid',
        defaultValue: {},
        action: 'pad_action',
        compact: true,
        dense: true,
        pads: [
          { id: 'play_pause', label: 'Play/Pause', icon: '⏯', wide: true, hero: true },
          { id: 'back10', label: '-10s', icon: '⏪' },
          { id: 'fwd10', label: '+10s', icon: '⏩' },
        ],
      },
      {
        id: 'media_video_nav',
        type: 'pad2x2',
        label: 'Video Navigation',
        defaultValue: {},
        action: 'pad_action',
        compact: true,
        dense: true,
        pads: [
          { id: 'prev_video', label: 'Prev Video', icon: '⏮' },
          { id: 'next_video', label: 'Next Video', icon: '⏭' },
        ],
      },
      {
        id: 'media_screen_pad',
        type: 'pad2x2',
        label: 'Screen',
        defaultValue: {},
        action: 'pad_action',
        compact: true,
        dense: true,
        pads: [
          { id: 'pip', label: 'PiP', icon: '🖼️' },
          { id: 'fullscreen', label: 'Fullscreen', icon: '⛶' },
        ],
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
        dense: true,
      },
      {
        // Was a vertical fader until 0.3.0; like Media's Playback
        // Fader it became a horizontal knob so the deck fits better.
        id: 'broadcast_fader',
        type: 'knob',
        label: 'Stream Level',
        min: 0,
        max: 100,
        defaultValue: 90,
        step: 1,
        unit: '%',
        action: 'set_stream_level',
        dense: true,
      },
      {
        id: 'emergency_cut',
        type: 'flip_switch',
        label: 'Emergency Guard',
        defaultValue: false,
        action: 'toggle_emergency_cut',
        dense: true,
      },
      {
        id: 'mic_mute',
        type: 'switch',
        label: 'Mic Mute',
        defaultValue: false,
        action: 'toggle_mic_mute',
        dense: true,
      },
      {
        id: 'camera_toggle',
        type: 'switch',
        label: 'Camera On',
        defaultValue: true,
        action: 'toggle_camera',
        dense: true,
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
        compact: true,
        dense: true,
      },
      {
        id: 'leave_call',
        type: 'button',
        label: 'Leave Call',
        icon: '📞',
        variant: 'danger',
        action: 'leave_call',
        dense: true,
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
        dense: true,
      },
      {
        // Was a vertical fader until 0.3.0; horizontal knob now, same
        // reasoning as Media (fit without scrolling).
        id: 'brightness_fader',
        type: 'knob',
        label: 'Brightness',
        min: 20,
        max: 100,
        defaultValue: 100,
        step: 1,
        unit: '%',
        action: 'set_brightness',
        dense: true,
      },
      {
        id: 'contrast_guard',
        type: 'flip_switch',
        label: 'High Contrast',
        defaultValue: false,
        action: 'toggle_contrast_lock',
        dense: true,
      },
      {
        id: 'dark_mode',
        type: 'switch',
        label: 'Dark Theme',
        defaultValue: true,
        action: 'toggle_dark_reader',
        dense: true,
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
        compact: true,
        dense: true,
      },
      {
        id: 'reader_toggle',
        type: 'button',
        label: 'Reader View',
        icon: '📖',
        variant: 'primary',
        action: 'toggle_reader_mode',
        dense: true,
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
        dense: true,
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
        dense: true,
      },
      {
        id: 'master_mute',
        type: 'switch',
        label: 'Mute All',
        defaultValue: false,
        action: 'toggle_master_mute',
        dense: true,
      },
      {
        id: 'reset_eq',
        type: 'button',
        label: 'Reset EQ',
        icon: '↺',
        variant: 'secondary',
        action: 'reset_audio_eq',
        dense: true,
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
        dense: true,
      },
      {
        // Was a vertical fader until 0.3.0. Its scale showed generic
        // 0-100 ticks while the real range is 1-10x; as a discrete knob
        // the ticks are the actual values (1x..10x).
        id: 'speed_fader',
        type: 'knob',
        label: 'Scroll Speed',
        min: 1,
        max: 10,
        defaultValue: 5,
        step: 1,
        unit: 'x',
        discrete: true,
        action: 'set_scroll_speed',
        dense: true,
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
        compact: true,
        dense: true,
      },
      {
        id: 'keep_awake',
        type: 'switch',
        label: 'Keep Awake',
        defaultValue: false,
        action: 'toggle_keep_awake',
        dense: true,
      },
      {
        id: 'mute_bg_tabs',
        type: 'button',
        label: 'Mute BG Tabs',
        icon: '🔇',
        variant: 'secondary',
        action: 'mute_background_tabs',
        dense: true,
      },
      {
        id: 'bookmark_page',
        type: 'button',
        label: 'Bookmark',
        icon: '⭐',
        variant: 'secondary',
        action: 'bookmark_page',
        dense: true,
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
