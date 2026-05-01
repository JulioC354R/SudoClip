import { useState, useEffect } from 'react';

export function useKeyboardNav<T>(
  items: T[],
  callbacks: {
    onPaste?: (item: T) => void;
    onDelete?: (item: T) => void;
    onEscape?: () => void;
  },
  enabled = true,
): { selectedIndex: number; setSelectedIndex: React.Dispatch<React.SetStateAction<number>> } {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (items.length > 0 && selectedIndex >= items.length) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (items[selectedIndex] && callbacks.onPaste) {
            callbacks.onPaste(items[selectedIndex]);
          }
          break;
        case 'Delete':
          e.preventDefault();
          if (items[selectedIndex] && callbacks.onDelete) {
            callbacks.onDelete(items[selectedIndex]);
          }
          break;
        case 'Escape':
          if (callbacks.onEscape) {
            callbacks.onEscape();
          }
          break;
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, selectedIndex, callbacks, enabled]);

  return { selectedIndex, setSelectedIndex };
}
