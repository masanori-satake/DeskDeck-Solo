import { getSettings, saveSettings } from '../lib/storage.js';

document.addEventListener('DOMContentLoaded', async () => {
  initI18n();
  const settings = await getSettings();

  const soundInput = document.getElementById('soundEffects');
  const hapticInput = document.getElementById('hapticFeedback');
  const cancelBtn = document.getElementById('cancelBtn');
  const saveBtn = document.getElementById('saveBtn');
  const saveError = document.getElementById('saveError');

  if (soundInput) soundInput.checked = settings.soundEffects;
  if (hapticInput) hapticInput.checked = settings.hapticFeedback;

  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      window.close();
    });
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const newSettings = {
        soundEffects: soundInput ? soundInput.checked : true,
        hapticFeedback: hapticInput ? hapticInput.checked : true,
      };
      if (saveError) saveError.hidden = true;

      try {
        await saveSettings(newSettings);
        window.close();
      } catch (error) {
        if (saveError) {
          saveError.textContent = error instanceof Error ? error.message : String(error);
          saveError.hidden = false;
        }
      }
    });
  }
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
