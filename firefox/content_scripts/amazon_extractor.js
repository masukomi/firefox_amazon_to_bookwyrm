/*
 * Amazon Extractor Content Script
 * Extracts book data from Amazon product pages and sends it to BookWyrm
 */

(function () {
  'use strict';

  // Critical fields that must be present
  const CRITICAL_FIELDS = ['title', 'add_author'];

  /*
   * Get all product details as an array of [key, value] pairs
   * @returns {Array} Array of [key, value] pairs from the product detail bullets
   */
  function productDetails() {
    const detailList = document.querySelector('#detailBullets_feature_div > ul');
    if (!detailList) return [];
    //save for later: .map((x) => x.replace(/^\W+/, ''));
    return Array.from(detailList.children).map((x) => x.children[0].textContent.replace(/^\s+|\s+$|\s{2,}/g, "").split(":").map((x) => x.replace(/^\W+/, '')));

  }

  /*
   * Get a specific product detail by name
   * @param {string|RegExp} itemName - The name (or regex pattern) of the detail to find
   * @returns {string|undefined} The value of the matching detail, or undefined if not found
   */
  function productDetail(itemName) {
    const details = productDetails();
    const found = details.find(item => item[0].match(itemName));
    return found ? found[1] : undefined;
  }

  /* ⚠️ Date parsing is a hack. This is an ugly, terrible, no-good
     brittle hack because - despite JavaScript being around since ~1996 -
     no-one seems to feel that `new Date("<date string>")` needs
     to support any language other than English.

     We may want to use
     https://github.com/wanasit/chrono
     in the future, but it doesn't support a ton of languages
     and it's Spanish support is incomplete.
     So, I'm going with the crappy hack for now.
  */
  // Month name mappings for supported languages
  // 🤦‍♀️ so stupid
  const monthMappings = {
    // Spanish
    'enero': 'January',
    'febrero': 'February',
    'marzo': 'March',
    'abril': 'April',
    'mayo': 'May',
    'junio': 'June',
    'julio': 'July',
    'agosto': 'August',
    'septiembre': 'September',
    'setiembre': 'September',
    'octubre': 'October',
    'noviembre': 'November',
    'diciembre': 'December'
  };

  /*
   * Convert a date strings like
   * - "March 7, 2023" (English)
   * - "2 enero 2026"  (Spanish)
   * to a dictionary with month, day, year
   * @param {string} stringDate - The date string to parse
   * @returns {Object} Dictionary with keys: month (number), day (number), year (number)
   */
  function stringDateToDictionary(stringDate) {
    if (!stringDate) {
      return { month: null, day: null, year: null };
    }

    // Trim whitespace and leading non-word characters
    let normalized = stringDate.trim().replace(/^\W+/, '');

    // Replace localized month names with English equivalents (case-insensitive)
    // 7 de marzo de 2023 → 7 March 2023
    // 2 marzo 2023 → 2 March 2023
    for (const [localized, english] of Object.entries(monthMappings)) {
      const regex = new RegExp(`\\b${localized}\\b`, 'gi');
      // while not standard English Date(…) does seem to handle it without problem
      normalized = normalized.replace(regex, english).replace(/\sde\s/i, '');
    }

    const date = new Date(normalized);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return { month: null, day: null, year: null };
    }

    return { month: date.getMonth() + 1, day: date.getDate(), year: date.getFullYear() };
  }

  /*
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

  /*
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

  /*
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

  /*
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

    // Store extracted data for the BookWyrm filler script
    await browser.storage.local.set({
      extractedBookData: result.data,
      extractionTimestamp: Date.now()
    });

    // Return success and let background script handle the navigation
    return { success: true, extractedData: result.data };
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
