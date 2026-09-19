/**
 * Google Meet Content Script for DeskDeck-Solo
 * Copyright (c) 2026 Masanori SATAKE
 */

(function () {
  'use strict';

  /**
   * Check if current page is Google Meet
   * @returns {boolean}
   */
  function isMeet() {
    return window.location.hostname.includes('meet.google.com');
  }

  /**
   * Find element matching any selector in list
   * @param {string[]} selectors
   * @returns {HTMLElement|null}
   */
  function findElement(selectors) {
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el && (el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0)) {
          return el;
        }
      } catch {
        // Skip invalid selector
      }
    }

    // Secondary fallback: relaxed visibility check
    for (const selector of selectors) {
      try {
        const el = document.querySelector(selector);
        if (el) return el;
      } catch {
        // Skip invalid selector
      }
    }

    return null;
  }

  /**
   * Wait for element matching selectors to appear in DOM using MutationObserver
   * @param {string[]} selectors
   * @param {number} [timeoutMs=1500]
   * @returns {Promise<HTMLElement|null>}
   */
  function waitForElement(selectors, timeoutMs = 1500) {
    const immediate = findElement(selectors);
    if (immediate) return Promise.resolve(immediate);

    return new Promise((resolve) => {
      let resolved = false;

      const observer = new MutationObserver(() => {
        const el = findElement(selectors);
        if (el && !resolved) {
          resolved = true;
          observer.disconnect();
          resolve(el);
        }
      });

      observer.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true
      });

      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          observer.disconnect();
          resolve(findElement(selectors));
        }
      }, timeoutMs);
    });
  }

  /**
   * Toggle microphone mute/unmute
   * @returns {boolean}
   */
  function toggleMic() {
    const selectors = [
      'button[aria-label*="turn off microphone"]',
      'button[aria-label*="turn on microphone"]',
      'button[aria-label*="マイクをオフ"]',
      'button[aria-label*="マイクをオン"]',
      'button[jsname="B9A42"]',
      '[data-is-muted][role="button"]',
      '[data-tooltip*="microphone"]',
      '[data-tooltip*="マイク"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Toggle camera on/off
   * @returns {boolean}
   */
  function toggleCamera() {
    const selectors = [
      'button[aria-label*="turn off camera"]',
      'button[aria-label*="turn on camera"]',
      'button[aria-label*="カメラをオフ"]',
      'button[aria-label*="カメラをオン"]',
      'button[jsname="N2333"]',
      '[data-tooltip*="camera"]',
      '[data-tooltip*="カメラ"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Raise or lower hand
   * @returns {boolean}
   */
  function toggleHand() {
    const selectors = [
      'button[aria-label*="Raise hand"]',
      'button[aria-label*="Lower hand"]',
      'button[aria-label*="手を挙げる"]',
      'button[aria-label*="手をおろす"]',
      'button[jsname="r8qRAd"]',
      '[data-tooltip*="hand"]',
      '[data-tooltip*="手"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Open reactions tray / menu if closed
   * @returns {Promise<boolean>}
   */
  async function openReactionsTray() {
    const traySelectors = [
      'button[aria-label*="Send a reaction"]',
      'button[aria-label*="リアクションを送信"]',
      'button[jsname="VT123"]',
      '[data-tooltip*="reaction"]',
      '[data-tooltip*="リアクション"]'
    ];

    const trayBtn = findElement(traySelectors);
    if (trayBtn) {
      trayBtn.click();
      return true;
    }
    return false;
  }

  /**
   * Send reaction emoji (clap, thumbsup, heart, laugh, surprised, etc.)
   * @param {string} type
   * @returns {Promise<boolean>}
   */
  async function sendReaction(type) {
    if (!type) return false;

    const lowerType = String(type).toLowerCase();

    if (lowerType === 'hand' || lowerType === 'raise_hand') {
      return toggleHand();
    }

    const reactionSelectorsMap = {
      applause: [
        'button[aria-label*="clap"]',
        'button[aria-label*="拍手"]',
        'button[data-emoji="👏"]',
        'button[aria-label*="👏"]'
      ],
      clap: [
        'button[aria-label*="clap"]',
        'button[aria-label*="拍手"]',
        'button[data-emoji="👏"]',
        'button[aria-label*="👏"]'
      ],
      thumbsup: [
        'button[aria-label*="thumbs up"]',
        'button[aria-label*="グッド"]',
        'button[aria-label*="いいね"]',
        'button[data-emoji="👍"]',
        'button[aria-label*="👍"]'
      ],
      like: [
        'button[aria-label*="thumbs up"]',
        'button[aria-label*="グッド"]',
        'button[aria-label*="いいね"]',
        'button[data-emoji="👍"]',
        'button[aria-label*="👍"]'
      ],
      heart: [
        'button[aria-label*="heart"]',
        'button[aria-label*="ハート"]',
        'button[data-emoji="💖"]',
        'button[data-emoji="❤️"]',
        'button[aria-label*="❤️"]'
      ],
      love: [
        'button[aria-label*="heart"]',
        'button[aria-label*="ハート"]',
        'button[data-emoji="💖"]',
        'button[data-emoji="❤️"]',
        'button[aria-label*="❤️"]'
      ],
      laugh: [
        'button[aria-label*="joy"]',
        'button[aria-label*="笑い"]',
        'button[data-emoji="😂"]'
      ],
      surprised: [
        'button[aria-label*="surprised"]',
        'button[data-emoji="😮"]'
      ]
    };

    const targetSelectors = reactionSelectorsMap[lowerType] || [
      `button[aria-label*="${type}"]`,
      `button[data-emoji="${type}"]`
    ];

    // 1. Try finding reaction button directly
    let btn = findElement(targetSelectors);
    if (btn) {
      btn.click();
      return true;
    }

    // 2. Fallback: Open reactions tray & observe DOM for emoji button
    const trayOpened = await openReactionsTray();
    if (trayOpened) {
      btn = await waitForElement(targetSelectors, 1500);
      if (btn) {
        btn.click();
        return true;
      }
    }

    return false;
  }

  /**
   * Verify if action originates from a protective cover switch input
   * @param {Object} [payload]
   * @returns {boolean}
   */
  function isProtectedCoverInput(payload) {
    if (!payload) return false;
    return Boolean(
      payload.protectedCover ||
      payload.fromFlipSwitch ||
      payload.coverOpen ||
      payload.protected ||
      payload.confirmed ||
      (payload.enabled !== undefined && payload.enabled !== false)
    );
  }

  /**
   * Safely leave call / hang up.
   * Executed ONLY when authorized by a protective cover switch input.
   * @param {Object} [payload]
   * @returns {boolean}
   */
  function leaveCall(payload) {
    if (!isProtectedCoverInput(payload)) {
      console.warn('DeskDeck Meet: leave_call ignored - protective cover switch input required for safe exit');
      return false;
    }

    const selectors = [
      'button[aria-label*="Leave call"]',
      'button[aria-label*="通話を終了"]',
      'button[aria-label*="通話から退出"]',
      'button[jsname="CQyl2"]',
      '[data-tooltip*="leave"]',
      '[data-tooltip*="退出"]',
      '[data-tooltip*="終了"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Handle incoming action message on Google Meet
   * @param {string} action
   * @param {Object} [payload]
   * @returns {boolean|Promise<boolean>}
   */
  function handleAction(action, payload = {}) {
    if (!isMeet()) return false;

    switch (action) {
      case 'toggle_mic_mute':
      case 'toggle_mic':
      case 'mute_mic':
        return toggleMic();

      case 'toggle_camera':
      case 'toggle_video':
        return toggleCamera();

      case 'raise_hand':
      case 'toggle_hand':
        return toggleHand();

      case 'send_reaction':
      case 'reaction':
        return sendReaction(payload.type || payload.reaction || payload.padId);

      case 'pad_reaction': {
        const padId = payload.padId;
        if (padId === 'hand') return toggleHand();
        return sendReaction(padId);
      }

      case 'leave_call':
      case 'leave_meeting':
      case 'toggle_emergency_cut':
        return leaveCall(payload);

      default:
        return false;
    }
  }

  // Export Meet controller on window object
  window.DeskDeckMeet = {
    isMeet,
    findElement,
    waitForElement,
    toggleMic,
    toggleCamera,
    toggleHand,
    sendReaction,
    leaveCall,
    isProtectedCoverInput,
    handleAction
  };
})();
