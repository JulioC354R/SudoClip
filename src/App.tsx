import { useState, useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText, writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { Image } from '@tauri-apps/api/image';
import { debug } from '@tauri-apps/plugin-log';
import { register, unregisterAll } from '@tauri-apps/plugin-global-shortcut';
import { Search, X, Clipboard } from 'lucide-react';
import {
  readClipboard,
  readImageFromClipboard,
  detectContentType,
  generateId,
} from '@/lib/clipboard';
import type { ClipboardItem, PinnedItem } from '@/lib/types';
import {
  loadSettings,
  saveSetting,
  resetSettings,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '@/lib/settings';
import { loadPinnedItems, addPinnedItem, removePinnedItem } from '@/lib/pinned';
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
  const [selectedIndex, setSelectedIndex] = useState(0);
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

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      await unregisterAll();
      await register(DEFAULT_SETTINGS.shortcutKey, toggleWindow);

      const [s, pinned] = await Promise.all([
        loadSettings(),
        loadPinnedItems(),
      ]);
      if (cancelled) return;
      setSettings(s);
      setPinnedItems(pinned);

      if (s.shortcutKey !== DEFAULT_SETTINGS.shortcutKey) {
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
          const newItem: ClipboardItem = {
            id: generateId(),
            content: dataUrl,
            contentType: 'image',
            timestamp: Math.floor(Date.now() / 1000),
            imageBytes: bytes,
            imageWidth: width,
            imageHeight: height,
            imageSignature: signature,
          };
          debug(`New clipboard image: ${width}x${height}`);
          return [newItem, ...prev].slice(0, settings.maxItems);
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
        const newItem: ClipboardItem = {
          id: generateId(),
          content,
          contentType: detectContentType(content),
          timestamp: Math.floor(Date.now() / 1000),
        };
        debug('New clipboard content: ' + content);
        return [newItem, ...prev].slice(0, settings.maxItems);
      });
      if (isNew) setSelectedIndex(0);
    };

    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, [settings.maxItems]);

  const resetAndFocus = useCallback(() => {
    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

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

  useEffect(() => {
    if (filtered.length > 0 && selectedIndex >= filtered.length) {
      setSelectedIndex(filtered.length - 1);
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    if (activeTab === 'pinned') return;

    const onKey = (e: KeyboardEvent) => {
      if (settingsOpen) return;

      switch (e.key) {
        case 'Escape':
          getCurrentWindow().hide();
          break;
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (filtered[selectedIndex]) {
            handlePaste(filtered[selectedIndex]);
          }
          break;
        case 'Delete':
          if (document.activeElement !== searchRef.current) {
            e.preventDefault();
            const item = filtered[selectedIndex];
            if (item) {
              setHistory((prev) => prev.filter((i) => i.id !== item.id));
            }
          }
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selectedIndex, settingsOpen, activeTab]);

  useEffect(() => {
    const el = listRef.current?.querySelector(
      '[data-selected="true"]',
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handlePaste = useCallback(async (item: ClipboardItem) => {
    if (item.contentType === 'image') {
      try {
        const img = await Image.new(
          item.imageBytes!,
          item.imageWidth!,
          item.imageHeight!,
        );
        await writeImage(img);
      } catch (e) {
        debug('Image paste error: ' + e);
      }
    } else {
      await writeText(item.content);
    }
    await getCurrentWindow().hide();
    await new Promise((r) => setTimeout(r, 100));
    await invoke('simulate_paste');
  }, []);

  const handlePinnedPaste = useCallback(async (item: PinnedItem) => {
    if (item.contentType === 'image') {
      if (item.imageBytes) {
        try {
          const img = await Image.new(
            item.imageBytes,
            item.imageWidth!,
            item.imageHeight!,
          );
          await writeImage(img);
        } catch (e) {
          debug('Pinned image paste error: ' + e);
        }
      }
    } else if (item.content) {
      await writeText(item.content);
    }
    await getCurrentWindow().hide();
    await new Promise((r) => setTimeout(r, 100));
    await invoke('simulate_paste');
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
        const historyItem: ClipboardItem = {
          id: generateId(),
          content: item.imageDataUrl || '',
          contentType: 'image',
          timestamp: Math.floor(Date.now() / 1000),
          imageBytes: item.imageBytes,
          imageWidth: item.imageWidth,
          imageHeight: item.imageHeight,
        };
        setHistory((prev) =>
          [historyItem, ...prev].slice(0, settings.maxItems),
        );
      } else if (item.content) {
        const historyItem: ClipboardItem = {
          id: generateId(),
          content: item.content,
          contentType: item.contentType,
          timestamp: Math.floor(Date.now() / 1000),
        };
        setHistory((prev) =>
          [historyItem, ...prev].slice(0, settings.maxItems),
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
  }, []);

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

  const nowSecs = Math.floor(Date.now() / 1000);
  const todayItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp < 86400);
  const earlierItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp >= 86400);

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
    window.show();
    window.setFocus();
  }
}
