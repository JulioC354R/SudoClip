#!/usr/bin/env bash
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

msg()   { echo -e "${GREEN}[sudo clip]${NC} $1"; }
warn()  { echo -e "${YELLOW}[sudo clip]${NC} $1"; }
err()   { echo -e "${RED}[sudo clip]${NC} $1" >&2; }

detect_install_method() {
  if command -v dpkg &>/dev/null && dpkg -l sudoclip &>/dev/null 2>&1; then
    echo "deb"
  elif command -v rpm &>/dev/null && rpm -q sudoclip &>/dev/null 2>&1; then
    echo "rpm"
  elif [ -f /usr/local/bin/sudoclip ] && [ -f /usr/local/share/applications/sudoclip.desktop ]; then
    echo "manual"
  elif [ -f "$HOME/Applications/sudoclip-x86_64.AppImage" ]; then
    echo "appimage"
  else
    echo "unknown"
  fi
}

uninstall_deb() {
  msg "Removing sudoclip package via apt ..."
  sudo apt remove -y sudoclip
  sudo apt autoremove -y 2>/dev/null || true
}

uninstall_rpm() {
  msg "Removing sudoclip package via dnf ..."
  sudo dnf remove -y sudoclip
}

uninstall_manual() {
  msg "Removing sudoclip from /usr/local ..."
  sudo rm -f /usr/local/bin/sudoclip
  sudo rm -f /usr/local/share/applications/sudoclip.desktop

  for size in 32x32 64x64 128x128 256x256; do
    sudo rm -f "/usr/local/share/icons/hicolor/$size/apps/sudoclip.png"
  done

  if command -v gtk-update-icon-cache &>/dev/null; then
    sudo gtk-update-icon-cache /usr/local/share/icons/hicolor/ &>/dev/null || true
  fi
}

uninstall_appimage() {
  local path="$HOME/Applications/sudoclip-x86_64.AppImage"
  if [ -f "$path" ]; then
    msg "Removing AppImage ..."
    rm -f "$path"
  fi
  warn "Also remove any symlink you created manually:"
  warn "  sudo rm /usr/local/bin/sudoclip"
}

method=$(detect_install_method)

if [ "$method" = "unknown" ]; then
  err "sudoclip not found on this system."
  exit 1
fi

case "$method" in
  deb)      uninstall_deb ;;
  rpm)      uninstall_rpm ;;
  manual)   uninstall_manual ;;
  appimage) uninstall_appimage ;;
esac

# ── Kill running process ──
if pkill sudoclip 2>/dev/null; then
  msg "Stopped running sudoclip process"
  sleep 0.5
fi

# ── Clean up persisted data ──
DATA_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/JulioC354R"
if [ -d "$DATA_DIR" ]; then
  msg "Removing app data (settings, pinned items, logs) ..."
  rm -rf "$DATA_DIR"
  msg "  removed $DATA_DIR"
fi

# ── Clean up GNOME gsettings shortcut ──
if command -v gsettings &>/dev/null; then
  GNOME_PATH="/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/sudoclip/"
  SCHEMA="org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:${GNOME_PATH}"
  if gsettings get "$SCHEMA" name &>/dev/null; then
    msg "Removing GNOME custom shortcut ..."

    gsettings reset "$SCHEMA" name   2>/dev/null || true
    gsettings reset "$SCHEMA" command 2>/dev/null || true
    gsettings reset "$SCHEMA" binding 2>/dev/null || true

    raw=$(gsettings get org.gnome.settings-daemon.plugins.media-keys custom-keybindings 2>/dev/null || true)
    if [ -n "$raw" ]; then
      cleaned=$(printf '%s' "$raw" \
        | sed "s|'${GNOME_PATH}'||g" \
        | sed "s|', ,|',|g; s|, ',|,|g; s|^\[, |[|; s|, ]$|]|; s|^\[$|[]|")
      case "$cleaned" in
        "[]"|"@as []"|"@as [] ") cleaned="@as []" ;;
      esac
      gsettings set org.gnome.settings-daemon.plugins.media-keys custom-keybindings "$cleaned" 2>/dev/null || true
    fi

    msg "  removed from GNOME keyboard shortcuts"
  fi
fi

msg "Uninstalled!"
