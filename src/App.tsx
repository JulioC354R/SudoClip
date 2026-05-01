import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow, PhysicalPosition, currentMonitor, availableMonitors } from '@tauri-apps/api/window';
import { debug } from '@tauri-apps/plugin-log';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { Search, X, Clipboard } from 'lucide-react';
import {
  readClipboard,
  readImageFromClipboard,
  detectContentType,
  performPaste,
  createClipboardItem,
} from '@/lib/clipboard';
import type { ClipboardItem, PinnedItem } from '@/lib/types';
import {
  loadSettings,
  saveSetting,
  resetSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '@/lib/settings';
import {
  loadPinnedItems,
  addPinnedItem,
  removePinnedItem,
  clearAllPinned,
} from '@/lib/pinned';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import { POLL_INTERVAL_MS, SECONDS_PER_DAY, WIN_WIDTH, WIN_HEIGHT } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import TitleBar from '@/components/TitleBar';
import ClipboardItemRow from '@/components/ClipboardItem';
import Footer from '@/components/Footer';
import SettingsPanel from '@/components/SettingsPanel';
import PinnedList, { type SortMode } from '@/components/PinnedList';

function SectionLabel({ text }: { text: string }) {
  return (
    <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
      {text}
    </p>
  );
}

export default function App() {
  const [history, setHistory] = useState<ClipboardItem[]>([]);
  const [search, setSearch] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [pinnedItems, setPinnedItems] = useState<PinnedItem[]>([]);
  const [activeTab, setActiveTab] = useState<'history' | 'pinned'>('history');
  const [sortMode, setSortMode] = useState<SortMode>('added-desc');
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = history.filter(
    (item) =>
      search === '' ||
      item.content.toLowerCase().includes(search.toLowerCase()),
  );

  const { selectedIndex, setSelectedIndex } = useKeyboardNav(
    activeTab === 'history' ? filtered : [],
    {
      onPaste: (item) => handlePaste(item),
      onDelete: (item) => handleDelete(item.id),
      onEscape: () => getCurrentWindow().hide(),
    },
    activeTab === 'history' && !settingsOpen,
  );

  useScrollIntoView(listRef, selectedIndex);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await unregisterAll();
      await register('Alt+V', toggleWindow);

      const [s, pinned] = await Promise.all([
        loadSettings(),
        loadPinnedItems(),
      ]);
      if (cancelled) return;
      setSettings(s);
      setPinnedItems(pinned);

      if (s.shortcutKey !== 'Alt+V') {
        await unregisterAll();
        await register(s.shortcutKey, toggleWindow);
      }
    };

    init();

    return () => {
      cancelled = true;
      unregisterAll();
    };
  }, []);

  useEffect(() => {
    const poll = async () => {
      const imageResult = await readImageFromClipboard();
      if (imageResult) {
        const { dataUrl, bytes, width, height, signature } = imageResult;
        let isNew = false;
        setHistory((prev) => {
          if (prev.some((i) => i.imageSignature === signature)) return prev;
          isNew = true;
          debug(`New clipboard image: ${width}x${height}`);
          return [
            createClipboardItem(dataUrl, 'image', { imageBytes: bytes, imageWidth: width, imageHeight: height, imageSignature: signature }),
            ...prev,
          ].slice(0, settings.maxItems);
        });
        if (isNew) setSelectedIndex(0);
        return;
      }

      const content = await readClipboard();
      if (!content) return;
      let isNew = false;
      setHistory((prev) => {
        if (prev.some((i) => i.content === content)) return prev;
        isNew = true;
        debug('New clipboard content: ' + content);
        return [createClipboardItem(content, detectContentType(content)), ...prev].slice(0, settings.maxItems);
      });
      if (isNew) setSelectedIndex(0);
    };

    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [settings.maxItems, setSelectedIndex]);

  const resetAndFocus = useCallback(() => {
    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, [setSelectedIndex]);

  useEffect(() => {
    const unlistenBlur = listen('tauri://blur', () => {
      getCurrentWindow().hide();
    });
    const unlistenFocus = listen('tauri://focus', () => resetAndFocus());

    return () => {
      unlistenBlur.then((fn) => fn());
      unlistenFocus.then((fn) => fn());
    };
  }, [resetAndFocus]);

  const handlePaste = useCallback(async (item: ClipboardItem) => {
    await performPaste(item);
  }, []);

  const handlePinnedPaste = useCallback(async (item: PinnedItem) => {
    await performPaste({
      contentType: item.contentType,
      content: item.contentType === 'image' ? item.imageDataUrl || '' : item.content || '',
      imageBytes: item.imageBytes,
      imageWidth: item.imageWidth,
      imageHeight: item.imageHeight,
    });
  }, []);

  const handlePin = useCallback(
    async (item: ClipboardItem) => {
      const pinnedItem: PinnedItem = {
        id: item.id,
        contentType: item.contentType,
        content: item.content,
        imageWidth: item.imageWidth,
        imageHeight: item.imageHeight,
        imageSignature: item.imageSignature,
        timestamp: item.timestamp,
        imageBytes: item.imageBytes,
      };
      const updated = await addPinnedItem(pinnedItem, settings.pinnedMaxItems);
      if (updated.some((i) => i.id === pinnedItem.id)) {
        setPinnedItems(updated);
        setHistory((prev) => prev.filter((i) => i.id !== item.id));
      }
    },
    [settings.pinnedMaxItems],
  );

  const handleUnpin = useCallback(
    async (item: PinnedItem) => {
      const updated = await removePinnedItem(item);
      setPinnedItems(updated);

      if (item.contentType === 'image' && item.imageBytes) {
        setHistory((prev) =>
          [
            createClipboardItem(item.imageDataUrl || '', 'image', {
              imageBytes: item.imageBytes,
              imageWidth: item.imageWidth,
              imageHeight: item.imageHeight,
            }),
            ...prev,
          ].slice(0, settings.maxItems),
        );
      } else if (item.content) {
        setHistory((prev) =>
          [createClipboardItem(item.content!, item.contentType), ...prev].slice(0, settings.maxItems),
        );
      }
    },
    [settings.maxItems],
  );

  const handlePinnedDelete = useCallback(async (item: PinnedItem) => {
    const updated = await removePinnedItem(item);
    setPinnedItems(updated);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setHistory((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const handleClear = useCallback(() => {
    setHistory([]);
    setSelectedIndex(0);
  }, [setSelectedIndex]);

  const handleClose = useCallback(() => {
    getCurrentWindow().hide();
  }, []);

  const handleOpenSettings = useCallback(() => {
    setSettingsOpen(true);
  }, []);

  const handleShortcutKeyChange = useCallback(async (key: string) => {
    setSettings((prev) => ({ ...prev, shortcutKey: key }));
    await saveSetting('shortcutKey', key);
    await unregisterAll();
    await register(key, toggleWindow);
  }, []);

  const handleMaxItemsChange = useCallback(async (max: number) => {
    setSettings((prev) => ({ ...prev, maxItems: max }));
    await saveSetting('maxItems', max);
  }, []);

  const handlePinnedMaxItemsChange = useCallback(async (max: number) => {
    setSettings((prev) => ({ ...prev, pinnedMaxItems: max }));
    await saveSetting('pinnedMaxItems', max);
  }, []);

  const handleReset = useCallback(async () => {
    await resetSettings();
    setSettings({ ...DEFAULT_SETTINGS });
    await unregisterAll();
    await register(DEFAULT_SETTINGS.shortcutKey, toggleWindow);
  }, []);

  const handleClearAllPinned = useCallback(async () => {
    await clearAllPinned();
    setPinnedItems([]);
  }, []);

  const nowSecs = Math.floor(Date.now() / 1000);
  const todayItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp < SECONDS_PER_DAY);
  const earlierItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp >= SECONDS_PER_DAY);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-background">
      {settingsOpen ? (
        <SettingsPanel
          shortcutKey={settings.shortcutKey}
          maxItems={settings.maxItems}
          pinnedMaxItems={settings.pinnedMaxItems}
          onShortcutKeyChange={handleShortcutKeyChange}
          onMaxItemsChange={handleMaxItemsChange}
          onPinnedMaxItemsChange={handlePinnedMaxItemsChange}
          onReset={handleReset}
          onClearAllPinned={handleClearAllPinned}
          onClose={() => setSettingsOpen(false)}
        />
      ) : (
        <>
          <TitleBar
            itemCount={history.length}
            maxItems={settings.maxItems}
            onClose={handleClose}
            onSettings={handleOpenSettings}
          />

          <div className="shrink-0 border-b border-border/50 px-3 py-2.5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground/60" />
              <Input
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search clipboard history..."
                className="h-8 border-transparent bg-muted/50 pl-8 text-sm focus-visible:border-border focus-visible:bg-background"
              />
              {search && (
                <button
                  onClick={() => {
                    setSearch('');
                    setSelectedIndex(0);
                    searchRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex shrink-0 border-b border-border/50">
            <button
              onClick={() => {
                setActiveTab('history');
                setSelectedIndex(0);
              }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              History ({history.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('pinned');
                setSearch('');
              }}
              className={`flex-1 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'pinned'
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Pinned ({pinnedItems.length})
            </button>
          </div>

          {activeTab === 'history' ? (
            <div
              ref={listRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor:
                  'color-mix(in oklch, var(--border) 80%, transparent) transparent',
              }}
            >
              {filtered.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
                    <Clipboard className="size-6 text-muted-foreground/40" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {search ? 'No matching items' : 'Nothing here yet'}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                      {search
                        ? 'Try a different search term'
                        : 'Copy text to start building your clipboard history'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  {todayItems.length > 0 && (
                    <>
                      <SectionLabel text="Today" />
                      {todayItems.map(({ item, idx }) => (
                        <ClipboardItemRow
                          key={item.id}
                          item={item}
                          isSelected={idx === selectedIndex}
                          onSelect={() => setSelectedIndex(idx)}
                          onPaste={() => handlePaste(item)}
                          onDelete={() => handleDelete(item.id)}
                          onPin={() => handlePin(item)}
                        />
                      ))}
                    </>
                  )}
                  {earlierItems.length > 0 && (
                    <>
                      <SectionLabel text="Earlier" />
                      {earlierItems.map(({ item, idx }) => (
                        <ClipboardItemRow
                          key={item.id}
                          item={item}
                          isSelected={idx === selectedIndex}
                          onSelect={() => setSelectedIndex(idx)}
                          onPaste={() => handlePaste(item)}
                          onDelete={() => handleDelete(item.id)}
                          onPin={() => handlePin(item)}
                        />
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              <PinnedList
                items={pinnedItems}
                sortMode={sortMode}
                maxItems={settings.pinnedMaxItems}
                onSortModeChange={setSortMode}
                onUnpin={handleUnpin}
                onPaste={handlePinnedPaste}
                onDelete={handlePinnedDelete}
              />
            </div>
          )}

          <Footer
            historyLength={history.length}
            filteredLength={filtered.length}
            search={search}
            onClear={handleClear}
          />
        </>
      )}
    </div>
  );
}

async function toggleWindow(event?: { state: string }) {
  if (event && event.state !== 'Pressed') return;
  const window = getCurrentWindow();
  const isVisible = await window.isVisible();
  debug('Toggle window - visible: ' + isVisible);
  if (isVisible) {
    window.hide();
  } else {
    await positionWindowAtCursor(window);
    await window.show();
    await window.setFocus();
  }
}

async function positionWindowAtCursor(win: ReturnType<typeof getCurrentWindow>) {
  let cursorX: number;
  let cursorY: number;

  try {
    const pos = await invoke<[number, number]>('get_cursor_position');
    cursorX = pos[0];
    cursorY = pos[1];
  } catch {
    const monitor = await currentMonitor();
    if (monitor) {
      cursorX = monitor.position.x + monitor.size.width / 2;
      cursorY = monitor.position.y + monitor.size.height / 2;
    } else {
      return;
    }
  }

  const monitors = await availableMonitors();
  const mon = monitors.find(
    (m) =>
      cursorX >= m.position.x &&
      cursorX <= m.position.x + m.size.width &&
      cursorY >= m.position.y &&
      cursorY <= m.position.y + m.size.height,
  ) || (await currentMonitor());

  let x = Math.round(cursorX - WIN_WIDTH / 2);
  let y = cursorY;

  if (mon) {
    const monLeft = mon.position.x;
    const monRight = mon.position.x + mon.size.width;
    const monTop = mon.position.y;
    const monBottom = mon.position.y + mon.size.height;

    if (x < monLeft) x = monLeft;
    if (x + WIN_WIDTH > monRight) x = monRight - WIN_WIDTH;
    if (y + WIN_HEIGHT > monBottom) y = cursorY - WIN_HEIGHT;
    if (y < monTop) y = monTop;
  }

  await win.setPosition(new PhysicalPosition(x, y));
}
