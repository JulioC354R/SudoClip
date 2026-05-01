# SudoClip

Clipboard manager built with **Tauri v2** + **React 19** + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui** (radix-nova).

Records clipboard text and images in-memory with search, keyboard navigation, instant paste, and persistent pinned items.

## Features

- **Clipboard polling** — captures text and images every 500ms
- **Smart detection** — auto-classifies items as URL, code, text, or image
- **Search/filter** history
- **Keyboard navigation** (↑/↓/Enter/Delete/Esc)
- **Paste selected item** directly (simulates Ctrl+V via `ydotool` on Linux)
- **Global shortcut** — configurable, default `Win+C`
- **Configurable max items** (1–500, default 50)
- **Pinned items** — persist pinned items across sessions (text and images, max 200)
- **Sort pinned items** — 6 modes: addition asc/desc, alphabetical asc/desc, images first, text first
- **Smart window positioning** — opens at cursor position, never off-screen
- **Floating window** — 400×500, no decorations, always-on-top, skip taskbar
- **Auto-hide** on blur
- **Settings panel** — configure shortcut, max items, pinned max items; reset to defaults
- **Image persistence** — pinned images saved as raw RGBA data in `$APPDATA_DIR/pinned/`

## Quick start

```bash
npm install
npm run tauri dev      # dev mode (Vite + Tauri)
npm run tauri build     # production build
```

## Dependencies (Linux)

```bash
# ydotool (paste simulation)
sudo pacman -S ydotool

# xdotool (cursor positioning on X11, optional — fallback to center-screen)
sudo pacman -S xdotool
```

## Usage

```bash
./src-tauri/target/release/sudoclip          # launch app
./src-tauri/target/release/sudoclip toggle    # toggle window from CLI
```

## Tech stack

| Layer       | Tech                                                                                  |
| ----------- | ------------------------------------------------------------------------------------- |
| Frontend    | React 19, Vite 7, TypeScript, Tailwind CSS v4                                         |
| UI          | shadcn/ui (radix-nova), lucide-react                                                  |
| Backend     | Rust, Tauri v2                                                                        |
| Plugins     | clipboard-manager, global-shortcut, single-instance, store, log, opener               |
| Windows     | 400×500, decorations: false, skipTaskbar: true, alwaysOnTop: true                     |
| Persistence | tauri-plugin-store for settings + pinned items; image files in `$APPDATA_DIR/pinned/` |

## Scripts

```bash
npm run build        # tsc && vite build
npm run dev          # frontend-only vite dev
npm run tauri build  # full Tauri production build
```

## Project structure

```
src/
├── App.tsx                    # Main app: state, polling, tabs, handlers
├── hooks/
│   ├── useKeyboardNav.ts      # Generic keyboard navigation hook
│   └── useScrollIntoView.ts   # Scroll selected item into view
├── components/
│   ├── ClipboardItem.tsx      # History/pinned item row with pin button
│   ├── Footer.tsx             # Bottom bar (item count, clear button)
│   ├── TitleBar.tsx           # Custom window title bar (close + settings)
│   ├── SettingsPanel.tsx      # Settings overlay (shortcut, limits, reset)
│   └── PinnedList.tsx         # Pinned items tab with sort controls
├── lib/
│   ├── clipboard.ts           # Clipboard read/write, paste pipeline, item factory
│   ├── constants.ts           # Named constants (poll interval, limits, etc.)
│   ├── pinned.ts              # Pinned items store + image file I/O
│   ├── settings.ts            # Settings store (tauri-plugin-store)
│   ├── types.ts               # ClipboardItem, PinnedItem interfaces
│   └── utils.ts               # cn(), clamp(), timeAgo(), generateId(), rgbaToDataUrl()
src-tauri/src/
├── lib.rs                     # Tauri app setup, plugin registration
├── main.rs                    # Entry point
├── cursor.rs                  # Get cursor position (xdotool/enigo)
├── toggle.rs                  # Window toggle via CLI or single-instance
├── paste.rs                   # Simulate Ctrl+V paste
└── pinned.rs                  # Save/read/delete pinned image files
```

## Keyboard shortcuts

| Key            | Action               |
| -------------- | -------------------- |
| ↑ / ↓          | Navigate list        |
| Enter          | Paste selected item  |
| Delete         | Delete selected item |
| Esc            | Hide window          |
| Win+C (global) | Toggle window        |

## Building for release

### 1. Production build

```bash
npm run tauri build
```

Outputs:

- **Binary:** `src-tauri/target/release/sudoclip`
- **Bundles:** `src-tauri/target/release/bundle/` (`.deb`, `.rpm`, `.AppImage` depending on config)

### 2. Create a GitHub Release (manual)

1. Go to your GitHub repository
2. Click **Releases** → **Create a new release**
3. Tag: `v1.0.0` (or your version)
4. Title: `v1.0.0`
5. Description of changes
6. Upload the artifacts from `src-tauri/target/release/bundle/`:
   - `sudoclip_1.0.0_amd64.deb` — Debian/Ubuntu
   - `sudoclip-1.0.0-1.x86_64.rpm` — Fedora/RHEL
   - `sudoclip_1.0.0_amd64.AppImage` — any Linux (portable)
7. Publish release

```bash
# Debian/Ubuntu
sudo dpkg -i sudoclip_1.0.0_amd64.deb

# Fedora/RHEL
sudo rpm -i sudoclip-1.0.0-1.x86_64.rpm

# Any Linux (portable)
chmod +x sudoclip_1.0.0_amd64.AppImage
./sudoclip_1.0.0_amd64.AppImage
```
