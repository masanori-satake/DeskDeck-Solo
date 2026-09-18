/**
 * Deck Manager defines data structures and presets for the 5 virtual hardware decks:
 * 1. Media Deck
 * 2. Meeting Deck
 * 3. Reader Deck
 * 4. Audio Deck
 * 5. Standard Deck
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
        label: 'Volume',
        min: 0,
        max: 100,
        defaultValue: 70,
        step: 1,
        unit: '%',
        action: 'set_volume'
      },
      {
        id: 'media_mute',
        type: 'switch',
        label: 'Mute',
        defaultValue: false,
        action: 'toggle_mute'
      },
      {
        id: 'media_play_pause',
        type: 'button',
        label: 'Play / Pause',
        icon: '⏯',
        variant: 'primary',
        action: 'media_play_pause'
      },
      {
        id: 'media_prev',
        type: 'button',
        label: 'Prev Track',
        icon: '⏮',
        variant: 'secondary',
        action: 'media_prev'
      },
      {
        id: 'media_next',
        type: 'button',
        label: 'Next Track',
        icon: '⏭',
        variant: 'secondary',
        action: 'media_next'
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
        label: 'Mic Level',
        min: 0,
        max: 100,
        defaultValue: 80,
        step: 1,
        unit: '%',
        action: 'set_mic_level'
      },
      {
        id: 'mic_mute',
        type: 'switch',
        label: 'Mic Mute',
        defaultValue: false,
        action: 'toggle_mic_mute'
      },
      {
        id: 'camera_toggle',
        type: 'switch',
        label: 'Camera On',
        defaultValue: true,
        action: 'toggle_camera'
      },
      {
        id: 'raise_hand',
        type: 'button',
        label: 'Raise Hand',
        icon: '✋',
        variant: 'primary',
        action: 'raise_hand'
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
        label: 'Zoom Level',
        min: 50,
        max: 200,
        defaultValue: 100,
        step: 5,
        unit: '%',
        action: 'set_zoom'
      },
      {
        id: 'dark_mode',
        type: 'switch',
        label: 'Dark Mode',
        defaultValue: true,
        action: 'toggle_dark_reader'
      },
      {
        id: 'page_up',
        type: 'button',
        label: 'Page Up',
        icon: '▲',
        variant: 'secondary',
        action: 'page_up'
      },
      {
        id: 'page_down',
        type: 'button',
        label: 'Page Down',
        icon: '▼',
        variant: 'secondary',
        action: 'page_down'
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
        id: 'bass_boost',
        type: 'knob',
        label: 'Bass Level',
        min: -12,
        max: 12,
        defaultValue: 0,
        step: 1,
        unit: 'dB',
        action: 'set_bass_level'
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
        label: 'Scroll Dial',
        min: 0,
        max: 100,
        defaultValue: 50,
        step: 2,
        unit: '',
        action: 'scroll_dial'
      },
      {
        id: 'new_tab',
        type: 'button',
        label: 'New Tab',
        icon: '➕',
        variant: 'primary',
        action: 'new_tab'
      },
      {
        id: 'close_tab',
        type: 'button',
        label: 'Close Tab',
        icon: '✖',
        variant: 'danger',
        action: 'close_tab'
      },
      {
        id: 'prev_tab',
        type: 'button',
        label: 'Prev Tab',
        icon: '◀',
        variant: 'secondary',
        action: 'prev_tab'
      },
      {
        id: 'next_tab',
        type: 'button',
        label: 'Next Tab',
        icon: '▶',
        variant: 'secondary',
        action: 'next_tab'
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
 * Retrieve deck preset by ID
 * @param {string} deckId
 * @returns {Object}
 */
export function getDeckPreset(deckId) {
  return DECK_PRESETS[deckId] || DECK_PRESETS.media;
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
