# SudoClip

Clipboard manager built with **Tauri v2** + **React 19** + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui**.

Records clipboard text and images with search, keyboard navigation, instant paste, persistent pinned items, and system tray.

## Install

Detects your distro and installs the right package from the latest release:

```bash
curl -fsSL https://raw.githubusercontent.com/JulioC354R/SudoClip/main/install.sh | sh
```

Or clone and run locally:

```bash
git clone https://github.com/JulioC354R/SudoClip && cd SudoClip
./install.sh
```

| Distro | Package | Installed via |
| ------ | ------- | ------------- |
| Debian, Ubuntu, Mint, Pop!_OS | `.deb` | `apt` |
| Fedora, RHEL, openSUSE | `.rpm` | `dnf` |
| Arch, Manjaro, EndeavourOS | binary | `/usr/local/bin` |
| Any other Linux | AppImage | `~/Applications/` |

## Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/JulioC354R/SudoClip/main/uninstall.sh | sh
```

Or run `./uninstall.sh` locally. It detects how the app was installed and removes it cleanly.

## System tray (Linux)

The tray icon appears near the clock/wifi area. Click it to toggle the window.

**GNOME on Wayland** — install the [AppIndicator extension](https://extensions.gnome.org/extension/615/appindicator-support/):

```bash
sudo pacman -S gnome-shell-extension-appindicator
gnome-extensions enable appindicatorsupport@rgcjonas.gmail.com
```

Then relog or restart the shell (Alt+F2, `r`, Enter).

## Build

```bash
npm install
npm run tauri dev       # development mode
./build.sh deb          # build .deb
./build.sh appimage     # build AppImage (applies NO_STRIP workaround)
./build.sh rpm          # build .rpm
./build.sh all          # build all
```

Outputs go to `src-tauri/target/release/bundle/`.

> **AppImage note**: on modern distros (glibc 2.41+), the bundled `strip` in linuxdeploy chokes on `.relr.dyn` sections. `./build.sh appimage` handles this automatically with `NO_STRIP=1`.

## Features

- **Clipboard polling** — captures text and images every 500ms
- **Smart detection** — auto-classifies items as URL, code, text, or image
- **Search/filter** history
- **Keyboard navigation** (↑/↓/Enter/Delete/Esc)
- **Paste selected item** directly (Ctrl+V simulation via `ydotool`)
- **Pinned items** — persist across sessions, 6 sort modes
- **Floating window** — 400×600, no decorations, always-on-top, skip taskbar
- **Auto-hide** on blur
- **System tray** — toggle window from tray (click) or context menu
- **Global shortcut** — configurable, default `Win+C`
- **Settings panel** — configure shortcut, max items, pinned max items; reset to defaults
- **Image persistence** — pinned images saved as raw RGBA in `$APPDATA_DIR/pinned/`

## Usage

```bash
./src-tauri/target/release/sudoclip          # launch
./src-tauri/target/release/sudoclip toggle    # toggle window (Wayland shortcut test)
```

| Key            | Action               |
| -------------- | -------------------- |
| ↑ / ↓          | Navigate list        |
| Enter          | Paste selected item  |
| Delete         | Delete selected item |
| Esc            | Hide window          |
| Win+C (global) | Toggle window        |
| Tray click     | Toggle window        |

## Auto-start

### Linux

```bash
# Desktop autostart (per-user)
mkdir -p ~/.config/autostart
cat > ~/.config/autostart/sudoclip.desktop << EOF
[Desktop Entry]
Type=Application
Name=SudoClip
Exec=/usr/local/bin/sudoclip
Terminal=false
X-GNOME-Autostart-enabled=true
EOF

# Or systemd user service
mkdir -p ~/.config/systemd/user
cat > ~/.config/systemd/user/sudoclip.service << EOF
[Unit]
Description=SudoClip clipboard manager
After=graphical-session.target

[Service]
ExecStart=/usr/local/bin/sudoclip
Restart=on-failure

[Install]
WantedBy=default.target
EOF
systemctl --user enable --now sudoclip.service
```

### Windows

Press `Win+R`, type `shell:startup`, create a shortcut to `sudoclip.exe`.

## Dependencies (Linux)

```bash
sudo pacman -S ydotool          # paste simulation
sudo pacman -S xdotool          # cursor positioning (X11, optional)
```

## Project structure

```
src/
├── App.tsx                    # Main app: state, polling, tabs, handlers
├── components/
│   ├── ClipboardItem.tsx      # History/pinned item row
│   ├── ClipboardPen.tsx       # App icon (clipboard-pen SVG)
│   ├── Footer.tsx             # Bottom bar
│   ├── PinnedList.tsx         # Pinned items tab
│   ├── SettingsPanel.tsx      # Settings overlay
│   └── TitleBar.tsx           # Custom title bar
├── hooks/
│   ├── useKeyboardNav.ts      # Keyboard navigation
│   └── useScrollIntoView.ts   # Auto-scroll selected item
└── lib/
    ├── clipboard.ts           # Clipboard I/O, paste, item factory
    ├── constants.ts           # Named constants
    ├── pinned.ts              # Pinned items store + image I/O
    ├── settings.ts            # Settings store
    ├── types.ts               # TypeScript interfaces
    └── utils.ts               # cn(), clamp(), timeAgo(), etc.
src-tauri/src/
├── lib.rs                     # App setup, plugins, tray
├── main.rs                    # Entry point
├── cursor.rs                  # Cursor position
├── paste.rs                   # Ctrl+V simulation
├── pinned.rs                  # Image file I/O
├── toggle.rs                  # Window toggle
└── tray.rs                    # System tray icon
```

## Tech stack

| Layer       | Tech                                                                |
| ----------- | ------------------------------------------------------------------- |
| Frontend    | React 19, Vite 7, TypeScript, Tailwind CSS v4                       |
| UI          | shadcn/ui (radix-nova), lucide-react                                |
| Backend     | Rust, Tauri v2                                                      |
| Plugins     | clipboard-manager, global-shortcut, single-instance, store, log, opener |
| Tray        | Tauri v2 built-in (`tray-icon` feature)                             |
| Persistence | tauri-plugin-store; image files in `$APPDATA_DIR/pinned/`           |

## Release

1. Update `VERSION` in `install.sh`
2. Build all bundles: `./build.sh all`
3. Create a GitHub release with tag `v<VERSION>`
4. Upload artifacts from `src-tauri/target/release/bundle/`
