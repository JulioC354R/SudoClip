import { useMemo, useRef } from 'react';
import {
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
  ArrowUpAZ,
  ArrowDownZA,
  Image as ImageIcon,
  Type,
  Pin,
} from 'lucide-react';
import { useKeyboardNav } from '@/hooks/useKeyboardNav';
import { useScrollIntoView } from '@/hooks/useScrollIntoView';
import { Button } from '@/components/ui/button';
import ClipboardItemRow from '@/components/ClipboardItem';
import type { PinnedItem, ClipboardItem } from '@/lib/types';

export type SortMode =
  | 'added-asc'
  | 'added-desc'
  | 'alpha-asc'
  | 'alpha-desc'
  | 'image-first'
  | 'text-first';

const SORT_ORDER: SortMode[] = [
  'added-asc',
  'added-desc',
  'alpha-asc',
  'alpha-desc',
  'image-first',
  'text-first',
];

const SORT_ICONS: Record<SortMode, typeof ArrowUpWideNarrow> = {
  'added-asc': ArrowUpWideNarrow,
  'added-desc': ArrowDownWideNarrow,
  'alpha-asc': ArrowUpAZ,
  'alpha-desc': ArrowDownZA,
  'image-first': ImageIcon,
  'text-first': Type,
};

function sortItems(items: PinnedItem[], mode: SortMode): PinnedItem[] {
  const sorted = [...items];
  switch (mode) {
    case 'added-asc':
      return sorted.sort((a, b) => a.timestamp - b.timestamp);
    case 'added-desc':
      return sorted.sort((a, b) => b.timestamp - a.timestamp);
    case 'alpha-asc':
      return sorted.sort((a, b) =>
        (a.content || '').localeCompare(b.content || ''),
      );
    case 'alpha-desc':
      return sorted.sort((a, b) =>
        (b.content || '').localeCompare(a.content || ''),
      );
    case 'image-first':
      return sorted.sort((a, b) => {
        if (a.contentType === 'image' && b.contentType !== 'image') return -1;
        if (a.contentType !== 'image' && b.contentType === 'image') return 1;
        return 0;
      });
    case 'text-first':
      return sorted.sort((a, b) => {
        if (a.contentType !== 'image' && b.contentType === 'image') return -1;
        if (a.contentType === 'image' && b.contentType !== 'image') return 1;
        return 0;
      });
  }
}

function pinToClipboardItem(pin: PinnedItem): ClipboardItem {
  return {
    id: pin.id,
    content:
      pin.contentType === 'image'
        ? pin.imageDataUrl || ''
        : pin.content || '',
    contentType: pin.contentType,
    timestamp: pin.timestamp,
    imageBytes: pin.imageBytes,
    imageWidth: pin.imageWidth,
    imageHeight: pin.imageHeight,
    imageSignature: pin.imageSignature,
  };
}

interface PinnedListProps {
  items: PinnedItem[];
  sortMode: SortMode;
  maxItems: number;
  onSortModeChange: (mode: SortMode) => void;
  onUnpin: (item: PinnedItem) => void;
  onPaste: (item: PinnedItem) => void;
  onDelete: (item: PinnedItem) => void;
}

export default function PinnedList({
  items,
  sortMode,
  maxItems,
  onSortModeChange,
  onUnpin,
  onPaste,
  onDelete,
}: PinnedListProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const sorted = useMemo(() => sortItems(items, sortMode), [items, sortMode]);

  const { selectedIndex, setSelectedIndex } = useKeyboardNav(
    sorted,
    {
      onPaste,
      onDelete,
    },
    true,
  );

  useScrollIntoView(listRef, selectedIndex);

  const SortIcon = SORT_ICONS[sortMode];

  const cycleSort = () => {
    const idx = SORT_ORDER.indexOf(sortMode);
    const next = SORT_ORDER[(idx + 1) % SORT_ORDER.length];
    onSortModeChange(next);
    setSelectedIndex(0);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          Pinned Items
        </span>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-muted-foreground/60">
            {items.length}/{maxItems}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={cycleSort}
            className="text-muted-foreground/60 hover:text-foreground"
            title={`Sort: ${sortMode}`}
          >
            <SortIcon className="size-3" />
          </Button>
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
        {sorted.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
              <Pin className="size-6 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                No pinned items
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground/60">
                Pin items from your clipboard history to keep them safe
              </p>
            </div>
          </div>
        ) : (
          <div className="p-2">
            {sorted.map((item, idx) => {
              const clipboardItem = pinToClipboardItem(item);
              return (
                <ClipboardItemRow
                  key={item.id}
                  item={clipboardItem}
                  isSelected={idx === selectedIndex}
                  onSelect={() => setSelectedIndex(idx)}
                  onPaste={() => onPaste(item)}
                  onDelete={() => onDelete(item)}
                  onPin={() => onUnpin(item)}
                  pinned
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
