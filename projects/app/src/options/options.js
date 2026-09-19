import {
  getSettings,
  saveSettings,
  getUrlMappings,
  saveUrlMappings,
  getSlotMappings,
  saveSlotMappings,
  exportBackupData,
  importBackupData
} from '../lib/storage.js';

import {
  getAvailableDecks,
  DECK_PRESETS,
  ACTION_OPTIONS_BY_TYPE
} from '../lib/deck-manager.js';

let currentUrlMappings = [];
let currentSlotMappings = {};

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();

  // Load Settings
  const settings = await getSettings();
  const soundInput = document.getElementById('soundEffects');
  const hapticInput = document.getElementById('hapticFeedback');

  if (soundInput) soundInput.checked = settings.soundEffects;
  if (hapticInput) hapticInput.checked = settings.hapticFeedback;

  // Load Mappings
  currentUrlMappings = await getUrlMappings();
  currentSlotMappings = await getSlotMappings();

  setupDeckSelectDropdowns();
  renderSlotAssignmentEditor('media');
  renderUrlMappingsTable();
  setupBackupAndRestore();

  // Save All Settings Event Listener
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      soundEffects: soundInput.checked,
      hapticFeedback: hapticInput.checked
    };

    await saveSettings(newSettings);
    await saveUrlMappings(currentUrlMappings);
    await saveSlotMappings(currentSlotMappings);

    const savedText = (typeof chrome !== 'undefined' && chrome.i18n)
      ? chrome.i18n.getMessage('saved') || 'Saved!'
      : 'Saved!';
    saveStatus.textContent = savedText;
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2500);
  });
});

/**
 * Setup deck dropdowns for slot editor and add rule form
 */
function setupDeckSelectDropdowns() {
  const availableDecks = getAvailableDecks();

  const deckSelectEdit = document.getElementById('deckSelectEdit');
  const newDeckSelect = document.getElementById('newDeckSelect');

  const populateDropdown = (selectElem) => {
    if (!selectElem) return;
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
  };

  populateDropdown(deckSelectEdit);
  populateDropdown(newDeckSelect);

  if (deckSelectEdit) {
    deckSelectEdit.addEventListener('change', (e) => {
      renderSlotAssignmentEditor(e.target.value);
    });
  }
}

/**
 * Render slot action parameter customizer for selected deck
 */
function renderSlotAssignmentEditor(deckId) {
  const container = document.getElementById('slotEditorContainer');
  if (!container) return;

  container.innerHTML = '';
  const preset = DECK_PRESETS[deckId] || DECK_PRESETS.media;
  const deckCustoms = currentSlotMappings[deckId] || {};

  preset.slots.forEach((slot) => {
    const card = document.createElement('div');
    card.className = 'slot-edit-card';

    const header = document.createElement('div');
    header.className = 'slot-edit-header';

    const labelSpan = document.createElement('span');
    labelSpan.textContent = slot.label;

    const typeSpan = document.createElement('span');
    typeSpan.className = 'slot-edit-type';
    typeSpan.textContent = slot.type;

    header.appendChild(labelSpan);
    header.appendChild(typeSpan);
    card.appendChild(header);

    const select = document.createElement('select');
    select.className = 'select-input';

    const options = ACTION_OPTIONS_BY_TYPE[slot.type] || [
      { value: slot.action, label: slot.action }
    ];

    const currentAction = (deckCustoms[slot.id] && deckCustoms[slot.id].action)
      ? deckCustoms[slot.id].action
      : slot.action;

    options.forEach((opt) => {
      const optionElem = document.createElement('option');
      optionElem.value = opt.value;
      optionElem.textContent = opt.label;
      if (opt.value === currentAction) {
        optionElem.selected = true;
      }
      select.appendChild(optionElem);
    });

    select.addEventListener('change', (e) => {
      if (!currentSlotMappings[deckId]) {
        currentSlotMappings[deckId] = {};
      }
      currentSlotMappings[deckId][slot.id] = {
        ...(currentSlotMappings[deckId][slot.id] || {}),
        action: e.target.value
      };
    });

    card.appendChild(select);
    container.appendChild(card);
  });
}

/**
 * Render URL pattern and deck mapping table
 */
function renderUrlMappingsTable() {
  const tbody = document.getElementById('urlMappingTbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const availableDecks = getAvailableDecks();

  currentUrlMappings.forEach((rule, idx) => {
    const tr = document.createElement('tr');

    // Domain pattern input
    const tdPattern = document.createElement('td');
    const inputPattern = document.createElement('input');
    inputPattern.type = 'text';
    inputPattern.className = 'text-input';
    inputPattern.value = rule.pattern;
    inputPattern.addEventListener('input', (e) => {
      rule.pattern = e.target.value.trim();
    });
    tdPattern.appendChild(inputPattern);

    // Deck select
    const tdDeck = document.createElement('td');
    const selectDeck = document.createElement('select');
    selectDeck.className = 'select-input';
    availableDecks.forEach((d) => {
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = (typeof chrome !== 'undefined' && chrome.i18n)
        ? chrome.i18n.getMessage(d.nameKey) || d.title
        : d.title;
      if (d.id === rule.deckId) opt.selected = true;
      selectDeck.appendChild(opt);
    });
    selectDeck.addEventListener('change', (e) => {
      rule.deckId = e.target.value;
    });
    tdDeck.appendChild(selectDeck);

    // Enabled checkbox
    const tdEnabled = document.createElement('td');
    const chkEnabled = document.createElement('input');
    chkEnabled.type = 'checkbox';
    chkEnabled.checked = rule.enabled !== false;
    chkEnabled.addEventListener('change', (e) => {
      rule.enabled = e.target.checked;
    });
    tdEnabled.appendChild(chkEnabled);

    // Action (Delete button)
    const tdAction = document.createElement('td');
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-danger';
    delBtn.textContent = '✖';
    delBtn.addEventListener('click', () => {
      currentUrlMappings.splice(idx, 1);
      renderUrlMappingsTable();
    });
    tdAction.appendChild(delBtn);

    tr.appendChild(tdPattern);
    tr.appendChild(tdDeck);
    tr.appendChild(tdEnabled);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });

  // Setup Add Rule button
  const addBtn = document.getElementById('addRuleBtn');
  if (addBtn && !addBtn.dataset.bound) {
    addBtn.dataset.bound = 'true';
    addBtn.addEventListener('click', () => {
      const patternInput = document.getElementById('newPatternInput');
      const newDeckSelect = document.getElementById('newDeckSelect');

      const pattern = patternInput ? patternInput.value.trim() : '';
      const deckId = newDeckSelect ? newDeckSelect.value : 'media';

      if (!pattern) return;

      currentUrlMappings.push({
        id: `rule_${Date.now()}`,
        pattern,
        deckId,
        enabled: true
      });

      if (patternInput) patternInput.value = '';
      renderUrlMappingsTable();
    });
  }
}

/**
 * Setup JSON export and import backup handlers
 */
function setupBackupAndRestore() {
  const exportBtn = document.getElementById('exportJsonBtn');
  const importInput = document.getElementById('importJsonFile');

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const backupData = await exportBackupData();
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = `deskdeck-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          const result = await importBackupData(parsed);

          const saveStatus = document.getElementById('saveStatus');
          if (result.success) {
            currentUrlMappings = await getUrlMappings();
            currentSlotMappings = await getSlotMappings();

            const deckSelectEdit = document.getElementById('deckSelectEdit');
            renderSlotAssignmentEditor(deckSelectEdit ? deckSelectEdit.value : 'media');
            renderUrlMappingsTable();

            if (saveStatus) {
              saveStatus.textContent = 'Backup restored successfully!';
              setTimeout(() => { saveStatus.textContent = ''; }, 3000);
            }
          } else {
            alert(`Import failed: ${result.error}`);
          }
        } catch (err) {
          alert(`Failed to parse JSON file: ${err.message}`);
        }
      };
      reader.readAsText(file);
    });
  }
}

function initI18n() {
  if (typeof chrome === 'undefined' || !chrome.i18n) return;

  document.querySelectorAll('[data-i18n]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n');
    const msg = chrome.i18n.getMessage(key);
    if (msg) {
      elem.textContent = msg;
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((elem) => {
    const key = elem.getAttribute('data-i18n-placeholder');
    const msg = chrome.i18n.getMessage(key);
    if (msg) {
      elem.setAttribute('placeholder', msg);
    }
  });
}
