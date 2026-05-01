#!/usr/bin/env bash
set -euo pipefail

# Build script that handles the linuxdeploy NO_STRIP workaround for AppImage

BUNDLE="${1:-deb}"  # deb, rpm, appimage, or "all"

build_rust() {
  npm run tauri build -- --bundles "$1" 2>&1
}

case "$BUNDLE" in
  appimage)
    echo "==> Building AppImage (with NO_STRIP workaround)..."

    # Step 1: build deb first (creates the AppDir structure via tauri's bundler)
    npm run tauri build -- --bundles deb 2>&1

    APPDIR="src-tauri/target/release/bundle/appimage/sudoclip.AppDir"

    if [ ! -d "$APPDIR" ]; then
      # tauri only creates AppDir when appimage target is requested
      npm run tauri build -- --bundles appimage 2>&1 || true
    fi

    if [ ! -d "$APPDIR" ]; then
      echo "AppDir not found at $APPDIR"
      exit 1
    fi

    LINUXDEPLOY="$HOME/.cache/tauri/linuxdeploy-x86_64.AppImage"
    if [ ! -f "$LINUXDEPLOY" ]; then
      echo "linuxdeploy not found at $LINUXDEPLOY"
      exit 1
    fi

    DESKTOP_FILE="$APPDIR/sudoclip.desktop"
    if [ ! -f "$DESKTOP_FILE" ]; then
      DESKTOP_FILE="$APPDIR/usr/share/applications/sudoclip.desktop"
    fi

    echo "==> Running linuxdeploy..."
    APPIMAGE_EXTRACT_AND_RUN=1 NO_STRIP=1 "$LINUXDEPLOY" \
      --appdir "$APPDIR" \
      --output appimage \
      --desktop-file "$DESKTOP_FILE"

    # rename to match versioned pattern
    mv -f sudoclip-x86_64.AppImage "src-tauri/target/release/bundle/appimage/sudoclip_$(node -p "require('./package.json').version")_amd64.AppImage" 2>/dev/null || true

    echo "==> AppImage ready!"
    ls -lh src-tauri/target/release/bundle/appimage/sudoclip_*.AppImage
    ;;

  all)
    build_rust deb
    build_rust rpm
    # appimage needs special handling
    "$0" appimage
    ;;

  *)
    build_rust "$BUNDLE"
    ;;
esac

# ── Copy artifacts to release/ ──
copy_artifacts() {
  local ver
  ver=$(node -p "require('./package.json').version")

  mkdir -p release

  if [ -f "src-tauri/target/release/sudoclip" ]; then
    cp "src-tauri/target/release/sudoclip" "release/sudoclip_${ver}_binary"
    echo "  copied binary → release/sudoclip_${ver}_binary"
  fi

  if ls src-tauri/target/release/bundle/appimage/sudoclip_*.AppImage &>/dev/null; then
    cp src-tauri/target/release/bundle/appimage/sudoclip_*.AppImage "release/sudoclip-x86_64.AppImage"
    echo "  copied AppImage → release/sudoclip-x86_64.AppImage"
  fi

  if [ -f "src-tauri/target/release/bundle/deb/sudoclip_${ver}_amd64.deb" ]; then
    cp "src-tauri/target/release/bundle/deb/sudoclip_${ver}_amd64.deb" "release/"
    echo "  copied .deb → release/sudoclip_${ver}_amd64.deb"
  fi

  if [ -f "src-tauri/target/release/bundle/rpm/sudoclip-${ver}-1.x86_64.rpm" ]; then
    cp "src-tauri/target/release/bundle/rpm/sudoclip-${ver}-1.x86_64.rpm" "release/"
    echo "  copied .rpm → release/sudoclip-${ver}-1.x86_64.rpm"
  fi
}

copy_artifacts
