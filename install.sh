#!/usr/bin/env bash
set -euo pipefail

VERSION="1.0.0"           # <-- change only this line when releasing
TAG="v$VERSION"
REPO="https://github.com/JulioC354R/SudoClip"
BASE_URL="$REPO/releases/download/$TAG"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

msg()   { echo -e "${GREEN}[sudo clip]${NC} $1"; }
warn()  { echo -e "${YELLOW}[sudo clip]${NC} $1"; }
err()   { echo -e "${RED}[sudo clip]${NC} $1" >&2; }

detect_distro() {
  if [ ! -f /etc/os-release ]; then
    echo "unknown"
    return
  fi
  . /etc/os-release
  case "$ID" in
    debian|ubuntu|linuxmint|pop|elementary|zorin|kali) echo "debian" ;;
    fedora|rhel|centos|rocky|almalinux)                echo "fedora" ;;
    arch|manjaro|endeavouros|arcolinux|cachyos)        echo "arch" ;;
    opensuse*|suse)                                    echo "opensuse" ;;
    *)
      case "${ID_LIKE:-}" in
        *debian*) echo "debian" ;;
        *fedora*) echo "fedora" ;;
        *arch*)   echo "arch" ;;
        *)        echo "unknown" ;;
      esac
      ;;
  esac
}

install_debian() {
  local pkg="sudoclip_${VERSION}_amd64.deb"
  msg "Downloading $pkg ..."
  curl -fsSL "$BASE_URL/$pkg" -o "/tmp/$pkg"
  msg "Installing via apt ..."
  sudo apt install -y "/tmp/$pkg"
}

install_fedora() {
  local pkg="sudoclip-${VERSION}-1.x86_64.rpm"
  msg "Downloading $pkg ..."
  curl -fsSL "$BASE_URL/$pkg" -o "/tmp/$pkg"
  msg "Installing via dnf ..."
  sudo dnf install -y "/tmp/$pkg"
}

install_arch() {
  local bin="sudoclip_${VERSION}_binary"
  msg "Downloading binary ..."
  curl -fsSL "$BASE_URL/$bin" -o "/tmp/sudoclip"
  chmod +x "/tmp/sudoclip"

  msg "Installing to /usr/local ..."
  sudo install -Dm755 "/tmp/sudoclip" "/usr/local/bin/sudoclip"

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

  # download icons from the release (if available), otherwise skip
  local icon_url="$BASE_URL/sudoclip_${VERSION}_amd64.deb"
  local tmp_deb="/tmp/sudoclip-icons.deb"
  if curl -sfL "$icon_url" -o "$tmp_deb" 2>/dev/null; then
    mkdir -p /tmp/sudoclip-icon-extract
    bsdtar xf "$tmp_deb" -C /tmp/sudoclip-icon-extract 2>/dev/null || dpkg-deb -x "$tmp_deb" /tmp/sudoclip-icon-extract 2>/dev/null || true
    local icondir="/tmp/sudoclip-icon-extract/usr/share/icons"
    if [ -d "$icondir" ]; then
      sudo cp -r "$icondir/"* "/usr/local/share/icons/" 2>/dev/null || true
    fi
    rm -rf /tmp/sudoclip-icon-extract "$tmp_deb"
  fi

  if command -v gtk-update-icon-cache &>/dev/null; then
    sudo gtk-update-icon-cache /usr/local/share/icons/hicolor/ &>/dev/null || true
  fi
}

install_appimage() {
  local appimg="sudoclip-x86_64.AppImage"
  msg "Downloading AppImage ..."
  curl -fsSL "$BASE_URL/$appimg" -o "/tmp/$appimg"
  chmod +x "/tmp/$appimg"
  mkdir -p "$HOME/Applications"
  mv "/tmp/$appimg" "$HOME/Applications/$appimg"
  msg "AppImage saved to $HOME/Applications/$appimg"
  msg "Create a symlink: sudo ln -s $HOME/Applications/$appimg /usr/local/bin/sudoclip"
}

distro=$(detect_distro)
msg "Detected: $distro"

case "$distro" in
  debian)   install_debian ;;
  fedora|opensuse) install_fedora ;;
  arch)     install_arch ;;
  *)
    warn "Unknown distro. Falling back to AppImage."
    install_appimage
    ;;
esac

msg "Done!"
