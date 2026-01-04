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
If you don't intend to muck with the source code to the extension, or fork it, stop reading now. 😉

The GitHub repo can be found here: <https://github.com/masukomi/firefox_amazon_to_bookwyrm/>

Please fork it, and make changes.


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

### Modifying it to support other sites {#modifying-it-to-support-other-sites}

This requires a little bit of JavaScript knowledge. Specifically, you'll need to know how to craft a line of JS code that can run in the browser and extract information from the DOM.


#### The Magic Sauce {#the-magic-sauce}

The magic sauce of this plugin lives in `field_extractors.json`

It's a dictionary whose keys are field names in BookWyrm's "Create Book" form. Its values are the JavaScript the extension needs to execute to extract the value for that key. Note that not all pages have the relevant data. For example, the `series` field will be `null` for any book that's not part of a series.

I'm extracting _most_ of the information with the help of the `productDetail` helper function which would need to be modified to work on another site (see below). However, you don't need to use that. The value just has to be some JavaScript that can find and extract the data you need from whatever page you have it working on.

For example, to extract the title from an Amazon book page it uses this code:

```javascript
document.getElementById('productTitle').textContent.trim()
```

For each field I spent time in the console on various book's details pages crafting little bits of JS code like that to extract the necessary data.

Note that when using CSS selectors the more specific it is the more likely it will be to break. Start with the CSS selector your browser gives, you and then simplify it as much as you can.

When putting your code into `field_extractors.json` remember to escape all your backslashes and double quotes inside the value's outer quotes. I.e. `\` → `\\` &amp; `"` → `\"`

#### Helper Functions {#helper-functions}

There are two helper functions that facilitate this:

```javascript
stringDateToDictionary(stringDate) // => { month: 12, day: 31, year: 2025 }
productDetail(itemName) // <string data>
```

`stringDateToDictionary` exists because BookWyrm requires dates to be submitted via 3 fields so the extension needs the data separated out for each field. You probably won't need to modify this because it just uses JavaScript's built in date parsing. As long as `Date.parse(…)` can correctly handle the date string you're passing in, you can leave it be.

The `productDetail` function is based on the assumption that there's a central list of product details on the page that we can access for multiple items. It takes a string matcher. Usually I just use a regular expression like `productDetail(/Language/i)` I've been making them case insensitive in case Amazon changes the capitalization on any of them.

Scroll down to the "Product Details" section of any book on Amazon to see an example of this.

Alas, the developer who wrote that didn't know about [the tags for a Description List](https://developer.mozilla.org/en-US/docs/Web/HTML/How_to/Define_terms_with_HTML#how_to_build_a_description_list), so it has to do some funky gyrations to split that list up into a set of keys and values. You'll want to modify this function to support the equivalent list on whatever site you're extracting data from.


#### Site Limitations {#site-limitations}

Limiting the functionality to amazon.com and amazon.co.uk is handled via the `isExtractableSite(url)` function. It's not limited by the extension's manifest, because we need it to be able to work with _any_ BookWyrm instance, and we can't know the URL of every one, especially since new ones can be added at any time.

Replace the domain names in `isExtractableSite` with the domain name of the site you're adding support for.

### Contributing

Found a bug or want to improve the extractors?

1. Fork the repository
2. Make your changes
3. Test with various Amazon book pages
4. Submit a Pull Request on [GitHub](https://github.com/masukomi/firefox_amazon_to_bookwyrm)

Contributions are welcome!

## License

GPL v3.0. See the LICENSE file for details.

#### Getting Help {#getting-help}

Feel free to hit me up with questions on the Fediverse: [@masukomi@connectified.com](https://connectified.com/@masukomi)

Please do so even if you file an Issue or Pull Request on GitHub, because I'm absolutely terrible about seeing email.

