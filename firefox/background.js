/**
 * Background Script for Amazon to BookWyrm Extension
 * Handles message passing and coordinates between popup and content scripts
 */

/**
 * Check if a URL is from a site we can handle
 */
function isExtractableSite(url) {
  if (!url) return false;
  domain = (new URL(url)).hostname.replace(/(\S+?\.)*(\S+?\.\S+)$/, "$2")
  return ["amazon.com", "amazon.co.uk", "amazon.es"].includes(domain)
}

async function getBookwyrmUrl(){
  const storage = await browser.storage.local.get('bookwyrmUrl');
  if (!storage.bookwyrmUrl) return null;
  return storage;
}

/**
 * Check if a URL is a BookWyrm create-book page
 */
async function isBookWyrmCreatePage(stringUrl) {
  if (!stringUrl) return false;

  const storage = await getBookwyrmUrl();
  if (!storage.bookwyrmUrl) return false;

  // Check if the URL starts with the BookWyrm instance URL and contains /create-book
  return stringUrl.startsWith(storage.bookwyrmUrl) && stringUrl.includes('/create-book');
}

/**
 * Check if a URL is a BookWyrm login page
 */
async function isBookWyrmLoginPage(stringUrl) {
  if (!stringUrl) return false;

  const storage = await getBookwyrmUrl();
  if (!storage.bookwyrmUrl) return false;

  // Check if the URL starts with the BookWyrm instance URL and contains /login
  return stringUrl.startsWith(storage.bookwyrmUrl) && stringUrl.includes('/login');
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

async function openCreateBookPage(bookwyrmUrl, currentTab, openNewTab) {
  const createBookUrl = bookwyrmUrl + '/create-book';
  if (openNewTab){
    await browser.tabs.create({ url: createBookUrl });
  } else {
    await browser.tabs.update(currentTab.id, { url: createBookUrl });
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
    // [message] triggerExtraction -> [function] handleExtraction()
    //
    // response is
    // { success: true, extractedData: result.data };
    // or
    // { success: false, error: <error message> };

    // Debug: log extracted data
    // if (response && response.extractedData) {
    //   console.log('extractedData:', response.extractedData);
    // }

    return response;
  } catch (err) {
    console.error('Failed to inject or communicate with content script:', err);
    return { success: false, error: browser.i18n.getMessage('errorExtractorFailed') };
  }
}

/**
 * Handle messages from popup and content scripts
 */
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'extractBookData') {
    // Get the active tab and trigger extraction
    (async () => {
      const tabs = await browser.tabs.query({ active: true, currentWindow: true });
      if (tabs.length === 0) {
        sendResponse({ success: false, error: browser.i18n.getMessage('errorNoActiveTab') });
        return;
      }

      const currentTab = tabs[0];

      if (!isExtractableSite(currentTab.url)) {
        sendResponse({ success: false, error: browser.i18n.getMessage('errorSiteNotSupported', [currentTab.url]) });
        return;
      }

      const settings = await browser.storage.local.get(['bookwyrmUrl', 'openNewTab']);
      if (! settings.bookwyrmUrl){
        sendResponse({ success: false, error: browser.i18n.getMessage('errorNoBookwyrmUrl') });
        return;
      }

      // Inject the script and trigger extraction
      const response = await injectAndExtract(currentTab.id);

      if (response && response.success) {
        await openCreateBookPage(settings.bookwyrmUrl, currentTab, settings.openNewTab)
      } else if (! response) {
        // theoretically can't happen
        sendResponse({ success: false, error: browser.i18n.getMessage('errorUnexpected') });
        return;
      }
      // else error message already in response
      sendResponse(response);
    })();

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
