/**
 * Popup script for Amazon to BookWyrm extension
 * Handles settings management and extraction triggering
 */

const bookwyrmUrlInput = document.getElementById('bookwyrm-url');
const openNewTabCheckbox = document.getElementById('open-new-tab');
const extractBtn = document.getElementById('extract-btn');
const statusDiv = document.getElementById('status');

/**
 * Initialize i18n for HTML elements with data-i18n attributes
 */
function initializeI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = browser.i18n.getMessage(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = browser.i18n.getMessage(el.dataset.i18nPlaceholder);
  });
}

/**
 * Display a status message to the user
 */
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
}

/**
 * Clear the status message
 */
function clearStatus() {
  statusDiv.className = 'status';
  statusDiv.textContent = '';
}

/**
 * Validate and normalize a BookWyrm URL
 */
function normalizeUrl(url) {
  url = url.trim();
  if (!url) {
    return null;
  }

  // Add https:// if no protocol specified
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Remove trailing slash
  url = url.replace(/\/+$/, '');

  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (e) {
    return null;
  }
}

/**
 * Load saved settings from storage
 */
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(['bookwyrmUrl', 'openNewTab']);
    if (result.bookwyrmUrl) {
      bookwyrmUrlInput.value = result.bookwyrmUrl;
    }
    if (result.openNewTab !== undefined) {
      openNewTabCheckbox.checked = result.openNewTab;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

/**
 * Save settings to storage
 * Returns true if saved successfully, false otherwise
 */
async function saveSettings() {
  const url = normalizeUrl(bookwyrmUrlInput.value);
  const openNewTab = openNewTabCheckbox.checked;

  if (!url) {
    showStatus(browser.i18n.getMessage('errorInvalidUrl'), 'error');
    return false;
  }

  try {
    await browser.storage.local.set({
      bookwyrmUrl: url,
      openNewTab: openNewTab
    });
    bookwyrmUrlInput.value = url;
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    showStatus(browser.i18n.getMessage('errorSaveFailed'), 'error');
    return false;
  }
}

/**
 * Check if current tab is an Amazon page
 */
async function isExtractableSite() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      return false;
    }
    const url = tabs[0].url;
    return url && (url.includes('amazon.com') || url.includes('amazon.co.uk') || url.includes('amazon.es'));
  } catch (e) {
    console.error('Failed to check current tab:', e);
    return false;
  }
}

/**
 * Trigger book data extraction
 */
async function extractBookData() {
  clearStatus();

  // Save the URL first (in case user entered a new one)
  const saved = await saveSettings();
  if (!saved) {
    return;
  }

  // Check if we're on an Amazon page
  const onExtractableSite = await isExtractableSite();
  if (!onExtractableSite) {
    showStatus(browser.i18n.getMessage('warningNotAmazon'), 'warning');
    return;
  }

  // Send message to background script to trigger extraction
  try {
    const response = await browser.runtime.sendMessage({ action: 'extractBookData' });
    if (response && response.success) {
      showStatus(browser.i18n.getMessage('statusExtracting'), 'success');
      // Close popup after a short delay
      setTimeout(() => window.close(), 500);
    } else if (response && response.error) {
      showStatus(response.error, 'error');
    }
  } catch (e) {
    console.error('Failed to trigger extraction:', e);
    showStatus(browser.i18n.getMessage('errorExtractionFailed'), 'error');
  }
}

// Event listeners
extractBtn.addEventListener('click', extractBookData);

// Initialize i18n and load settings on popup open
document.addEventListener('DOMContentLoaded', () => {
  initializeI18n();
  loadSettings();
});
