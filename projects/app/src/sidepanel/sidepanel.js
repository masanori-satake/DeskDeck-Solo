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
function renderDeckSlots(deckId) {
  const container = document.getElementById('slotsContainer');
  if (!container || !currentDeckPreset) return;

  container.innerHTML = '';

  currentDeckPreset.slots.forEach((slot) => {
    const card = document.createElement('div');
    card.className = `slot-card slot-${slot.type}`;

    if (slot.type !== 'knob') {
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

    container.appendChild(card);
  });
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

  let val =
    currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;
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

  const applyValue = (newVal) => {
    if (newVal === val) return;

    val = newVal;
    currentSlotStates[slot.id] = val;
    updateWheelUI(val);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    if (appSettings.soundEffects) playKnobTickSound();
    if (appSettings.hapticFeedback) triggerHaptic(8);
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

    const isMajor =
      idx === 0 || idx === options.length - 1 || optVal === 1.0 || optVal === slot.defaultValue;
    const tickLine = document.createElement('div');
    tickLine.className = `scale-tick-line ${isMajor ? 'major' : 'minor'}`;

    const tickLabel = document.createElement('span');
    tickLabel.className = 'scale-tick-label';
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

  const applyFaderValue = (newVal) => {
    if (newVal === val) return;

    val = newVal;
    currentSlotStates[slot.id] = val;
    updateFaderUI(val);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    if (appSettings.soundEffects) playKnobTickSound();
    if (appSettings.hapticFeedback) triggerHaptic(8);
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
 * Render Protective Flip Switch with 2-Step Upward Swipe & Tap Interaction
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
  coverLabel.textContent = 'SWIPE ▲';
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

  const statusText = document.createElement('span');
  statusText.className = 'flip-switch-status';
  statusText.textContent = isSwitchedOn ? 'ARMED / ON' : 'OFF';

  wrapper.appendChild(housing);
  wrapper.appendChild(statusText);
  cardContainer.appendChild(wrapper);

  let isCoverOpen = false;
  let dragStartY = 0;
  let isCoverDragging = false;
  let didCoverDrag = false;

  const setCoverOpen = (open) => {
    if (open === isCoverOpen) return;

    isCoverOpen = open;
    housing.classList.toggle('cover-open', isCoverOpen);
    cover.setAttribute('aria-expanded', String(isCoverOpen));
    if (appSettings.soundEffects) playSwitchSound(isCoverOpen);
    if (appSettings.hapticFeedback) triggerHaptic(isCoverOpen ? 12 : 8);
  };

  const onCoverPointerDown = (e) => {
    isCoverDragging = true;
    didCoverDrag = false;
    dragStartY = e.clientY;
    try {
      cover.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onCoverPointerMove = (e) => {
    if (!isCoverDragging) return;
    const deltaY = e.clientY - dragStartY;

    if (deltaY < -15 && !isCoverOpen) {
      didCoverDrag = true;
      setCoverOpen(true);
    } else if (deltaY > 15 && isCoverOpen) {
      didCoverDrag = true;
      setCoverOpen(false);
    }
  };

  const onCoverPointerUp = (e) => {
    if (isCoverDragging) {
      isCoverDragging = false;
      try {
        cover.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  cover.addEventListener('pointerdown', onCoverPointerDown);
  cover.addEventListener('pointermove', onCoverPointerMove);
  cover.addEventListener('pointerup', onCoverPointerUp);
  cover.addEventListener('pointercancel', onCoverPointerUp);

  cover.addEventListener('click', () => {
    if (didCoverDrag) return;
    setCoverOpen(!isCoverOpen);
  });

  cover.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    setCoverOpen(!isCoverOpen);
  });

  const toggleBase = () => {
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
      statusText.textContent = 'ARMED / ON';
    } else {
      lever.classList.remove('active');
      statusLed.classList.remove('active');
      statusText.textContent = 'OFF';
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
 */
function renderMultiPadWidget(cardContainer, slot, deckId) {
  const is4x4 = slot.type === 'pad4x4';
  const gridCount = is4x4 ? 16 : 4;
  const cols = is4x4 ? 4 : 2;

  const padGrid = document.createElement('div');
  padGrid.className = `multipad-grid multipad-${cols}x${cols}`;

  const padStates = { ...(currentSlotStates[slot.id] || {}) };
  currentSlotStates[slot.id] = padStates;

  for (let i = 0; i < gridCount; i++) {
    const padDef = (slot.pads && slot.pads[i]) || {
      id: `pad_${i + 1}`,
      label: `P${i + 1}`,
      icon: is4x4 ? `${i + 1}` : ['▶', '⏸', '⏹', '🔁'][i] || `${i + 1}`,
    };

    const padBtn = document.createElement('button');
    padBtn.className = 'multipad-button';
    padBtn.setAttribute('type', 'button');
    padBtn.setAttribute('data-pad-id', padDef.id);
    padBtn.setAttribute('aria-label', padDef.label);
    padBtn.setAttribute('aria-pressed', String(!!padStates[padDef.id]));

    if (padStates[padDef.id]) {
      padBtn.classList.add('active');
    }

    const iconSpan = document.createElement('span');
    iconSpan.className = 'pad-icon';
    iconSpan.textContent = padDef.icon || '';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'pad-label';
    labelSpan.textContent = padDef.label || '';

    if (padDef.icon) padBtn.appendChild(iconSpan);
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
      const activeState = !padStates[padDef.id];
      padStates[padDef.id] = activeState;
      currentSlotStates[slot.id] = padStates;

      if (activeState) {
        padBtn.classList.add('active');
      } else {
        padBtn.classList.remove('active');
      }
      padBtn.setAttribute('aria-pressed', String(activeState));

      saveDeckSlotStates(deckId, currentSlotStates);
      dispatchDeckAction(slot.action, { padId: padDef.id, index: i, active: activeState });

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
  iconSpan.textContent = slot.icon || '🔘';

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
