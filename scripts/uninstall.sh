#!/bin/bash
# spotifaux uninstall script

set -e

SPICETIFY_EXT_DIR="$HOME/.config/spicetify/Extensions"

echo "[spotifaux] Uninstalling extension..."

# Check if spicetify is installed
if ! command -v spicetify &> /dev/null; then
    echo "[spotifaux] Error: spicetify not found in PATH"
    exit 1
fi

# Disable extension
spicetify config extensions spotifaux.js- 2>/dev/null || true
echo "[spotifaux] Disabled extension in spicetify config"

# Remove extension file
rm -f "$SPICETIFY_EXT_DIR/spotifaux.js"
echo "[spotifaux] Removed spotifaux.js from $SPICETIFY_EXT_DIR"

# Apply changes
echo "[spotifaux] Applying spicetify changes..."
spicetify apply

echo "[spotifaux] Uninstallation complete!"
