import { useEffect, type RefObject } from 'react';

export function useScrollIntoView(
  listRef: RefObject<HTMLDivElement | null>,
  selectedIndex: number,
  selector = '[data-selected="true"]',
): void {
  useEffect(() => {
    const el = listRef.current?.querySelector(selector) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex, listRef, selector]);
}
