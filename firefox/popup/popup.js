/**
 * Popup script for Amazon to BookWyrm extension
 * Handles settings management and extraction triggering
 */

const bookwyrmUrlInput = document.getElementById('bookwyrm-url');
const saveBtn = document.getElementById('save-btn');
const extractBtn = document.getElementById('extract-btn');
const statusDiv = document.getElementById('status');

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
    const result = await browser.storage.local.get('bookwyrmUrl');
    if (result.bookwyrmUrl) {
      bookwyrmUrlInput.value = result.bookwyrmUrl;
    }
  } catch (e) {
    console.error('Failed to load settings:', e);
  }
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  clearStatus();

  const url = normalizeUrl(bookwyrmUrlInput.value);

  if (!url) {
    showStatus('Please enter a valid URL', 'error');
    return false;
  }

  try {
    await browser.storage.local.set({ bookwyrmUrl: url });
    bookwyrmUrlInput.value = url;
    showStatus('Settings saved!', 'success');
    return true;
  } catch (e) {
    console.error('Failed to save settings:', e);
    showStatus('Failed to save settings', 'error');
    return false;
  }
}

/**
 * Check if current tab is an Amazon page
 */
async function isAmazonPage() {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) {
      return false;
    }
    const url = tabs[0].url;
    return url && (url.includes('amazon.com') || url.includes('amazon.co.uk'));
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

  // Check if BookWyrm URL is configured
  const result = await browser.storage.local.get('bookwyrmUrl');
  if (!result.bookwyrmUrl) {
    showStatus('Please configure your BookWyrm instance URL first', 'warning');
    return;
  }

  // Check if we're on an Amazon page
  const onAmazon = await isAmazonPage();
  if (!onAmazon) {
    showStatus('Please navigate to an Amazon book page first', 'warning');
    return;
  }

  // Send message to background script to trigger extraction
  try {
    const response = await browser.runtime.sendMessage({ action: 'extractBookData' });
    if (response && response.success) {
      showStatus('Extracting book data...', 'success');
      // Close popup after a short delay
      setTimeout(() => window.close(), 500);
    } else if (response && response.error) {
      showStatus(response.error, 'error');
    }
  } catch (e) {
    console.error('Failed to trigger extraction:', e);
    showStatus('Failed to start extraction', 'error');
  }
}

// Event listeners
saveBtn.addEventListener('click', saveSettings);
extractBtn.addEventListener('click', extractBookData);

// Load settings on popup open
document.addEventListener('DOMContentLoaded', loadSettings);
