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

msg "Uninstalled!"
