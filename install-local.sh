#!/usr/bin/env bash
set -euo pipefail

BINARY="src-tauri/target/release/sudoclip"
DESKTOP_SRC="$BINARY/../bundle/appimage/sudoclip.AppDir/usr/share/applications/sudoclip.desktop"
ICONS_DIR="src-tauri/icons"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

msg()  { echo -e "${GREEN}[sudo clip]${NC} $1"; }
err()  { echo -e "${RED}[sudo clip]${NC} $1" >&2; }

if [ ! -f "$BINARY" ]; then
  err "Binary not found at $BINARY"
  err "Build first: ./build.sh deb  or  NO_STRIP=1 npm run tauri build"
  exit 1
fi

msg "Installing sudoclip to /usr/local ..."
sudo install -Dm755 "$BINARY" "/usr/local/bin/sudoclip"

sudo mkdir -p /usr/local/share/applications
cat <<'EOF' | sudo tee /usr/local/share/applications/sudoclip.desktop >/dev/null
[Desktop Entry]
Categories=Utility;
Comment=Clipboard manager with search, keyboard navigation, instant paste, and pinned items
Exec=/usr/local/bin/sudoclip
StartupWMClass=sudoclip
Icon=sudoclip
Name=SudoClip
Terminal=false
Type=Application
EOF

if ls "$ICONS_DIR"/*.png &>/dev/null; then
  msg "Installing icons ..."
  for icon in "$ICONS_DIR"/*.png; do
    name=$(basename "$icon")
    size=$(echo "$name" | grep -oP '^\d+' || echo "")
    if [ -n "$size" ]; then
      sudo install -Dm644 "$icon" "/usr/local/share/icons/hicolor/${size}x${size}/apps/sudoclip.png" 2>/dev/null || true
    fi
  done
  sudo install -Dm644 "$ICONS_DIR/icon.png" "/usr/local/share/icons/hicolor/256x256/apps/sudoclip.png" 2>/dev/null || true
  if command -v gtk-update-icon-cache &>/dev/null; then
    sudo gtk-update-icon-cache /usr/local/share/icons/hicolor/ &>/dev/null || true
  fi
fi

msg "Done! Run: sudoclip"
