# SudoClip Usage Guide

## Table of contents

- [Getting started](#getting-started)
- [Window overview](#window-overview)
- [Clipboard history](#clipboard-history)
- [Pinned items](#pinned-items)
- [Settings](#settings)
- [Keyboard shortcuts](#keyboard-shortcuts)
- [Data storage](#data-storage)

---

## Getting started

Launch the app:

```bash
./src-tauri/target/release/sudoclip
```

The window starts hidden. Press the global shortcut (**Alt+V** by default) to show it. Copy any text or image while the app is running — it appears in the history automatically.

---

## Window overview

The app window has four sections:

```
┌──────────────────────────────────┐
│ [icon] SudoClip   3/50 [⚙] [✕] │  ← TitleBar
├──────────────────────────────────┤
│ [🔍 Search clipboard history...] │  ← Search bar
├──────────────────────────────────┤
│ [History (3)]  [Pinned (2)]      │  ← Tabs
├──────────────────────────────────┤
│                                  │
│  Today                           │
│  ┌─ item ─── [Pin] [✕] ─┐      │
│  │ URL                     │      │  ← Clipboard items
│  └────────────────────────┘      │
│  Earlier                         │
│  ┌─ item ─── [Pin] [✕] ─┐      │
│  │ Text                    │      │
│  └────────────────────────┘      │
│                                  │
├──────────────────────────────────┤
│ 3 items    ↑↓·Enter·Esc    [🗑]  │  ← Footer
└──────────────────────────────────┘
```

### TitleBar

- Left: app name
- Center/right: item count / max, settings button (⚙), close button (✕)
- Draggable — click and drag to move the window

### Search bar

- Type to filter history by content
- Click the ✕ button or press Esc to clear search

### Tabs

- **History** — recent clipboard items (volatile, lost on restart)
- **Pinned** — pinned items (persisted across sessions)

### Footer

- Item count (shows "X of Y items" when searching)
- Keyboard shortcut hints
- Clear button (🗑) — removes all history items

---

## Clipboard history

### How it works

- Every **500ms** the app checks the system clipboard for new content
- New items are prepended to the history list
- Items are classified as:
  - **URL** — starts with `http://` or `https://`
  - **Code** — contains brackets, semicolons, or programming keywords
  - **Text** — plain text
  - **Image** — image data from clipboard

### Sections

Items are grouped by age:

| Section   | Age               |
| --------- | ----------------- |
| **Today** | Less than 24 hours |
| **Earlier** | 24 hours or more  |

### Limits

- Configurable max items (default **50**, max **500**)
- When the limit is reached, the oldest items are removed automatically
- **Pinned items are not affected** by this limit

### Keyboard navigation

| Key       | Action                  |
| --------- | ----------------------- |
| ↑         | Move selection up       |
| ↓         | Move selection down     |
| Enter     | Paste selected item     |
| Delete    | Remove selected item    |
| Esc       | Hide window             |

### Paste behavior

1. The item content is written back to the system clipboard
2. The app window hides
3. After 100ms, a Ctrl+V keystroke is simulated (via `ydotool` on Linux, `enigo` on Windows/macOS)

This allows pasting the selected item directly into the active application.

---

## Pinned items

Pinned items are **persisted across app restarts**. Use them to keep important clipboard content safe.

### Pin / Unpin

| Context    | Action                                      |
| ---------- | ------------------------------------------- |
| **History** | Hover an item → click the **pin icon** (📌) to move it to Pinned |
| **Pinned**  | Hover a pinned item → click the **unpin icon** (📌 off) to move it back to History |
| **Pinned**  | Click the **✕ icon** to permanently delete from pinned (does not go back to history) |

- Pinning removes the item from History and adds it to Pinned
- Unpinning removes it from Pinned and adds it back to History (as a new entry)
- Deleting from Pinned is permanent (item is lost)

### Sort modes

In the Pinned tab, click the sort icon (next to the count) to cycle through 6 sort modes:

| # | Mode            | Icon                           | Description                |
| - | --------------- | ------------------------------ | -------------------------- |
| 1 | **Added ↑**     | `ArrowUpWideNarrow`            | Oldest first               |
| 2 | **Added ↓**     | `ArrowDownWideNarrow`          | Newest first (default)     |
| 3 | **A-Z**         | `ArrowUpAZ`                    | Content alphabetical A→Z   |
| 4 | **Z-A**         | `ArrowDownZA`                  | Content alphabetical Z→A   |
| 5 | **Images first** | `Image`                      | Images before text items   |
| 6 | **Text first**   | `Type`                       | Text before image items    |

### Limits

- Configurable max pinned items (default **20**, max **200**)
- Attempting to pin when at the limit silently fails
- Pinned items do not count toward the history limit

### Image persistence

Pinned images are saved as raw RGBA pixel data in:

- **Linux:** `~/.local/share/com.sudoclip.app/pinned/<id>`
- **macOS:** `~/Library/Application Support/com.sudoclip.app/pinned/<id>`
- **Windows:** `C:\Users\<user>\AppData\Roaming\com.sudoclip.app\pinned\<id>`

On app restart, the image data is read from disk and thumbnails are reconstructed for display.

---

## Settings

Click the **gear icon (⚙)** in the TitleBar to open settings.

### Global Shortcut

- Click the shortcut button and press the desired key combination
- Requires at least one modifier key (Ctrl, Alt, Shift, or Super/Cmd)
- Default: `Alt+V`
- Changes take effect immediately

### Max Items

- Maximum clipboard items stored in history (1–500)
- Values above 500 are capped automatically
- Default: 50

### Pinned Max Items

- Maximum pinned items (1–200)
- Values above 200 are capped automatically
- Default: 20

### Reset to Defaults

- Resets all settings to defaults:
  - Shortcut: `Alt+V`
  - Max Items: 50
  - Pinned Max Items: 20
- **Does not affect existing pinned items**

---

## Keyboard shortcuts

### Global

| Shortcut           | Action              |
| ------------------ | ------------------- |
| Alt+V (configurable) | Toggle window show/hide |

### Inside window

| Key            | Action                        |
| -------------- | ----------------------------- |
| ↑ / ↓          | Navigate list up/down          |
| Enter          | Paste selected item            |
| Delete         | Delete selected item           |
| Esc            | Hide window / Cancel action   |

### In Settings

| Key            | Action                        |
| -------------- | ----------------------------- |
| Esc            | Close settings                |

### CLI

```bash
./sudoclip toggle    # Toggle window visibility from terminal
```

---

## Data storage

### Settings (`settings.json`)

| Key              | Type   | Default | Description                    |
| ---------------- | ------ | ------- | ------------------------------ |
| `shortcutKey`    | string | Alt+V   | Global shortcut to toggle window |
| `maxItems`       | number | 50      | Max clipboard history items    |
| `pinnedMaxItems` | number | 20      | Max pinned items               |

Location: `$APPDATA_DIR/plugins/store/settings.json`

### Pinned items (`pinned.json`)

Each pinned item stores:
- `id`, `contentType`, `content` (for text), `timestamp`
- For images: `imageFile` (relative path), `imageWidth`, `imageHeight`, `imageSignature`

Location: `$APPDATA_DIR/plugins/store/pinned.json`
Image files: `$APPDATA_DIR/pinned/<id>` (raw RGBA pixel data)

### App data directory

| Platform | Path |
| -------- | ---- |
| Linux    | `~/.local/share/com.sudoclip.app/` |
| macOS    | `~/Library/Application Support/com.sudoclip.app/` |
| Windows  | `C:\Users\<user>\AppData\Roaming\com.sudoclip.app\` |

### Volatile data

Clipboard history (non-pinned items) is stored only in memory and lost when the app exits.
