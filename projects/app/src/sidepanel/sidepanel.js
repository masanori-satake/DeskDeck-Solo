import {
  getActiveDeckId,
  setActiveDeckId,
  getDeckSlotStates,
  saveDeckSlotStates,
  getSettings,
  getSlotMappings,
} from '../lib/storage.js';

import { getDeckPreset, getAvailableDecks } from '../lib/deck-manager.js';

import {
  playKnobTickSound,
  playSwitchSound,
  playButtonSound,
  triggerHaptic,
} from '../lib/audio.js';

let activeDeckId = 'media';
let currentDeckPreset = null;
let currentSlotStates = {};
let appSettings = { soundEffects: true, hapticFeedback: true };
let currentRenderGen = 0;

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();
  appSettings = await getSettings();

  activeDeckId = await getActiveDeckId();
  setupDeckSelector();
  setupOptionsButton();
  setupRuntimeMessageListener();

  await loadAndRenderActiveDeck(activeDeckId);
});

function initI18n() {
  if (typeof chrome === 'undefined' || !chrome.i18n) return;
  document.querySelectorAll('[data-i18n]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) {
      elem.textContent = msg;
    }
  });
}

function setupOptionsButton() {
  const optionsBtn = document.getElementById('optionsBtn');
  if (optionsBtn) {
    optionsBtn.addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('../options/options.html', '_blank');
      }
    });
  }
}

function setupDeckSelector() {
  const selectElem = document.getElementById('deckSelect');
  if (!selectElem) return;

  const availableDecks = getAvailableDecks();
  selectElem.innerHTML = '';

  availableDecks.forEach((deck) => {
    const option = document.createElement('option');
    option.value = deck.id;
    const localizedTitle =
      typeof chrome !== 'undefined' && chrome.i18n
        ? chrome.i18n.getMessage(deck.nameKey) || deck.title
        : deck.title;
    option.textContent = localizedTitle;
    selectElem.appendChild(option);
  });

  selectElem.value = activeDeckId;

  selectElem.addEventListener('change', async (e) => {
    activeDeckId = e.target.value;
    await setActiveDeckId(activeDeckId);
    await loadAndRenderActiveDeck(activeDeckId);
  });
}

function setupRuntimeMessageListener() {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.onMessage) return;

  chrome.runtime.onMessage.addListener((message) => {
    if (message && (message.action === 'SWITCH_DECK' || message.action === 'ACTIVE_DECK_CHANGED')) {
      const newDeckId = message.deckId || message.payload?.deckId;
      if (newDeckId && newDeckId !== activeDeckId) {
        activeDeckId = newDeckId;
        const selectElem = document.getElementById('deckSelect');
        if (selectElem) {
          selectElem.value = activeDeckId;
        }
        loadAndRenderActiveDeck(activeDeckId);
      }
    }
  });
}

/**
 * Load the selected deck's saved state and render it if the request is still current.
 *
 * @param {string} deckId - Identifier of the deck to load and render.
 * @returns {Promise<void>} A promise that resolves after the current deck is rendered.
 */
async function loadAndRenderActiveDeck(deckId) {
  const renderGen = ++currentRenderGen;

  const slotMappings = await getSlotMappings();
  if (renderGen !== currentRenderGen) return;

  const storedStates = await getDeckSlotStates(deckId);
  if (renderGen !== currentRenderGen) return;

  const deckPreset = getDeckPreset(deckId, slotMappings);
  const slotStates = storedStates || {};

  currentDeckPreset = deckPreset;
  currentSlotStates = {};
  currentDeckPreset.slots.forEach((slot) => {
    currentSlotStates[slot.id] =
      slotStates[slot.id] !== undefined ? slotStates[slot.id] : slot.defaultValue;
  });

  renderDeckSlots(deckId);
}

/**
 * Render the current deck's slots, including their labels and controls.
 *
 * @param {string} deckId - Identifier used to persist slot state.
 */
// classList.toggle with a force flag, with a fallback for environments
// whose classList only carries add/remove.
function toggleClass(el, name, force) {
  if (el.classList && typeof el.classList.toggle === 'function') {
    el.classList.toggle(name, force);
  } else if (force) {
    el.classList.add(name);
  } else {
    el.classList.remove(name);
  }
}

function buildSlotCard(slot, deckId) {
  const card = document.createElement('div');
  card.className = `slot-card slot-${slot.type}`;
  if (slot.dense) card.classList.add('slot-dense');

  // Pad grids carry no card title: area names like "Transport Pad Grid"
  // tell the user nothing, and each page now has its own category title.
  // The pads themselves are labelled.
  if (slot.type !== 'knob' && slot.type !== 'pad2x2' && slot.type !== 'pad4x4') {
    const label = document.createElement('div');
    label.className = 'slot-label';
    label.textContent = slot.label;
    card.appendChild(label);
  }

  if (slot.type === 'knob') {
    renderKnobWidget(card, slot, deckId);
  } else if (slot.type === 'fader') {
    renderFaderWidget(card, slot, deckId);
  } else if (slot.type === 'switch') {
    renderSwitchWidget(card, slot, deckId);
  } else if (slot.type === 'flip_switch') {
    renderFlipSwitchWidget(card, slot, deckId);
  } else if (slot.type === 'pad2x2' || slot.type === 'pad4x4') {
    renderMultiPadWidget(card, slot, deckId);
  } else if (slot.type === 'button') {
    renderButtonWidget(card, slot, deckId);
  }

  return card;
}

function renderDeckSlots(deckId) {
  const container = document.getElementById('slotsContainer');
  if (!container || !currentDeckPreset) return;

  container.innerHTML = '';
  container.classList.remove('pager-viewport');
  const workspace =
    typeof document.querySelector === 'function' ? document.querySelector('.deck-workspace') : null;
  if (workspace) workspace.classList.remove('paged');

  const pages = currentDeckPreset.pages;
  if (!pages || pages.length === 0) {
    currentDeckPreset.slots.forEach((slot) => {
      container.appendChild(buildSlotCard(slot, deckId));
    });
    return;
  }

  // Paged layout: the deck's slots are grouped into full-height pages
  // switched by flicking, instead of one long smooth-scrolling column.
  container.classList.add('pager-viewport');
  if (workspace) workspace.classList.add('paged');

  const slotById = new Map(currentDeckPreset.slots.map((s) => [s.id, s]));
  const track = document.createElement('div');
  track.className = 'pager-track';

  pages.forEach((pageDef) => {
    const page = document.createElement('div');
    page.className = 'pager-page';
    if (pageDef.title) {
      const title = document.createElement('div');
      title.className = 'pager-page-title';
      title.textContent = pageDef.title;
      page.appendChild(title);
    }
    const grid = document.createElement('div');
    grid.className = 'slots-grid pager-page-grid';
    (pageDef.slots || []).forEach((id) => {
      const slot = slotById.get(id);
      if (slot) grid.appendChild(buildSlotCard(slot, deckId));
    });
    page.appendChild(grid);
    track.appendChild(page);
  });
  container.appendChild(track);

  const dots = document.createElement('div');
  dots.className = 'pager-dots';
  container.appendChild(dots);

  let currentPage = Math.min(currentDeckPreset.initialPage || 0, pages.length - 1);
  const dotEls = pages.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = 'pager-dot';
    dot.setAttribute('aria-label', `Page ${i + 1}`);
    dot.addEventListener('click', () => goToPage(i));
    dots.appendChild(dot);
    return dot;
  });

  function goToPage(i) {
    currentPage = Math.max(0, Math.min(pages.length - 1, i));
    track.style.transform = `translateY(${-currentPage * 100}%)`;
    dotEls.forEach((d, j) => toggleClass(d, 'active', j === currentPage));
  }
  goToPage(currentPage);

  // Flick navigation, following the finger: a flick up (finger sweeps
  // upward) advances to the next page, a flick down goes back — the
  // pages move the way the finger pushes them.
  let touchStartY = null;
  let touchStartX = null;
  container.addEventListener(
    'touchstart',
    (e) => {
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
    },
    { passive: true }
  );
  container.addEventListener(
    'touchend',
    (e) => {
      if (touchStartY === null) return;
      const deltaY = touchStartY - e.changedTouches[0].clientY;
      const deltaX = touchStartX - e.changedTouches[0].clientX;
      // Predominantly vertical only: a horizontal knob drag that
      // drifts a little vertically must not flip the page.
      if (Math.abs(deltaY) > 50 && Math.abs(deltaY) > Math.abs(deltaX) * 1.5) {
        if (deltaY > 0) goToPage(currentPage + 1);
        else goToPage(currentPage - 1);
      }
      touchStartY = null;
      touchStartX = null;
    },
    { passive: true }
  );
  let lastWheelNav = 0;
  container.addEventListener(
    'wheel',
    (e) => {
      const now = Date.now();
      if (Math.abs(e.deltaY) < 24 || now - lastWheelNav < 450) return;
      lastWheelNav = now;
      goToPage(currentPage + (e.deltaY > 0 ? 1 : -1));
    },
    { passive: true }
  );
}

/**
 * Render Horizontal Knob Controls (Continuous Horizontal Wheel or Discrete Choice Scale)
 */
function renderKnobWidget(cardContainer, slot, deckId) {
  if (slot.discrete) {
    renderDiscreteKnobWidget(cardContainer, slot, deckId);
  } else {
    renderContinuousWheelWidget(cardContainer, slot, deckId);
  }
}

/**
 * Render Continuous Range Control with Horizontal Mouse Wheel / Roller Control on Right and Feedback on Left
 */
function renderContinuousWheelWidget(cardContainer, slot, deckId) {
  const container = document.createElement('div');
  container.className = 'knob-row-container continuous-wheel-container';

  const feedbackArea = document.createElement('div');
  feedbackArea.className = 'knob-feedback-area';

  const labelElem = document.createElement('div');
  labelElem.className = 'slot-label knob-row-label';
  labelElem.textContent = slot.label;

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'knob-value-display';

  feedbackArea.appendChild(labelElem);
  feedbackArea.appendChild(valueDisplay);

  const wheelControl = document.createElement('div');
  wheelControl.className = 'wheel-control-area';
  wheelControl.setAttribute('role', 'slider');
  wheelControl.setAttribute('tabindex', '0');
  wheelControl.setAttribute('aria-label', slot.label);
  wheelControl.setAttribute('aria-valuemin', String(slot.min));
  wheelControl.setAttribute('aria-valuemax', String(slot.max));

  const wheelCylinder = document.createElement('div');
  wheelCylinder.className = 'wheel-cylinder';

  const ridgeTrack = document.createElement('div');
  ridgeTrack.className = 'wheel-ridge-track';

  for (let i = 0; i < 18; i++) {
    const ridge = document.createElement('div');
    ridge.className = 'wheel-ridge';
    ridgeTrack.appendChild(ridge);
  }

  const fillIndicator = document.createElement('div');
  fillIndicator.className = 'wheel-fill-indicator';

  const centerNotch = document.createElement('div');
  centerNotch.className = 'wheel-center-notch';

  wheelCylinder.appendChild(ridgeTrack);
  wheelCylinder.appendChild(fillIndicator);
  wheelCylinder.appendChild(centerNotch);
  wheelControl.appendChild(wheelCylinder);

  container.appendChild(feedbackArea);
  container.appendChild(wheelControl);
  cardContainer.appendChild(container);

  // Optional merged mute toggle living on the same card (Master Volume
  // carries Soft Mute this way instead of a separate switch slot).
  let muteBtn = null;
  if (slot.muteAction) {
    muteBtn = document.createElement('button');
    muteBtn.className = 'mute-toggle-btn';
    muteBtn.setAttribute('aria-label', 'Mute');
    cardContainer.appendChild(muteBtn);
  }

  let val =
    currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;

  if (muteBtn) {
    let muted = currentSlotStates[`${slot.id}_mute`] === true;
    const updateMuteUI = () => {
      muteBtn.textContent = '';
      const icon = createPadIcon(muted ? 'volumeOff' : 'volumeOn');
      if (icon) {
        muteBtn.appendChild(icon);
      } else {
        muteBtn.textContent = muted ? '🔇' : '🔊';
      }
      toggleClass(muteBtn, 'muted', muted);
      muteBtn.setAttribute('aria-pressed', String(muted));
    };
    updateMuteUI();
    muteBtn.addEventListener('click', () => {
      muted = !muted;
      currentSlotStates[`${slot.id}_mute`] = muted;
      saveDeckSlotStates(deckId, currentSlotStates);
      updateMuteUI();
      dispatchDeckAction(slot.muteAction, { enabled: muted });
      if (appSettings.hapticFeedback) triggerHaptic(10);
    });
  }
  let unroundedVal = val;

  const updateWheelUI = (value) => {
    const norm = (value - slot.min) / (slot.max - slot.min);
    valueDisplay.textContent = `${value}${slot.unit || ''}`;
    wheelControl.setAttribute('aria-valuenow', String(value));

    const shiftPx = (norm * 160) % 20;
    ridgeTrack.style.transform = `translateX(${-shiftPx}px)`;
    fillIndicator.style.width = `${norm * 100}%`;
  };

  updateWheelUI(val);

  // Feedback ticks fire only when the value crosses a coarse step
  // (range/20, so 5 units on a 0-100 control), not on every step of the
  // drag — ticking on every unit makes the sound machine-gun while
  // sliding and the feedback becomes noise.
  const tickStep = Math.max(slot.step || 1, (slot.max - slot.min) / 20);
  let lastTickBucket = Math.floor(val / tickStep);

  const applyValue = (newVal) => {
    if (newVal === val) return;

    val = newVal;
    currentSlotStates[slot.id] = val;
    updateWheelUI(val);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    const bucket = Math.floor(val / tickStep);
    if (bucket !== lastTickBucket) {
      lastTickBucket = bucket;
      if (appSettings.soundEffects) playKnobTickSound();
      if (appSettings.hapticFeedback) triggerHaptic(8);
    }
  };

  let isDragging = false;
  let startX = 0;
  let startVal = val;

  const onPointerDown = (e) => {
    isDragging = true;
    wheelControl.classList.add('dragging');
    startX = e.clientX;
    startVal = unroundedVal;
    try {
      wheelControl.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const range = slot.max - slot.min;
    const deltaVal = (deltaX / 150) * range;

    unroundedVal = Math.max(slot.min, Math.min(slot.max, startVal + deltaVal));
    const step = slot.step || 1;
    const newVal = Math.round(unroundedVal / step) * step;
    applyValue(newVal);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      isDragging = false;
      wheelControl.classList.remove('dragging');
      try {
        wheelControl.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  wheelControl.addEventListener('pointerdown', onPointerDown);
  wheelControl.addEventListener('pointermove', onPointerMove);
  wheelControl.addEventListener('pointerup', onPointerUp);
  wheelControl.addEventListener('pointercancel', onPointerUp);

  wheelControl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const step = slot.step || 1;
      const direction = e.deltaY > 0 || e.deltaX > 0 ? -1 : 1;
      const newVal = Math.max(slot.min, Math.min(slot.max, val + direction * step));
      unroundedVal = newVal;
      applyValue(newVal);
    },
    { passive: false }
  );

  wheelControl.addEventListener('keydown', (e) => {
    const direction =
      e.key === 'ArrowUp' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!direction) return;

    e.preventDefault();
    const step = slot.step || 1;
    const newVal = Math.max(slot.min, Math.min(slot.max, val + direction * step));
    unroundedVal = newVal;
    applyValue(newVal);
  });
}

/**
 * Render Discrete Option Control with Choice Tick Scale (Swipeable) on Right and Feedback on Left
 */
function renderDiscreteKnobWidget(cardContainer, slot, deckId) {
  const container = document.createElement('div');
  container.className = 'knob-row-container discrete-scale-container';

  const feedbackArea = document.createElement('div');
  feedbackArea.className = 'knob-feedback-area';

  const labelElem = document.createElement('div');
  labelElem.className = 'slot-label knob-row-label';
  labelElem.textContent = slot.label;

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'knob-value-display';

  feedbackArea.appendChild(labelElem);
  feedbackArea.appendChild(valueDisplay);

  const scaleControl = document.createElement('div');
  scaleControl.className = 'discrete-scale-control';
  scaleControl.setAttribute('role', 'slider');
  scaleControl.setAttribute('tabindex', '0');
  scaleControl.setAttribute('aria-label', slot.label);
  scaleControl.setAttribute('aria-valuemin', String(slot.min));
  scaleControl.setAttribute('aria-valuemax', String(slot.max));

  const options = [];
  const step = slot.step || 1;
  for (let v = slot.min; v <= slot.max + 1e-6; v += step) {
    options.push(Math.round(v * 1000) / 1000);
  }

  const trackElem = document.createElement('div');
  trackElem.className = 'scale-ticks-track';

  const tickElements = [];

  options.forEach((optVal, idx) => {
    const tickWrapper = document.createElement('div');
    tickWrapper.className = 'scale-tick-wrapper';
    tickWrapper.setAttribute('data-index', String(idx));

    const isHome = slot.homeValue !== undefined && Math.abs(optVal - slot.homeValue) < 1e-6;
    const isMajor =
      idx === 0 ||
      idx === options.length - 1 ||
      optVal === 1.0 ||
      optVal === slot.defaultValue ||
      isHome;
    const tickLine = document.createElement('div');
    tickLine.className = `scale-tick-line ${isMajor ? 'major' : 'minor'}${isHome ? ' home' : ''}`;

    const tickLabel = document.createElement('span');
    tickLabel.className = `scale-tick-label${isHome ? ' home' : ''}`;
    if (isMajor) {
      tickLabel.textContent = `${optVal}${slot.unit || ''}`;
    }

    tickWrapper.appendChild(tickLine);
    if (isMajor) tickWrapper.appendChild(tickLabel);

    trackElem.appendChild(tickWrapper);
    tickElements.push(tickWrapper);
  });

  scaleControl.appendChild(trackElem);
  container.appendChild(feedbackArea);
  container.appendChild(scaleControl);
  cardContainer.appendChild(container);

  let currentVal =
    currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;

  let currentIndex = options.findIndex((v) => Math.abs(v - currentVal) < 1e-4);
  if (currentIndex === -1) currentIndex = 0;

  const updateDiscreteUI = (idx) => {
    const activeVal = options[idx];
    valueDisplay.textContent = `${activeVal}${slot.unit || ''}`;
    scaleControl.setAttribute('aria-valuenow', String(activeVal));

    tickElements.forEach((elem, i) => {
      if (i === idx) {
        elem.classList.add('active');
      } else {
        elem.classList.remove('active');
      }
    });
  };

  updateDiscreteUI(currentIndex);

  const applyDiscreteIndex = (newIdx) => {
    const clampedIdx = Math.max(0, Math.min(options.length - 1, newIdx));
    if (clampedIdx === currentIndex) return;

    currentIndex = clampedIdx;
    currentVal = options[currentIndex];
    currentSlotStates[slot.id] = currentVal;

    updateDiscreteUI(currentIndex);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: currentVal });

    if (appSettings.soundEffects) playSwitchSound(true);
    if (appSettings.hapticFeedback) triggerHaptic(12);
  };

  let isPointerDown = false;
  let startX = 0;
  let hasSwiped = false;

  const onPointerDown = (e) => {
    isPointerDown = true;
    startX = e.clientX;
    hasSwiped = false;
    try {
      scaleControl.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    if (!isPointerDown) return;
    const deltaX = e.clientX - startX;
    if (Math.abs(deltaX) > 25) hasSwiped = true;

    if (deltaX < -25) {
      if (currentIndex > 0) {
        applyDiscreteIndex(currentIndex - 1);
        startX = e.clientX;
      }
    } else if (deltaX > 25) {
      if (currentIndex < options.length - 1) {
        applyDiscreteIndex(currentIndex + 1);
        startX = e.clientX;
      }
    }
  };

  const onPointerUp = (e) => {
    if (isPointerDown) {
      isPointerDown = false;
      if (e.type === 'pointerup' && !hasSwiped && Math.abs(e.clientX - startX) <= 25) {
        const trackBounds = trackElem.getBoundingClientRect();
        if (trackBounds.width > 0) {
          const index = Math.floor(
            ((e.clientX - trackBounds.left) / trackBounds.width) * options.length
          );
          applyDiscreteIndex(index);
        }
      }
      try {
        scaleControl.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  scaleControl.addEventListener('pointerdown', onPointerDown);
  scaleControl.addEventListener('pointermove', onPointerMove);
  scaleControl.addEventListener('pointerup', onPointerUp);
  scaleControl.addEventListener('pointercancel', onPointerUp);

  scaleControl.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const direction = e.deltaY > 0 || e.deltaX > 0 ? -1 : 1;
      applyDiscreteIndex(currentIndex + direction);
    },
    { passive: false }
  );

  scaleControl.addEventListener('keydown', (e) => {
    const direction =
      e.key === 'ArrowUp' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!direction) return;

    e.preventDefault();
    applyDiscreteIndex(currentIndex + direction);
  });
}

/**
 * Render Large PA Mixer Fader Widget with Vertical Pointer Events Drag
 */
function renderFaderWidget(cardContainer, slot, deckId) {
  const container = document.createElement('div');
  container.className = 'fader-container';

  const scaleLeft = document.createElement('div');
  scaleLeft.className = 'fader-scale fader-scale-left';

  const trackWrapper = document.createElement('div');
  trackWrapper.className = 'fader-track-wrapper';
  trackWrapper.setAttribute('role', 'slider');
  trackWrapper.setAttribute('tabindex', '0');
  trackWrapper.setAttribute('aria-label', slot.label);
  trackWrapper.setAttribute('aria-valuemin', String(slot.min));
  trackWrapper.setAttribute('aria-valuemax', String(slot.max));
  trackWrapper.setAttribute('aria-orientation', 'vertical');

  const slotLine = document.createElement('div');
  slotLine.className = 'fader-slot-line';

  const fillBar = document.createElement('div');
  fillBar.className = 'fader-fill-bar';

  const cap = document.createElement('div');
  cap.className = 'fader-cap';
  const capStripe = document.createElement('div');
  capStripe.className = 'fader-cap-stripe';
  cap.appendChild(capStripe);

  slotLine.appendChild(fillBar);
  trackWrapper.appendChild(slotLine);
  trackWrapper.appendChild(cap);

  const scaleRight = document.createElement('div');
  scaleRight.className = 'fader-scale fader-scale-right';

  const isDB = slot.unit === 'dB';
  const ticks = isDB ? ['+10', '0', '-6', '-18', '-30', '-∞'] : ['100', '75', '50', '25', '0'];

  ticks.forEach((t) => {
    const lblL = document.createElement('span');
    lblL.textContent = t;
    scaleLeft.appendChild(lblL);

    const lblR = document.createElement('span');
    lblR.textContent = '—';
    scaleRight.appendChild(lblR);
  });

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'fader-value';

  const faderBody = document.createElement('div');
  faderBody.className = 'fader-body';
  faderBody.appendChild(scaleLeft);
  faderBody.appendChild(trackWrapper);
  faderBody.appendChild(scaleRight);

  container.appendChild(faderBody);
  container.appendChild(valueDisplay);
  cardContainer.appendChild(container);

  let val =
    currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;

  const updateFaderUI = (value) => {
    const min = slot.min;
    const max = slot.max;
    const norm = Math.max(0, Math.min(1, (value - min) / (max - min)));

    const capPercent = norm * 100;
    cap.style.bottom = `calc(${capPercent}% - 16px)`;
    fillBar.style.height = `${capPercent}%`;

    valueDisplay.textContent = `${value}${slot.unit || ''}`;
    trackWrapper.setAttribute('aria-valuenow', String(value));
  };

  updateFaderUI(val);

  // Same coarse-step tick gating as the wheel control (range/20).
  const faderTickStep = Math.max(slot.step || 1, (slot.max - slot.min) / 20);
  let lastFaderTickBucket = Math.floor(val / faderTickStep);

  const applyFaderValue = (newVal) => {
    if (newVal === val) return;

    val = newVal;
    currentSlotStates[slot.id] = val;
    updateFaderUI(val);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    const bucket = Math.floor(val / faderTickStep);
    if (bucket !== lastFaderTickBucket) {
      lastFaderTickBucket = bucket;
      if (appSettings.soundEffects) playKnobTickSound();
      if (appSettings.hapticFeedback) triggerHaptic(8);
    }
  };

  let isDragging = false;

  const updateValFromPointer = (e) => {
    const rect = trackWrapper.getBoundingClientRect();
    const trackHeight = rect.height;
    if (trackHeight <= 0) return;

    const offsetY = rect.bottom - e.clientY;
    const norm = Math.max(0, Math.min(1, offsetY / trackHeight));

    const range = slot.max - slot.min;
    const step = slot.step || 1;
    let newVal = Math.round((slot.min + norm * range) / step) * step;
    newVal = Math.max(slot.min, Math.min(slot.max, newVal));

    applyFaderValue(newVal);
  };

  const onPointerDown = (e) => {
    isDragging = true;
    trackWrapper.classList.add('dragging');
    try {
      trackWrapper.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    updateValFromPointer(e);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    updateValFromPointer(e);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      isDragging = false;
      trackWrapper.classList.remove('dragging');
      try {
        trackWrapper.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  trackWrapper.addEventListener('pointerdown', onPointerDown);
  trackWrapper.addEventListener('pointermove', onPointerMove);
  trackWrapper.addEventListener('pointerup', onPointerUp);
  trackWrapper.addEventListener('pointercancel', onPointerUp);
  trackWrapper.addEventListener('keydown', (e) => {
    const direction =
      e.key === 'ArrowUp' || e.key === 'ArrowRight'
        ? 1
        : e.key === 'ArrowDown' || e.key === 'ArrowLeft'
          ? -1
          : 0;
    if (!direction) return;

    e.preventDefault();
    const step = slot.step || 1;
    const newVal = Math.max(slot.min, Math.min(slot.max, val + direction * step));
    applyFaderValue(newVal);
  });
}

/**
 * Render Protective Flip Switch with 2-Step Sideways Swipe & Tap
 * Interaction. The cover used to open upward, but a vertical drag on
 * the cover was indistinguishable from the deck pager's flick, so
 * closing the cover flipped the page. The cover now swings open
 * sideways like a door, and the housing is wide and low instead of
 * tall, which also returns page height to the decks that use it.
 */
function renderFlipSwitchWidget(cardContainer, slot, deckId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flip-switch-container';

  const housing = document.createElement('div');
  housing.className = 'flip-switch-housing';

  // Hinged semi-transparent protective cover
  const cover = document.createElement('div');
  cover.className = 'flip-switch-cover';
  cover.setAttribute('role', 'button');
  cover.setAttribute('tabindex', '0');
  cover.setAttribute('aria-label', `${slot.label} cover`);
  cover.setAttribute('aria-expanded', 'false');

  const coverLabel = document.createElement('span');
  coverLabel.className = 'flip-switch-cover-label';
  coverLabel.textContent = 'SWIPE ◀';
  cover.appendChild(coverLabel);

  // Switch base & lever inside
  const base = document.createElement('div');
  base.className = 'flip-switch-base';
  base.setAttribute('role', 'switch');
  base.setAttribute('tabindex', '0');
  base.setAttribute('aria-label', slot.label);

  const isSwitchedOn = !!currentSlotStates[slot.id];
  base.setAttribute('aria-checked', String(isSwitchedOn));
  const lever = document.createElement('div');
  lever.className = `flip-switch-lever ${isSwitchedOn ? 'active' : ''}`;

  const statusLed = document.createElement('div');
  statusLed.className = `flip-switch-led ${isSwitchedOn ? 'active' : ''}`;

  base.appendChild(lever);
  base.appendChild(statusLed);

  housing.appendChild(base);
  housing.appendChild(cover);

  wrapper.appendChild(housing);
  cardContainer.appendChild(wrapper);

  let isCoverOpen = false;
  let dragStartX = 0;
  let isCoverDragging = false;
  let didCoverDrag = false;
  let suppressBaseClick = false;

  const setCoverOpen = (open) => {
    if (open === isCoverOpen) return;

    isCoverOpen = open;
    housing.classList.toggle('cover-open', isCoverOpen);
    cover.setAttribute('aria-expanded', String(isCoverOpen));
    if (appSettings.soundEffects) playSwitchSound(isCoverOpen);
    if (appSettings.hapticFeedback) triggerHaptic(isCoverOpen ? 12 : 8);
  };

  const onHousingPointerDown = (e) => {
    isCoverDragging = true;
    didCoverDrag = false;
    dragStartX = e.clientX;
    try {
      housing.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onHousingPointerMove = (e) => {
    if (!isCoverDragging) return;
    const deltaX = e.clientX - dragStartX;

    if (deltaX < -15 && !isCoverOpen) {
      didCoverDrag = true;
      setCoverOpen(true);
    } else if (Math.abs(deltaX) > 15 && isCoverOpen) {
      didCoverDrag = true;
      setCoverOpen(false);
    }
  };

  const onHousingPointerUp = (e) => {
    if (isCoverDragging) {
      isCoverDragging = false;
      if (didCoverDrag) suppressBaseClick = true;
      try {
        housing.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  housing.addEventListener('pointerdown', onHousingPointerDown);
  housing.addEventListener('pointermove', onHousingPointerMove);
  housing.addEventListener('pointerup', onHousingPointerUp);
  housing.addEventListener('pointercancel', onHousingPointerUp);

  // Tap toggles the cover. The handler sits on the housing (pointer
  // capture retargets clicks there after any drag), and clicks that
  // land on the base belong to the switch itself, not the cover.
  housing.addEventListener('click', (e) => {
    if (didCoverDrag) return;
    if (base.contains(e.target)) return;
    setCoverOpen(!isCoverOpen);
  });

  cover.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setCoverOpen(!isCoverOpen);
  });

  const toggleBase = () => {
    if (suppressBaseClick) {
      suppressBaseClick = false;
      return;
    }
    if (!isCoverOpen) {
      cover.classList.add('swipe-hint');
      setTimeout(() => cover.classList.remove('swipe-hint'), 400);
      return;
    }

    const newState = !currentSlotStates[slot.id];
    currentSlotStates[slot.id] = newState;

    if (newState) {
      lever.classList.add('active');
      statusLed.classList.add('active');
    } else {
      lever.classList.remove('active');
      statusLed.classList.remove('active');
    }
    base.setAttribute('aria-checked', String(newState));

    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, {
      enabled: newState,
      protectedCover: true,
      fromFlipSwitch: true,
    });

    if (appSettings.soundEffects) playSwitchSound(newState);
    if (appSettings.hapticFeedback) triggerHaptic(20);
  };

  base.addEventListener('click', toggleBase);
  base.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    toggleBase();
  });
}

/**
 * Render 2x2 or 4x4 Multi-Pad Grid with 3D Tactile Press-Down Animation
 * Pads are momentary action triggers: they flash while pressed and never
 * hold a persistent "on" state.
 */
// Single-colour SVG symbols for pads and toggles. Emoji render small
// and cheap at pad sizes; these draw crisply at any size in currentColor.
const PAD_ICON_PATHS = {
  playPause:
    '<path d="M5 5.4v13.2c0 .8.9 1.3 1.6.9l9.2-6.6c.6-.4.6-1.4 0-1.8L6.6 4.5C5.9 4.1 5 4.6 5 5.4Z"/><rect x="17.6" y="5" width="2.3" height="14" rx="0.7"/><rect x="20.7" y="5" width="2.3" height="14" rx="0.7"/>',
  seekBack: '<path d="M11.2 5 3.8 12l7.4 7V5Z"/><path d="M20.2 5 12.8 12l7.4 7V5Z"/>',
  seekFwd: '<path d="m12.8 5 7.4 7-7.4 7V5Z"/><path d="m3.8 5 7.4 7-7.4 7V5Z"/>',
  prev: '<rect x="4" y="5" width="2.4" height="14" rx="0.7"/><path d="M20 5.4v13.2c0 .8-.9 1.3-1.6.9L9.2 12.9a1.15 1.15 0 0 1 0-1.8l9.2-6.6c.7-.4 1.6.1 1.6.9Z"/>',
  next: '<rect x="17.6" y="5" width="2.4" height="14" rx="0.7"/><path d="M4 5.4v13.2c0 .8.9 1.3 1.6.9l9.2-6.6a1.15 1.15 0 0 0 0-1.8L5.6 4.5C4.9 4.1 4 4.6 4 5.4Z"/>',
  pip: '<rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><rect x="12.4" y="11.4" width="6.2" height="4.8" rx="1"/>',
  fullscreen:
    '<path d="M4 9.2V6a2 2 0 0 1 2-2h3.2M20 9.2V6a2 2 0 0 0-2-2h-3.2M4 14.8V18a2 2 0 0 0 2 2h3.2M20 14.8V18a2 2 0 0 1-2 2h-3.2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  volumeOn:
    '<path d="M4 9.6v4.8h3.4L12 18.5V5.5L7.4 9.6H4Z"/><path d="M15.4 9.4a3.8 3.8 0 0 1 0 5.2M18 7a7.6 7.6 0 0 1 0 10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  volumeOff:
    '<path d="M4 9.6v4.8h3.4L12 18.5V5.5L7.4 9.6H4Z"/><path d="m16 9.8 5.2 5.2M21.2 9.8 16 15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  plus: '<path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/>',
  close:
    '<path d="M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4L12 13.4 6.4 19 5 17.6 10.6 12 5 6.4z"/>',
  triLeft: '<path d="M16 5v14L7 12z"/>',
  triRight: '<path d="M8 5v14l9-7z"/>',
  mic: '<path d="M12 14.5a2.75 2.75 0 0 0 2.75-2.75v-5.5a2.75 2.75 0 1 0-5.5 0v5.5A2.75 2.75 0 0 0 12 14.5Z"/><path d="M17.5 11.25a5.5 5.5 0 0 1-11 0M12 16.75V20M9 20h6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>',
  triUp: '<path d="M12 6.5 19 17H5z"/>',
  triDown: '<path d="m12 17.5-7-11h14z"/>',
  dblUp:
    '<path d="m6 14.5 6-6 6 6M6 19.5l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
  dblDown:
    '<path d="m6 4.5 6 6 6-6M6 9.5l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<path d="M6.5 3H19a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-12A2.5 2.5 0 0 1 6.5 3Z" fill="none" stroke="currentColor" stroke-width="1.9"/><path d="M20 15H6.5A2.5 2.5 0 0 0 4 17.5" fill="none" stroke="currentColor" stroke-width="1.9"/>',
};

function createPadIcon(name) {
  if (typeof document.createElementNS !== 'function' || !PAD_ICON_PATHS[name]) {
    return null;
  }
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'pad-icon-svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = PAD_ICON_PATHS[name];
  return svg;
}

function renderMultiPadWidget(cardContainer, slot, _deckId) {
  const is4x4 = slot.type === 'pad4x4';
  // When a slot declares its own pad list, render exactly those pads
  // (the transport grid has 3: one wide toggle plus two seek pads).
  const gridCount = is4x4 ? 16 : slot.pads ? slot.pads.length : 4;
  const cols = is4x4 ? 4 : 2;

  const padGrid = document.createElement('div');
  padGrid.className = `multipad-grid multipad-${cols}x${cols}`;
  if (slot.compact) padGrid.classList.add('multipad-compact');

  for (let i = 0; i < gridCount; i++) {
    const padDef = (slot.pads && slot.pads[i]) || {
      id: `pad_${i + 1}`,
      label: `P${i + 1}`,
      icon: is4x4 ? `${i + 1}` : ['▶', '⏸', '⏹', '🔁'][i] || `${i + 1}`,
    };

    const padBtn = document.createElement('button');
    padBtn.className = 'multipad-button';
    if (padDef.wide) padBtn.classList.add('pad-wide');
    if (padDef.hero) padBtn.classList.add('pad-hero');
    padBtn.setAttribute('type', 'button');
    padBtn.setAttribute('data-pad-id', padDef.id);
    padBtn.setAttribute('aria-label', padDef.label);

    const iconSpan = document.createElement('span');
    iconSpan.className = 'pad-icon';
    const svgIcon = padDef.iconSvg ? createPadIcon(padDef.iconSvg) : null;
    if (svgIcon) {
      iconSpan.appendChild(svgIcon);
    } else {
      iconSpan.textContent = padDef.icon || '';
    }

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pad-label';
    labelSpan.textContent = padDef.label || '';

    if (padDef.icon || padDef.iconSvg) padBtn.appendChild(iconSpan);
    if (padDef.label && !is4x4) padBtn.appendChild(labelSpan);

    const onPadDown = () => {
      padBtn.classList.add('pressed');
    };

    const onPadUp = () => {
      padBtn.classList.remove('pressed');
    };

    padBtn.addEventListener('pointerdown', onPadDown);
    padBtn.addEventListener('pointerup', onPadUp);
    padBtn.addEventListener('pointercancel', onPadUp);

    padBtn.addEventListener('click', () => {
      // Momentary flash only. A persistent lit state would claim something
      // about the page (e.g. "now playing") that the pad cannot know, and
      // it drifts out of sync as soon as the page is operated directly.
      padBtn.classList.add('active');
      setTimeout(() => padBtn.classList.remove('active'), 180);

      dispatchDeckAction(slot.action, { padId: padDef.id, index: i });

      if (appSettings.soundEffects) playButtonSound();
      if (appSettings.hapticFeedback) triggerHaptic(20);
    });

    padGrid.appendChild(padBtn);
  }

  cardContainer.appendChild(padGrid);
}

/**
 * Render Toggle Switch
 */
function renderSwitchWidget(cardContainer, slot, deckId) {
  const wrapper = document.createElement('div');
  wrapper.className = 'switch-wrapper';

  const sw = document.createElement('div');
  sw.className = `hw-switch ${currentSlotStates[slot.id] ? 'active' : ''}`;

  const thumb = document.createElement('div');
  thumb.className = 'hw-switch-thumb';
  sw.appendChild(thumb);

  const statusLabel = document.createElement('span');
  statusLabel.className = 'switch-status-label';
  statusLabel.textContent = currentSlotStates[slot.id] ? 'ON' : 'OFF';

  wrapper.appendChild(sw);
  wrapper.appendChild(statusLabel);
  cardContainer.appendChild(wrapper);

  sw.addEventListener('click', () => {
    const newState = !currentSlotStates[slot.id];
    currentSlotStates[slot.id] = newState;

    if (newState) {
      sw.classList.add('active');
      statusLabel.textContent = 'ON';
    } else {
      sw.classList.remove('active');
      statusLabel.textContent = 'OFF';
    }

    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { enabled: newState });

    if (appSettings.soundEffects) playSwitchSound(newState);
    if (appSettings.hapticFeedback) triggerHaptic(15);
  });
}

/**
 * Render Action Button
 */
function renderButtonWidget(cardContainer, slot, _deckId) {
  const btn = document.createElement('button');
  btn.className = `hw-button variant-${slot.variant || 'secondary'}`;

  const iconSpan = document.createElement('span');
  iconSpan.className = 'btn-icon';
  const btnSvgIcon = slot.iconSvg ? createPadIcon(slot.iconSvg) : null;
  if (btnSvgIcon) {
    iconSpan.appendChild(btnSvgIcon);
  } else {
    iconSpan.textContent = slot.icon || '🔘';
  }

  const textSpan = document.createElement('span');
  textSpan.className = 'btn-text';
  textSpan.textContent = slot.label;

  btn.appendChild(iconSpan);
  btn.appendChild(textSpan);
  cardContainer.appendChild(btn);

  btn.addEventListener('click', () => {
    dispatchDeckAction(slot.action, {});

    if (appSettings.soundEffects) playButtonSound();
    if (appSettings.hapticFeedback) triggerHaptic(20);
  });
}

function dispatchDeckAction(action, payload) {
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
    chrome.runtime.sendMessage({ action, payload }, (_response) => {
      if (chrome.runtime.lastError) {
        // Quietly absorb errors if background worker is sleeping
      }
    });
  } else {
    console.log('[DeskDeck Sim Action]', action, payload);
  }
}
