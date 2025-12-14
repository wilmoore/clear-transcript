import type { ExtensionSettings } from '@/types';
import { DEFAULT_SETTINGS } from '@/types';

/**
 * Options page script
 */

const form = document.getElementById('settings-form') as HTMLFormElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const toast = document.getElementById('toast') as HTMLDivElement;

// Form elements
const backendUrl = document.getElementById('backend-url') as HTMLInputElement;
const preferredLanguage = document.getElementById('preferred-language') as HTMLSelectElement;
const downloadFormat = document.getElementById('download-format') as HTMLSelectElement;
const darkMode = document.getElementById('dark-mode') as HTMLSelectElement;
const autoOpen = document.getElementById('auto-open') as HTMLInputElement;
const keyboardShortcuts = document.getElementById('keyboard-shortcuts') as HTMLInputElement;

/**
 * Load settings from storage
 */
async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get('settings');
    const settings: ExtensionSettings = result.settings || DEFAULT_SETTINGS;

    backendUrl.value = settings.backendUrl || '';
    preferredLanguage.value = settings.preferredLanguage;
    downloadFormat.value = settings.defaultDownloadFormat;
    darkMode.value = settings.darkMode;
    autoOpen.checked = settings.autoOpen;
    keyboardShortcuts.checked = settings.keyboardShortcutsEnabled;
  } catch (error) {
    console.error('Failed to load settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

/**
 * Save settings to storage
 */
async function saveSettings(): Promise<void> {
  const settings: ExtensionSettings = {
    backendUrl: backendUrl.value.trim() || null,
    preferredLanguage: preferredLanguage.value,
    defaultDownloadFormat: downloadFormat.value as 'srt' | 'vtt' | 'txt',
    darkMode: darkMode.value as 'auto' | 'light' | 'dark',
    autoOpen: autoOpen.checked,
    keyboardShortcutsEnabled: keyboardShortcuts.checked,
  };

  try {
    await chrome.storage.sync.set({ settings });
    showToast('Settings saved', 'success');
  } catch (error) {
    console.error('Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

/**
 * Reset settings to defaults
 */
async function resetSettings(): Promise<void> {
  try {
    await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
    await loadSettings();
    showToast('Settings reset to defaults', 'success');
  } catch (error) {
    console.error('Failed to reset settings:', error);
    showToast('Failed to reset settings', 'error');
  }
}

/**
 * Show toast notification
 */
function showToast(message: string, type: 'success' | 'error' = 'success'): void {
  toast.textContent = message;
  toast.className = `toast ${type}`;

  // Force reflow
  toast.offsetHeight;

  toast.classList.add('show');

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Event listeners
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await saveSettings();
});

resetBtn.addEventListener('click', async () => {
  if (confirm('Reset all settings to defaults?')) {
    await resetSettings();
  }
});

// Load settings on page load
loadSettings();
