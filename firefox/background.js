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
 * Check if a URL is a BookWyrm login page
 */
async function isBookWyrmLoginPage(url) {
  if (!url) return false;

  const storage = await browser.storage.local.get('bookwyrmUrl');
  if (!storage.bookwyrmUrl) return false;

  // Check if the URL starts with the BookWyrm instance URL and contains /login
  return url.startsWith(storage.bookwyrmUrl) && url.includes('/login');
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
    //console.log('BookWyrm filler script injected');
  } catch (e) {
    console.error('Failed to inject BookWyrm filler:', e);
  }
}

/**
 * Inject the Amazon extractor script and trigger extraction
 */
async function injectAndExtract(tabId) {
  try {
    // Inject the content script programmatically to ensure it's loaded
    await browser.tabs.executeScript(tabId, {
      file: 'content_scripts/amazon_extractor.js',
      runAt: 'document_idle'
    });

    // Small delay to ensure the script is fully initialized
    await new Promise(resolve => setTimeout(resolve, 100));

    // Now send the message to trigger extraction
    const response = await browser.tabs.sendMessage(tabId, { action: 'triggerExtraction' });

    // Debug: log extracted data
    // if (response && response.extractedData) {
    //   console.log('extractedData:', response.extractedData);
    // }

    return response;
  } catch (err) {
    console.error('Failed to inject or communicate with content script:', err);
    return { success: false, error: 'Failed to extract data. Please try again.' };
  }
}

/**
 * Handle messages from popup and content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractBookData') {
    // Get the active tab and trigger extraction
    browser.tabs.query({ active: true, currentWindow: true }).then(async tabs => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: 'No active tab found' });
        return;
      }

      const tab = tabs[0];

      if (!isAmazonPage(tab.url)) {
        sendResponse({ success: false, error: 'Not on an Amazon page' });
        return;
      }

      // Inject the script and trigger extraction
      const response = await injectAndExtract(tab.id);
      sendResponse(response);
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

  // Check if this is a BookWyrm create-book page or login page
  const isCreatePage = await isBookWyrmCreatePage(tab.url);
  const isLoginPage = await isBookWyrmLoginPage(tab.url);

  if (isCreatePage || isLoginPage) {
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
