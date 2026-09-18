import {
  getActiveDeckId,
  setActiveDeckId,
  getDeckSlotStates,
  saveDeckSlotStates,
  getSettings
} from '../lib/storage.js';

import {
  getDeckPreset,
  getAvailableDecks
} from '../lib/deck-manager.js';

import {
  playKnobTickSound,
  playSwitchSound,
  playButtonSound,
  triggerHaptic
} from '../lib/audio.js';

let activeDeckId = 'media';
let currentDeckPreset = null;
let currentSlotStates = {};
let appSettings = { soundEffects: true, hapticFeedback: true };

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();
  appSettings = await getSettings();

  activeDeckId = await getActiveDeckId();
  setupDeckSelector();
  setupOptionsButton();

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
    const localizedTitle = (typeof chrome !== 'undefined' && chrome.i18n)
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

async function loadAndRenderActiveDeck(deckId) {
  currentDeckPreset = getDeckPreset(deckId);
  const storedStates = await getDeckSlotStates(deckId) || {};

  currentSlotStates = {};
  currentDeckPreset.slots.forEach((slot) => {
    currentSlotStates[slot.id] = storedStates[slot.id] !== undefined
      ? storedStates[slot.id]
      : slot.defaultValue;
  });

  const titleElem = document.getElementById('activeDeckTitle');
  if (titleElem) {
    const localizedTitle = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage(currentDeckPreset.nameKey) || currentDeckPreset.title
      : currentDeckPreset.title;
    titleElem.textContent = localizedTitle;
  }

  renderDeckSlots();
}

function renderDeckSlots() {
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
      renderKnobWidget(card, slot);
    } else if (slot.type === 'switch') {
      renderSwitchWidget(card, slot);
    } else if (slot.type === 'button') {
      renderButtonWidget(card, slot);
    }

    container.appendChild(card);
  });
}

/**
 * Render Rotary Knob with Pointer Events (Drag/Angle calculation)
 */
function renderKnobWidget(cardContainer, slot) {
  const container = document.createElement('div');
  container.className = 'knob-container';

  const dial = document.createElement('div');
  dial.className = 'knob-dial';
  dial.tabIndex = 0;
  dial.setAttribute('role', 'slider');
  dial.setAttribute('aria-label', slot.label);
  dial.setAttribute('aria-valuemin', slot.min);
  dial.setAttribute('aria-valuemax', slot.max);

  const pointer = document.createElement('div');
  pointer.className = 'knob-pointer';
  dial.appendChild(pointer);

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'knob-value';

  container.appendChild(dial);
  container.appendChild(valueDisplay);
  cardContainer.appendChild(container);

  let val = currentSlotStates[slot.id] !== undefined ? currentSlotStates[slot.id] : slot.defaultValue;

  const updateKnobUI = (value) => {
    const norm = (value - slot.min) / (slot.max - slot.min);
    // Angle range: -135deg to +135deg
    const angle = -135 + norm * 270;
    pointer.style.transform = `rotate(${angle}deg)`;
    valueDisplay.textContent = `${value}${slot.unit || ''}`;
    dial.setAttribute('aria-valuenow', value);
    dial.setAttribute('aria-valuetext', `${value}${slot.unit || ''}`);
  };

  const commitKnobValue = (newValue) => {
    if (newValue === val) return;

    val = newValue;
    currentSlotStates[slot.id] = val;
    updateKnobUI(val);
    saveDeckSlotStates(activeDeckId, currentSlotStates);
    dispatchDeckAction(slot.action, { value: val });

    if (appSettings.soundEffects) playKnobTickSound();
    if (appSettings.hapticFeedback) triggerHaptic(8);
  };

  updateKnobUI(val);

  // Pointer event tracking for tactile rotation knob
  let isDragging = false;
  let startY = 0;
  let startValue = val;

  const onPointerDown = (e) => {
    isDragging = true;
    startY = e.clientY;
    startValue = val;
    dial.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;

    const deltaY = startY - e.clientY; // drag up increases, down decreases
    const range = slot.max - slot.min;
    const step = slot.step || 1;

    let newVal = Math.round((startValue + (deltaY / 150) * range) / step) * step;
    newVal = Math.max(slot.min, Math.min(slot.max, newVal));

    commitKnobValue(newVal);
  };

  const onPointerUp = (e) => {
    if (isDragging) {
      isDragging = false;
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
    const direction = {
      ArrowUp: 1,
      ArrowRight: 1,
      ArrowDown: -1,
      ArrowLeft: -1
    }[e.key];

    if (!direction) return;

    e.preventDefault();
    const step = slot.step || 1;
    const newVal = Math.max(slot.min, Math.min(slot.max, val + direction * step));
    commitKnobValue(newVal);
  });
}

/**
 * Render Toggle Switch
 */
function renderSwitchWidget(cardContainer, slot) {
  const wrapper = document.createElement('div');
  wrapper.className = 'switch-wrapper';

  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = `hw-switch ${currentSlotStates[slot.id] ? 'active' : ''}`;
  sw.setAttribute('role', 'switch');
  sw.setAttribute('aria-label', slot.label);
  sw.setAttribute('aria-checked', currentSlotStates[slot.id] ? 'true' : 'false');

  const onText = (typeof chrome !== 'undefined' && chrome.i18n)
    ? chrome.i18n.getMessage('switchOn') || 'ON'
    : 'ON';
  const offText = (typeof chrome !== 'undefined' && chrome.i18n)
    ? chrome.i18n.getMessage('switchOff') || 'OFF'
    : 'OFF';

  const thumb = document.createElement('div');
  thumb.className = 'hw-switch-thumb';
  sw.appendChild(thumb);

  const statusLabel = document.createElement('span');
  statusLabel.className = 'switch-status-label';
  statusLabel.textContent = currentSlotStates[slot.id] ? onText : offText;

  wrapper.appendChild(sw);
  wrapper.appendChild(statusLabel);
  cardContainer.appendChild(wrapper);

  sw.addEventListener('click', () => {
    const newState = !currentSlotStates[slot.id];
    currentSlotStates[slot.id] = newState;
    sw.setAttribute('aria-checked', newState ? 'true' : 'false');

    if (newState) {
      sw.classList.add('active');
      statusLabel.textContent = onText;
    } else {
      sw.classList.remove('active');
      statusLabel.textContent = offText;
    }

    saveDeckSlotStates(activeDeckId, currentSlotStates);
    dispatchDeckAction(slot.action, { enabled: newState });

    if (appSettings.soundEffects) playSwitchSound(newState);
    if (appSettings.hapticFeedback) triggerHaptic(15);
  });
}

/**
 * Render Action Button
 */
function renderButtonWidget(cardContainer, slot) {
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
    chrome.runtime.sendMessage({ action, payload }, (response) => {
      if (chrome.runtime.lastError) {
        // Quietly absorb errors if background worker is sleeping
      }
    });
  } else {
    console.log('[DeskDeck Sim Action]', action, payload);
  }
}
