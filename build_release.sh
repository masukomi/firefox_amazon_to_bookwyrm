#!/bin/bash

# Build script for Amazon to BookWyrm Firefox Extension
# Creates a zip file suitable for distribution
# The zip contains the extension files directly (manifest.json at root)

set -e

VERSION="$1"
if [ "$VERSION" == "" ]; then
    echo "Please supply a version number"
    exit 64
fi
MANIFEST_VERSION=$(grep --color=none '"version": ' firefox/manifest.json | sed -e 's/[[:space:]]*"version": "//' -e 's/",.*//')
NO_V_VERSION=${VERSION#v}

if [ "$NO_V_VERSION" != "$MANIFEST_VERSION" ]; then
    echo "Supplied version: $NO_V_VERSION ($VERSION) & manifest version $MANIFEST_VERSION don't match!"
    exit 65 #EX_DATAERR
fi

FILE_VERSION=$( echo "$VERSION" | sed -e "s/\./_/g" )

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define the output filename (placed in parent directory)
OUTPUT_FILE="$SCRIPT_DIR/amazon_to_bookwyrm_$FILE_VERSION.zip"

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
