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
- **Backend**: `src-tauri/src/` — Rust with plugins: clipboard-manager, global-shortcut, single-instance, log, opener
- **Window**: 400×500, no decorations, skip taskbar, always-on-top (`src-tauri/tauri.conf.json:13-21`)
- **Global shortcut**: `Alt+V` registered in `src/lib/shortcuts.ts` to toggle window visibility
- **Clipboard polling**: reads clipboard every 5s (`src/App.tsx:22`)
- **Toggle via CLI**: `./sudoclip toggle` toggles window — used for Wayland shortcut testing

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
- **Capabilities**: `src-tauri/capabilities/default.json` — grant clipboard read/write, global-shortcut, window show/hide, logging
