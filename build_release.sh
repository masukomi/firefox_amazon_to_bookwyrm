#!/bin/bash

# Build script for Amazon to BookWyrm Firefox Extension
# Creates a zip file suitable for distribution
# The zip contains the extension files directly (manifest.json at root)

set -e

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the output filename (placed in parent directory)
OUTPUT_FILE="$SCRIPT_DIR/../amazon_to_bookwyrm.zip"

# Remove existing zip if present
if [ -f "$OUTPUT_FILE" ]; then
    rm "$OUTPUT_FILE"
    echo "Removed existing $(basename "$OUTPUT_FILE")"
fi

# Change to the firefox directory (the actual extension)
cd "$SCRIPT_DIR/firefox"

# Create the zip file from inside the firefox directory
# This puts manifest.json at the root of the zip
zip -FS -r "$OUTPUT_FILE" . \
    -x "*.DS_Store"

echo ""
echo "Created: $OUTPUT_FILE"
echo ""
echo "Contents:"
unzip -l "$OUTPUT_FILE"
