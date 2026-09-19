import { getSettings, saveSettings } from '../lib/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();
  const settings = await getSettings();

  const soundInput = document.getElementById('soundEffects');
  const hapticInput = document.getElementById('hapticFeedback');
  const saveBtn = document.getElementById('saveBtn');
  const saveStatus = document.getElementById('saveStatus');

  if (soundInput) soundInput.checked = settings.soundEffects;
  if (hapticInput) hapticInput.checked = settings.hapticFeedback;

  saveBtn.addEventListener('click', async () => {
    const newSettings = {
      soundEffects: soundInput.checked,
      hapticFeedback: hapticInput.checked
    };
    await saveSettings(newSettings);

    const savedText = typeof chrome !== 'undefined' && chrome.i18n ? chrome.i18n.getMessage('saved') || 'Saved!' : 'Saved!';
    saveStatus.textContent = savedText;
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2000);
  });
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
