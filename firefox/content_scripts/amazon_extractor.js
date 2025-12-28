/**
 * Amazon Extractor Content Script
 * Extracts book data from Amazon product pages and sends it to BookWyrm
 */

(function() {
  'use strict';

  // Critical fields that must be present
  const CRITICAL_FIELDS = ['title', 'add_author'];

  /**
   * Get all product details as an array of [key, value] pairs
   * @returns {Array} Array of [key, value] pairs from the product detail bullets
   */
  function productDetails() {
    const detailList = document.querySelector('#detailBullets_feature_div > ul');
    if (!detailList) return [];
    return Array.from(detailList.children).map((x) =>
      x.children[0].textContent.replace(/^\s+|\s+$|\s{2,}/g, "").split(":")
    );
  }

  /**
   * Get a specific product detail by name
   * @param {string|RegExp} itemName - The name (or regex pattern) of the detail to find
   * @returns {string|undefined} The value of the matching detail, or undefined if not found
   */
  function productDetail(itemName) {
    const details = productDetails();
    const found = details.find(item => item[0].match(itemName));
    return found ? found[1] : undefined;
  }

  /**
   * Convert a date string like "March 7, 2023" to a dictionary with month, day, year
   * @param {string} stringDate - The date string to parse
   * @returns {Object} Dictionary with keys: month (number), day (number), year (number)
   */
  function stringDateToDictionary(stringDate) {
    const date = new Date(stringDate)

    return { date.getMonth() + 1, date.getDate(), date.getFullYear() };
  }

  /**
   * Load field extractors from JSON file
   */
  async function loadExtractors() {
    try {
      const url = browser.runtime.getURL('shared/field_extractors.json');
      const response = await fetch(url);
      return await response.json();
    } catch (e) {
      console.error('Failed to load field extractors:', e);
      return null;
    }
  }

  /**
   * Execute an extractor code string and return the result
   * @param {string} code - JavaScript code to execute
   * @returns {*} The result of executing the code, or null if error/empty
   */
  function executeExtractor(code) {
    if (!code || code.trim() === '') {
      return null;
    }

    try {
      // Create a function from the code string and execute it
      // Pass helper functions as parameters so they're available in the extractor code
      const fn = new Function('productDetails', 'productDetail', 'stringDateToDictionary', 'return ' + code);
      const result = fn(productDetails, productDetail, stringDateToDictionary);
      return result !== undefined && result !== null && result !== '' ? result : null;
    } catch (e) {
      console.warn('Extractor failed:', e);
      return null;
    }
  }

  /**
   * Extract all book data using the field extractors
   */
  async function extractBookData() {
    const extractors = await loadExtractors();
    if (!extractors) {
      return { success: false, error: 'Failed to load field extractors' };
    }

    const extractedData = {};
    const missingCritical = [];

    // Execute each extractor and collect results
    for (const [field, code] of Object.entries(extractors)) {
      const value = executeExtractor(code);
      extractedData[field] = value;

      // Check if critical field is missing
      if (CRITICAL_FIELDS.includes(field)) {
        if (value === null || (Array.isArray(value) && value.length === 0)) {
          missingCritical.push(field);
        }
      }
    }

    return {
      success: true,
      data: extractedData,
      missingCritical: missingCritical
    };
  }

  /**
   * Main function to handle extraction request
   */
  async function handleExtraction() {
    // Extract book data
    const result = await extractBookData();

    if (!result.success) {
      return result;
    }

    // Warn about missing critical fields
    if (result.missingCritical.length > 0) {
      const missing = result.missingCritical.join(', ');
      const proceed = confirm(
        `Warning: The following critical fields could not be extracted: ${missing}\n\n` +
        'Do you want to continue anyway?'
      );
      if (!proceed) {
        return { success: false, error: 'Extraction cancelled by user' };
      }
    }

    // Get BookWyrm URL from storage
    const settings = await browser.storage.local.get('bookwyrmUrl');
    if (!settings.bookwyrmUrl) {
      return { success: false, error: 'BookWyrm URL not configured' };
    }

    // Store extracted data for the BookWyrm filler script
    await browser.storage.local.set({
      extractedBookData: result.data,
      extractionTimestamp: Date.now()
    });

    // Open BookWyrm create-book page
    const createBookUrl = settings.bookwyrmUrl + '/create-book';
    window.open(createBookUrl, '_blank');

    return { success: true };
  }

  // Listen for extraction messages from the background script
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'triggerExtraction') {
      handleExtraction().then(result => {
        sendResponse(result);
      });
      return true; // Indicates async response
    }
  });
})();
