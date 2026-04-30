import { useState, useEffect, useRef, useCallback } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { writeText } from '@tauri-apps/plugin-clipboard-manager';
import { debug } from '@tauri-apps/plugin-log';
import { Search, X, Clipboard } from 'lucide-react';
import { readClipboard, detectContentType, generateId } from '@/lib/clipboard';
import type { ClipboardItem } from '@/lib/types';
import { Input } from '@/components/ui/input';
import TitleBar from '@/components/TitleBar';
import ClipboardItemRow from '@/components/ClipboardItem';
import Footer from '@/components/Footer';

const MAX_ITEMS = 30;

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
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = history.filter(
    (item) =>
      search === '' ||
      item.content.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    const poll = async () => {
      const content = await readClipboard();
      if (!content) return;
      setHistory((prev) => {
        if (prev.some((i) => i.content === content)) return prev;
        const newItem: ClipboardItem = {
          id: generateId(),
          content,
          contentType: detectContentType(content),
          timestamp: Math.floor(Date.now() / 1000),
        };
        debug('New clipboard content: ' + content);
        setSelectedIndex(0);
        return [newItem, ...prev].slice(0, MAX_ITEMS);
      });
    };

    const interval = setInterval(poll, 500);
    return () => clearInterval(interval);
  }, []);

  const resetAndFocus = useCallback(() => {
    setSearch('');
    setSelectedIndex(0);
    setTimeout(() => searchRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    const appWindow = getCurrentWindow();
    const unlistenFocus = appWindow.onFocusChanged(({ payload: focused }) => {
      if (focused) resetAndFocus();
    });

    return () => {
      unlistenFocus.then((fn) => fn());
    };
  }, [resetAndFocus]);

  useEffect(() => {
    if (filtered.length > 0 && selectedIndex >= filtered.length) {
      setSelectedIndex(filtered.length - 1);
    }
  }, [filtered.length, selectedIndex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
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
            writeText(filtered[selectedIndex].content);
            getCurrentWindow().hide();
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
  }, [filtered, selectedIndex]);

  useEffect(() => {
    const el = listRef.current?.querySelector(
      '[data-selected="true"]',
    ) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  const handlePaste = useCallback((content: string) => {
    writeText(content);
    getCurrentWindow().hide();
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

  const nowSecs = Math.floor(Date.now() / 1000);
  const todayItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp < 86400);
  const earlierItems = filtered
    .map((item, idx) => ({ item, idx }))
    .filter(({ item }) => nowSecs - item.timestamp >= 86400);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TitleBar itemCount={history.length} onClose={handleClose} />

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
                    onPaste={() => handlePaste(item.content)}
                    onDelete={() => handleDelete(item.id)}
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
                    onPaste={() => handlePaste(item.content)}
                    onDelete={() => handleDelete(item.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <Footer
        historyLength={history.length}
        filteredLength={filtered.length}
        search={search}
        onClear={handleClear}
      />
    </div>
  );
}
