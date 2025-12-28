/**
 * Background Script for Amazon to BookWyrm Extension
 * Handles message passing and coordinates between popup and content scripts
 */

/**
 * Check if a URL is an Amazon book page
 */
function isAmazonPage(url) {
  if (!url) return false;
  return url.includes('amazon.com') || url.includes('amazon.co.uk');
}

/**
 * Check if a URL is a BookWyrm create-book page
 */
async function isBookWyrmCreatePage(url) {
  if (!url) return false;

  const storage = await browser.storage.local.get('bookwyrmUrl');
  if (!storage.bookwyrmUrl) return false;

  // Check if the URL starts with the BookWyrm instance URL and contains /create-book
  return url.startsWith(storage.bookwyrmUrl) && url.includes('/create-book');
}

/**
 * Inject the BookWyrm filler script into a tab
 */
async function injectBookWyrmFiller(tabId) {
  try {
    await browser.tabs.executeScript(tabId, {
      file: 'content_scripts/bookwyrm_filler.js',
      runAt: 'document_idle'
    });
    console.log('BookWyrm filler script injected');
  } catch (e) {
    console.error('Failed to inject BookWyrm filler:', e);
  }
}

/**
 * Handle messages from popup and content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractBookData') {
    // Get the active tab and trigger extraction
    browser.tabs.query({ active: true, currentWindow: true }).then(tabs => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      const tab = tabs[0];

      if (!isAmazonPage(tab.url)) {
        sendResponse({ success: false, error: 'Not on an Amazon page' });
        return;
      }

      // Send message to the content script to trigger extraction
      browser.tabs.sendMessage(tab.id, { action: 'triggerExtraction' }).then(response => {
        sendResponse(response);
      }).catch(err => {
        console.error('Failed to communicate with content script:', err);
        sendResponse({ success: false, error: 'Failed to extract data. Please refresh the page and try again.' });
      });
    });

    return true; // Indicates async response
  }
});

/**
 * Listen for tab updates to inject the BookWyrm filler script
 */
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Only act when the page has finished loading
  if (changeInfo.status !== 'complete') return;

  // Check if this is a BookWyrm create-book page
  const isCreatePage = await isBookWyrmCreatePage(tab.url);
  if (isCreatePage) {
    // Small delay to ensure the page is fully rendered
    setTimeout(() => injectBookWyrmFiller(tabId), 300);
  }
});

/**
 * On extension install/update, check if settings need to be configured
 */
browser.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Open the popup to configure settings on first install
    console.log('Extension installed. Please configure your BookWyrm instance URL.');
  }
});
