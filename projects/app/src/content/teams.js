/**
 * Microsoft Teams Content Script for DeskDeck-Solo
 * Copyright (c) 2026 Masanori SATAKE
 */

(function () {
  'use strict';

  /**
   * Check if current page is Microsoft Teams
   * @returns {boolean}
   */
  function isTeams() {
    return (
      window.location.hostname.includes('teams.microsoft.com') ||
      window.location.hostname.includes('teams.live.com')
    );
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
      'button[id*="microphone"]',
      'button[data-tid*="mute"]',
      'button[data-tid*="microphone"]',
      'button[aria-label*="Mute"]',
      'button[aria-label*="unmute"]',
      'button[aria-label*="マイク"]',
      'button[aria-label*="ミュート"]',
      'button[data-is-muted]'
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
      'button[id*="camera"]',
      'button[data-tid*="camera"]',
      'button[aria-label*="Camera"]',
      'button[aria-label*="camera"]',
      'button[aria-label*="カメラ"]',
      'button[aria-label*="ビデオ"]'
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
      'button[id*="raise-hand"]',
      'button[data-tid*="raise-hand"]',
      'button[aria-label*="Raise hand"]',
      'button[aria-label*="Lower hand"]',
      'button[aria-label*="手を挙げる"]',
      'button[aria-label*="手を下ろす"]',
      'button[aria-label*="挙手"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Open reactions tray if closed
   * @returns {Promise<boolean>}
   */
  async function openReactionsTray() {
    const traySelectors = [
      'button[id*="reactions-button"]',
      'button[data-tid*="reaction"]',
      'button[aria-label*="Reactions"]',
      'button[aria-label*="React"]',
      'button[aria-label*="リアクション"]',
      'button[aria-label*="反応"]'
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
        'button[data-tid*="applause"]',
        'button[aria-label*="applause"]',
        'button[aria-label*="拍手"]',
        'button[aria-label*="Clap"]'
      ],
      clap: [
        'button[data-tid*="applause"]',
        'button[aria-label*="applause"]',
        'button[aria-label*="拍手"]',
        'button[aria-label*="Clap"]'
      ],
      thumbsup: [
        'button[data-tid*="like"]',
        'button[aria-label*="like"]',
        'button[aria-label*="いいね"]',
        'button[aria-label*="Thumbs"]'
      ],
      like: [
        'button[data-tid*="like"]',
        'button[aria-label*="like"]',
        'button[aria-label*="いいね"]',
        'button[aria-label*="Thumbs"]'
      ],
      heart: [
        'button[data-tid*="heart"]',
        'button[aria-label*="heart"]',
        'button[aria-label*="ハート"]',
        'button[aria-label*="Love"]'
      ],
      love: [
        'button[data-tid*="heart"]',
        'button[aria-label*="heart"]',
        'button[aria-label*="ハート"]',
        'button[aria-label*="Love"]'
      ],
      laugh: [
        'button[data-tid*="laugh"]',
        'button[aria-label*="laugh"]',
        'button[aria-label*="笑い"]'
      ],
      surprised: [
        'button[data-tid*="surprised"]',
        'button[aria-label*="surprised"]',
        'button[aria-label*="驚き"]'
      ]
    };

    const targetSelectors = reactionSelectorsMap[lowerType] || [
      `button[aria-label*="${type}"]`,
      `button[data-tid*="${type}"]`
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
      console.warn('DeskDeck Teams: leave_call ignored - protective cover switch input required for safe exit');
      return false;
    }

    const selectors = [
      'button[id*="hangup"]',
      'button[data-tid*="call-hangup"]',
      'button[data-tid*="hangup-button"]',
      'button[aria-label*="Leave"]',
      'button[aria-label*="Hang up"]',
      'button[aria-label*="退出"]',
      'button[aria-label*="通話の終了"]',
      'button[aria-label*="切断"]'
    ];

    const btn = findElement(selectors);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  /**
   * Handle incoming action message on Microsoft Teams
   * @param {string} action
   * @param {Object} [payload]
   * @returns {boolean|Promise<boolean>}
   */
  function handleAction(action, payload = {}) {
    if (!isTeams()) return false;

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

  // Export Teams controller on window object
  window.DeskDeckTeams = {
    isTeams,
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
