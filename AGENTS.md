# SudoClip

Clipboard manager built with Tauri v2 + React 19 + TypeScript + Tailwind CSS v4 + shadcn/ui (radix-nova style).

## Quick start

```bash
npm run tauri dev        # dev mode (Vite + Tauri)
npm run tauri build      # production build
npm run build             # frontend-only: tsc && vite build
npm run dev               # frontend-only: vite
```

## Architecture

- **Frontend**: `src/` — React app with `@/` path alias (`./src/`)
- **Backend**: `src-tauri/src/` — Rust with plugins: clipboard-manager, global-shortcut, single-instance, store, log, opener
- **Window**: 400×500, no decorations, skip taskbar, always-on-top (`src-tauri/tauri.conf.json:13-21`)
- **Global shortcut**: configurable in settings (default `Alt+V`), registered in `src/App.tsx` via `@tauri-apps/plugin-global-shortcut`
- **Clipboard polling**: reads clipboard every 500ms (`src/App.tsx`)
- **Toggle via CLI**: `./sudoclip toggle` toggles window — used for Wayland shortcut testing

## Settings

- **`src/lib/settings.ts`** — wrapper around `tauri-plugin-store` (`settings.json`). Fields: `shortcutKey` (default `Alt+V`), `maxItems` (default 50, max 500), `pinnedMaxItems` (default 20, max 200).
- **`src/components/SettingsPanel.tsx`** — overlay UI with:
  - Key recorder (click to capture key combo, requires at least one modifier)
  - Max Items input (1–500, clamped)
  - Pinned Max Items input (1–200, clamped)
  - Reset to Defaults button
- Settings persist in `$APPDATA_DIR/plugins/store/settings.json`

## Pinned items

- **`src/lib/pinned.ts`** — wrapper around `tauri-plugin-store` (`pinned.json`) + file I/O via Rust commands
- **`src/components/PinnedList.tsx`** — pinned tab with 6 sort modes: added asc/desc, alpha asc/desc, image first, text first
- Rust commands in `src-tauri/src/pinned.rs`:
  - `save_pinned_image` — writes raw RGBA bytes to `$APPDATA_DIR/pinned/<id>`
  - `read_pinned_image` — reads raw RGBA bytes from disk
  - `delete_pinned_image` — deletes image file
- Images stored as raw RGBA bytes; thumbnails reconstructed via canvas on load
- Pinned items persisted across sessions

## Wayland shortcut testing

The app uses a single-instance plugin. To test global shortcuts on Wayland:

```bash
npm run tauri build
./src-tauri/target/release/sudoclip               # launch app
./src-tauri/target/release/sudoclip toggle         # toggle window from another terminal
```

## Key conventions

- **CSS**: Tailwind v4 `@import` syntax (not `@tailwind` directives), shadcn radix-nova style
- **Components**: shadcn/ui in `src/components/ui/`, utility `cn()` in `src/lib/utils.ts`
- **TypeScript**: strict mode, `noUnusedLocals`/`noUnusedParameters` enabled
- **No linter/formatter configured** — only `tsc` type-checking (via `npm run build`)
- **No test framework configured**
- **Capabilities**: `src-tauri/capabilities/default.json` — grant clipboard read/write, global-shortcut, store, window show/hide, logging, custom commands
