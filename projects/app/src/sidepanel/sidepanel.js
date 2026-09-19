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

function renderDeckSlots(deckId) {
  const container = document.getElementById('slotsContainer');
  if (!container || !currentDeckPreset) return;

  container.innerHTML = '';

  currentDeckPreset.slots.forEach((slot) => {
    const card = document.createElement('div');
    card.className = `slot-card slot-${slot.type}`;

    const label = document.createElement('div');
    label.className = 'slot-label';
    label.textContent = slot.label;
    card.appendChild(label);

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
 * Render Large Rotary Knob with Circular Pointer Events (Polar Drag Angle Calculation)
 */
function renderKnobWidget(cardContainer, slot, deckId) {
  const container = document.createElement('div');
  container.className = 'knob-container';

  const dialWrapper = document.createElement('div');
  dialWrapper.className = 'knob-dial-wrapper';

  // SVG Tick Marks Ring around Knob
  const svgNS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(svgNS, 'svg');
  svg.setAttribute('class', 'knob-ticks-svg');
  svg.setAttribute('viewBox', '0 0 140 140');

  const totalTicks = 21;
  const minAngleDeg = -135;
  const maxAngleDeg = 135;

  for (let i = 0; i < totalTicks; i++) {
    const fraction = i / (totalTicks - 1);
    const angleDeg = minAngleDeg + fraction * (maxAngleDeg - minAngleDeg);
    const angleRad = (angleDeg - 90) * (Math.PI / 180);

    const isMajor = i % 5 === 0;
    const innerR = isMajor ? 56 : 59;
    const outerR = 66;

    const x1 = 70 + innerR * Math.cos(angleRad);
    const y1 = 70 + innerR * Math.sin(angleRad);
    const x2 = 70 + outerR * Math.cos(angleRad);
    const y2 = 70 + outerR * Math.sin(angleRad);

    const line = document.createElementNS(svgNS, 'line');
    line.setAttribute('x1', x1.toFixed(2));
    line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2));
    line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('class', `knob-tick ${isMajor ? 'major' : 'minor'}`);
    svg.appendChild(line);
  }

  dialWrapper.appendChild(svg);

  const dial = document.createElement('div');
  dial.className = 'knob-dial';
  dial.setAttribute('role', 'slider');
  dial.setAttribute('tabindex', '0');
  dial.setAttribute('aria-label', slot.label);
  dial.setAttribute('aria-valuemin', String(slot.min));
  dial.setAttribute('aria-valuemax', String(slot.max));

  const cap = document.createElement('div');
  cap.className = 'knob-cap';

  const pointer = document.createElement('div');
  pointer.className = 'knob-pointer';
  dial.appendChild(pointer);
  dial.appendChild(cap);
  dialWrapper.appendChild(dial);

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'knob-value';

  container.appendChild(dialWrapper);
  container.appendChild(valueDisplay);
  cardContainer.appendChild(container);

  let val =
    currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;
  let unroundedVal = val;

  const updateKnobUI = (value) => {
    const norm = (value - slot.min) / (slot.max - slot.min);
    // Angle range: -135deg to +135deg (270 degrees total)
    const angle = -135 + norm * 270;
    pointer.style.transform = `rotate(${angle}deg)`;
    valueDisplay.textContent = `${value}${slot.unit || ''}`;
    dial.setAttribute('aria-valuenow', String(value));

    // Highlight SVG ticks up to current value
    const lines = svg.querySelectorAll('line');
    lines.forEach((line, idx) => {
      const lineNorm = idx / (totalTicks - 1);
      if (lineNorm <= norm) {
        line.classList.add('active');
      } else {
        line.classList.remove('active');
      }
    });
  };

  updateKnobUI(val);

  const applyKnobValue = (newVal) => {
    if (newVal === val) return;

    val = newVal;
    currentSlotStates[slot.id] = val;
    updateKnobUI(val);
    saveDeckSlotStates(deckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    if (appSettings.soundEffects) playKnobTickSound();
    if (appSettings.hapticFeedback) triggerHaptic(8);
  };

  // Circular Pointer Movement (Polar Coordinates / Math.atan2)
  let isDragging = false;
  let lastAngle = 0;

  const onPointerDown = (e) => {
    isDragging = true;
    dialWrapper.classList.add('dragging');

    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    lastAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    try {
      dial.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const rect = dial.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
    let deltaAngle = currentAngle - lastAngle;

    // Normalize angle delta to range [-PI, PI] to handle 180/-180 boundary wrap
    while (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
    while (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

    lastAngle = currentAngle;

    // Total sweep angle range is 270 degrees (1.5 * Math.PI radians)
    const range = slot.max - slot.min;
    const deltaVal = (deltaAngle / (1.5 * Math.PI)) * range;

    unroundedVal = Math.max(slot.min, Math.min(slot.max, unroundedVal + deltaVal));

    const step = slot.step || 1;
    const newVal = Math.round(unroundedVal / step) * step;

    applyKnobValue(newVal);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      isDragging = false;
      dialWrapper.classList.remove('dragging');
      try {
        dial.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  dial.addEventListener('pointerdown', onPointerDown);
  dial.addEventListener('pointermove', onPointerMove);
  dial.addEventListener('pointerup', onPointerUp);
  dial.addEventListener('pointercancel', onPointerUp);
  dial.addEventListener('keydown', (e) => {
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
    applyKnobValue(newVal);
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
