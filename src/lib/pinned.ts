import { Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';
import type { PinnedItem } from './types';

let store: Store | null = null;
let cachedItems: PinnedItem[] | null = null;

async function getStore(): Promise<Store> {
  if (store) return store;
  store = await Store.load('pinned.json');
  return store;
}

function rgbaToDataUrl(
  bytes: number[],
  width: number,
  height: number,
): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.createImageData(width, height);
  imageData.data.set(new Uint8Array(bytes));
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL();
}

export async function loadPinnedItems(): Promise<PinnedItem[]> {
  if (cachedItems) return cachedItems;

  try {
    const s = await getStore();
    const raw = await s.get<any[]>('pinned');
    const items: PinnedItem[] = raw ?? [];

    await Promise.all(
      items.map(async (item) => {
        if (item.contentType === 'image' && item.imageFile) {
          try {
            const bytes = await invoke<number[]>('read_pinned_image', {
              relativePath: item.imageFile,
            });
            item.imageBytes = bytes;
            item.imageDataUrl = rgbaToDataUrl(
              bytes,
              item.imageWidth!,
              item.imageHeight!,
            );
          } catch (e) {
            console.error('Failed to load pinned image:', e);
          }
        }
      }),
    );

    cachedItems = items;
    return items;
  } catch {
    return [];
  }
}

export async function invalidatePinnedCache(): Promise<void> {
  cachedItems = null;
}

async function savePinnedItems(items: PinnedItem[]): Promise<void> {
  const s = await getStore();
  const toStore = items.map(({ imageDataUrl, imageBytes, ...rest }) => rest);
  await s.set('pinned', toStore);
  await s.save();
}

export async function addPinnedItem(
  item: PinnedItem,
  maxItems: number,
): Promise<PinnedItem[]> {
  const items = await loadPinnedItems();
  if (items.length >= maxItems) return items;

  if (item.contentType === 'image' && item.imageBytes) {
    const relativePath = await invoke<string>('save_pinned_image', {
      id: item.id,
      bytes: item.imageBytes,
    });
    item.imageFile = relativePath;
  }

  const imageDataUrl =
    item.contentType === 'image' &&
    item.imageBytes &&
    item.imageWidth &&
    item.imageHeight
      ? rgbaToDataUrl(item.imageBytes, item.imageWidth, item.imageHeight)
      : undefined;

  const newItem: PinnedItem = {
    id: item.id,
    contentType: item.contentType,
    content: item.content,
    imageFile: item.imageFile,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    imageSignature: item.imageSignature,
    timestamp: item.timestamp,
    imageDataUrl,
    imageBytes: item.imageBytes,
  };

  const updated = [newItem, ...items];
  await savePinnedItems(updated);
  cachedItems = updated;
  return updated;
}

export async function removePinnedItem(
  item: PinnedItem,
): Promise<PinnedItem[]> {
  const items = await loadPinnedItems();
  const filtered = items.filter((i) => i.id !== item.id);

  if (item.contentType === 'image' && item.imageFile) {
    try {
      await invoke('delete_pinned_image', {
        relativePath: item.imageFile,
      });
    } catch (e) {
      console.error('Failed to delete pinned image:', e);
    }
  }

  await savePinnedItems(filtered);
  cachedItems = filtered;
  return filtered;
}
