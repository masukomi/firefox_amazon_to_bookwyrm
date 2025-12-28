# Amazon to BookWyrm - Firefox Extension

<div>
  <img style="max-width: 10em; max-height: 10em;" aria-hidden="true" src="https://raw.githubusercontent.com/masukomi/firefox_amazon_to_bookwyrm/main/graphics/github_readme_icon.png">
</div>

A Firefox browser extension that extracts book data from Amazon.com and Amazon.co.uk, then automatically populates the "Add Book" form on your BookWyrm instance.

## The Problem

[BookWyrm](https://joinbookwyrm.com/) is a wonderful federated book review platform, but adding a new book that doesn't already exist in the database requires manually entering all the book's metadata. This is tedious and time-consuming, especially when all that information already exists on Amazon.

## The Solution

<div >
  <img style="max-height: 30em;" alt="screenshot of the extension in use on amazon" title="screenshot of extension in use on amazon" src="https://raw.githubusercontent.com/masukomi/firefox_amazon_to_bookwyrm/main/screenshots/amazon_screenshot.png">
</div>

This extension lets you:

1. Visit any book page on Amazon.com or Amazon.co.uk
2. Click the extension button
3. Get redirected to your BookWyrm instance with the book form pre-filled

## Installation

Go to [addons.mozilla.org](https://addons.mozilla.org/amazon-to-bookwyrm) and click install. 

You'll want to pin the extension to your toolbar so that its button is available for clicking.

## Usage

1. **Configure your BookWyrm instance**: Click the extension icon and enter your BookWyrm instance URL (e.g., `https://bookwyrm.social`)
2. **Navigate to an Amazon book page**: Go to any book on Amazon.com or Amazon.co.uk
3. **Click "Extract Book Data"**: The extension will extract the book information and redirect you to your BookWyrm instance's "Create Book" page with the form pre-filled
4. **Review and submit**: Check the extracted data, make any corrections, and submit the form

## About Permissions

This extension requires access to "all websites" (`<all_urls>`), which may seem concerning. Here's why this is necessary:

**BookWyrm is federated** - there are hundreds of independent BookWyrm instances running on different domains. We have no way of knowing where your instance is hosted. It could be `bookwyrm.social`, `books.example.com`, or any other domain. To fill in the book form on *your* instance, we need permission to interact with whatever domain that might be.

The extension only activates on:
- Amazon.com and Amazon.co.uk (to extract book data)
- Your configured BookWyrm instance URL (to fill the form)

You can review the source code to verify this behavior.

## Privacy
The plugin stores two pieces of information _in your browser_: 

1. the domain name of your BookWyrm instance
2. information from an Amazon product listing, that it uses to populate a form on your BookWyrm account.

This information isn't transmitted to anyone else. We don't see what books you're looking at or any account information from any site.

## Important: Screen Scraping Limitations

This extension works by screen-scraping data from Amazon's web pages. **If Amazon redesigns their website, the extraction may break.** This is an inherent limitation of any screen-scraping approach.

If you notice that certain fields are no longer being extracted correctly, please:
- File an issue on [GitHub](https://github.com/masukomi/firefox_amazon_to_bookwyrm/issues)
- Reach out to the author on the Fediverse: [@masukomi@connectified.com](https://connectified.com/@masukomi)

## Troubleshooting

**"You need to be logged in" message**: Make sure you're logged into your BookWyrm instance before extracting book data.

**Missing or incorrect data**: Amazon's page structure varies. Some fields may not be available for all books. You can manually fill in any missing information on the BookWyrm form.

**Extension not working**: Try reloading the extension from `about:debugging` and refreshing the Amazon page.

## For Developers
### Installing From Source (Temporary Installation)

1. Clone this repository
2. Open Firefox and navigate to `about:debugging`
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select the `firefox/manifest.json` file

### How Data Extraction Works

The extension uses a JSON configuration file (`firefox/shared/field_extractors.json`) that maps BookWyrm form fields to JavaScript expressions. Each expression extracts data from the current Amazon page.

For example:
```json
{
  "title": "document.getElementById('productTitle').textContent.trim()",
  "pages": "productDetail(/Print length/i).replace(/\\D+/, '')"
}
```

### Fixing Broken Extractors

If Amazon changes their page structure, you only need to update the JavaScript expressions in `field_extractors.json`. No changes to the extension code itself are required.

**Helper functions available in extractors:**

- `productDetails()` - Returns an array of `[key, value]` pairs from Amazon's product details section
- `productDetail(pattern)` - Returns the value for a specific detail matching the regex pattern
- `stringDateToDictionary(dateString)` - Converts date strings like "March 7, 2023" to `{month, day, year}`

### Contributing

Found a bug or want to improve the extractors?

1. Fork the repository
2. Make your changes
3. Test with various Amazon book pages
4. Submit a Pull Request on [GitHub](https://github.com/masukomi/firefox_amazon_to_bookwyrm)

Contributions are welcome!

## License

GPL v3.0. See the LICENSE file for details.

## Links

- **GitHub**: https://github.com/masukomi/firefox_amazon_to_bookwyrm
- **Author**: [@masukomi@connectified.com](https://connectified.com/@masukomi)
- **BookWyrm**: https://joinbookwyrm.com/
