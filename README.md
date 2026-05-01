# SudoClip

Clipboard manager built with **Tauri v2** + **React 19** + **TypeScript** + **Tailwind CSS v4** + **shadcn/ui** (radix-nova).

Records clipboard text history in-memory (max 30 items, **not persisted** between sessions) with search, keyboard navigation, and instant paste.

## Features

- Polls clipboard every 500ms and captures new text
- Auto-detects URLs, code snippets, and plain text
- Search/filter history
- Keyboard navigation (↑/↓/Enter/Delete/Esc)
- Paste selected item directly (simulates Ctrl+V via `ydotool` on Linux)
- Global shortcut **Alt+V** to toggle window
- Floating window: 400×500, no decorations, always-on-top, skip taskbar
- Auto-hides on blur

## Quick start

```bash
npm install
npm run tauri dev      # dev mode (Vite + Tauri)
npm run tauri build     # production build
```

## Dependencies (Linux)

```bash
sudo pacman -S ydotool
```

## Usage

```bash
./src-tauri/target/release/sudoclip          # launch app
./src-tauri/target/release/sudoclip toggle    # toggle window from CLI
```

Or use the shortcut script:

```bash
./kill-sudoclip.sh                           # kill the app
```

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS v4 |
| UI | shadcn/ui (radix-nova), lucide-react |
| Backend | Rust, Tauri v2 |
| Plugins | clipboard-manager, global-shortcut, single-instance, log, opener |
| Windows | 400×500, decorations: false, skipTaskbar: true, alwaysOnTop: true |
| Persistence | None — in-memory only (history lost on restart) |

## Scripts

```bash
npm run build        # tsc && vite build
npm run dev          # frontend-only vite dev
npm run tauri build  # full Tauri production build
```

## Project structure

```
src/
├── App.tsx                  # Main app: state, polling, keyboard handling
├── components/
│   ├── ClipboardItem.tsx    # Single history item row
│   ├── Footer.tsx           # Bottom bar (item count, clear button)
│   └── TitleBar.tsx         # Custom window title bar
├── lib/
│   ├── clipboard.ts         # Clipboard read/write, content detection, ID gen
│   ├── shortcuts.ts         # Global shortcut (Alt+V) registration
│   ├── types.ts             # ClipboardItem interface
│   └── utils.ts             # cn() utility
src-tauri/src/
├── lib.rs                   # Tauri app setup, plugin registration
├── main.rs                  # Entry point
├── toggle.rs                # Window toggle via CLI or single-instance
└── paste.rs                 # Simulate Ctrl+V paste
```

## Keyboard shortcuts (inside window)

| Key | Action |
|-----|--------|
| ↑ / ↓ | Navigate history |
| Enter | Paste selected item |
| Delete | Delete selected item |
| Esc | Hide window |
| Alt+V (global) | Toggle window |
