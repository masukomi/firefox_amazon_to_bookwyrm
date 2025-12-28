/**
 * BookWyrm Filler Content Script
 * Populates the create-book form with extracted data from Amazon
 */

(function() {
  'use strict';

  // Maximum age of extracted data in milliseconds (5 minutes)
  const MAX_DATA_AGE = 5 * 60 * 1000;

  /**
   * Set the value of a form field and trigger change events
   */
  function setFieldValue(element, value) {
    if (!element || value === null || value === undefined) {
      return;
    }

    element.value = value;

    // Trigger input and change events for any listeners
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Click a button and wait for the DOM to update
   */
  async function clickButton(button) {
    if (!button) return;

    button.click();

    // Wait a bit for the DOM to update
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Fill multiple values by clicking "Add Another" button
   * @param {string[]} values - Array of values to fill
   * @param {string} inputIdBase - Base ID for the input fields (e.g., 'id_add_author')
   * @param {string} addButtonId - ID of the "Add Another" button
   */
  async function fillMultipleFields(values, inputIdBase, addButtonId) {
    if (!values || !Array.isArray(values) || values.length === 0) {
      return;
    }

    const addButton = document.getElementById(addButtonId);

    for (let i = 0; i < values.length; i++) {
      // For the first value, use the existing field
      // For subsequent values, click "Add Another" first
      if (i > 0 && addButton) {
        await clickButton(addButton);
      }

      // Find the appropriate input field
      // First field: id_add_author
      // Subsequent fields: id_add_author-2, id_add_author-3, etc.
      let inputId = inputIdBase;
      if (i > 0) {
        inputId = `${inputIdBase}-${i + 1}`;
      }

      const input = document.getElementById(inputId);
      if (input) {
        setFieldValue(input, values[i]);
      }
    }
  }

  /**
   * Fill a select/dropdown field
   */
  function fillSelectField(elementId, value) {
    if (value === null || value === undefined) {
      return;
    }
    const select = document.getElementById(elementId);
    if (!select) return;

    // Convert value to string for comparison with option values
    const stringValue = String(value);

    // Find the option with matching value
    for (const option of select.options) {
      if (option.value === stringValue) {
        select.value = stringValue;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
    }
  }

  /**
   * Main function to fill the BookWyrm form
   */
  async function fillForm() {
    // Get extracted data from storage
    const storage = await browser.storage.local.get([
      'extractedBookData',
      'extractionTimestamp'
    ]);

    if (!storage.extractedBookData) {
      console.log('No extracted book data found');
      return;
    }

    // Check if data is too old
    if (storage.extractionTimestamp) {
      const age = Date.now() - storage.extractionTimestamp;
      if (age > MAX_DATA_AGE) {
        console.log('Extracted data is too old, ignoring');
        await browser.storage.local.remove(['extractedBookData', 'extractionTimestamp']);
        return;
      }
    }

    const data = storage.extractedBookData;
    console.log('Filling form with extracted data:', data);

    // Simple text fields
    const textFields = [
      ['id_title', 'title'],
      ['id_subtitle', 'subtitle'],
      ['id_series', 'series'],
      ['id_series_number', 'series_number'],
      ['id_languages', 'languages'],
      ['id_publishers', 'publishers'],
      ['id_physical_format_detail', 'physical_format_detail'],
      ['id_pages', 'pages'],
      ['id_isbn_13', 'isbn_13'],
      ['id_isbn_10', 'isbn_10'],
      ['id_asin', 'asin']
    ];

    for (const [elementId, dataKey] of textFields) {
      const element = document.getElementById(elementId);
      if (element && data[dataKey]) {
        setFieldValue(element, data[dataKey]);
      }
    }

    // Description (textarea)
    const descriptionEl = document.getElementById('id_description');
    if (descriptionEl && data.description) {
      setFieldValue(descriptionEl, data.description);
    }

    // Cover URL
    const coverUrlEl = document.getElementById('id_cover_url');
    if (coverUrlEl && data.cover_url) {
      setFieldValue(coverUrlEl, data.cover_url);
    }

    // Physical format (select)
    fillSelectField('id_physical_format', data.physical_format);

    // Date fields - month and day are <select> elements
    const dateSelectFields = [
      ['id_published_date_month', 'published_date_month'],
      ['id_published_date_day', 'published_date_day'],
      ['id_first_published_date_month', 'first_published_date_month'],
      ['id_first_published_date_day', 'first_published_date_day']
    ];

    for (const [elementId, dataKey] of dateSelectFields) {
      if (data[dataKey]) {
        fillSelectField(elementId, data[dataKey]);
      }
    }

    // Date fields - year is <input type="number">
    const dateYearFields = [
      ['id_published_date_year', 'published_date_year'],
      ['id_first_published_date_year', 'first_published_date_year']
    ];

    for (const [elementId, dataKey] of dateYearFields) {
      const element = document.getElementById(elementId);
      if (element && data[dataKey]) {
        setFieldValue(element, data[dataKey]);
      }
    }

    // Authors (multiple)
    if (data.add_author) {
      const authors = Array.isArray(data.add_author) ? data.add_author : [data.add_author];
      await fillMultipleFields(authors, 'id_add_author', 'another_author_field');
    }

    // Subjects (multiple)
    if (data.subjects) {
      const subjects = Array.isArray(data.subjects) ? data.subjects : [data.subjects];
      await fillMultipleFields(subjects, 'id_add_subject', 'another_subject_field');
    }

    // Clear stored data after filling
    await browser.storage.local.remove(['extractedBookData', 'extractionTimestamp']);
    console.log('Form filled successfully');
  }

  // Check if we're on a create-book page
  function isCreateBookPage() {
    return window.location.pathname.includes('/create-book');
  }

  // Run when page loads
  if (isCreateBookPage()) {
    // Wait for the form to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(fillForm, 500);
      });
    } else {
      setTimeout(fillForm, 500);
    }
  }
})();
