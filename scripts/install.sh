#!/bin/bash
# spotifaux install script

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
SPICETIFY_EXT_DIR="$HOME/.config/spicetify/Extensions"

echo "[spotifaux] Installing extension..."

# Check if spicetify is installed
if ! command -v spicetify &> /dev/null; then
    echo "[spotifaux] Error: spicetify not found in PATH"
    exit 1
fi

# Create Extensions directory if it doesn't exist
mkdir -p "$SPICETIFY_EXT_DIR"

# Copy extension
cp "$PROJECT_DIR/src/spotifaux.js" "$SPICETIFY_EXT_DIR/"
echo "[spotifaux] Copied spotifaux.js to $SPICETIFY_EXT_DIR"

# Enable extension
spicetify config extensions spotifaux.js
echo "[spotifaux] Enabled extension in spicetify config"

# Apply changes
echo "[spotifaux] Applying spicetify changes..."
spicetify apply

echo "[spotifaux] Installation complete!"
echo "[spotifaux] Restart Spotify and open DevTools (enable via spicetify) to see logs"
