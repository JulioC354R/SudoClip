import { Store } from '@tauri-apps/plugin-store';
import { clamp } from '@/lib/utils';

export interface AppSettings {
  shortcutKey: string;
  maxItems: number;
  pinnedMaxItems: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shortcutKey: 'Alt+V',
  maxItems: 50,
  pinnedMaxItems: 20,
};

let store: Store | null = null;

async function getStore(): Promise<Store> {
  if (store) return store;
  store = await Store.load('settings.json');
  return store;
}

export async function loadSettings(): Promise<AppSettings> {
  try {
    const s = await getStore();
    const shortcutKey = await s.get<string>('shortcutKey');
    const maxItems = await s.get<number>('maxItems');
    const pinnedMaxItems = await s.get<number>('pinnedMaxItems');
    return {
      shortcutKey: shortcutKey ?? DEFAULT_SETTINGS.shortcutKey,
      maxItems: maxItems != null
        ? clamp(maxItems, 1, 500)
        : DEFAULT_SETTINGS.maxItems,
      pinnedMaxItems: pinnedMaxItems != null
        ? clamp(pinnedMaxItems, 1, 200)
        : DEFAULT_SETTINGS.pinnedMaxItems,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  try {
    const s = await getStore();
    let clamped = value;
    if (key === 'maxItems' && typeof value === 'number') {
      clamped = clamp(value, 1, 500) as AppSettings[K];
    }
    if (key === 'pinnedMaxItems' && typeof value === 'number') {
      clamped = clamp(value, 1, 200) as AppSettings[K];
    }
    await s.set(key, clamped);
    await s.save();
  } catch (e) {
    console.error('Failed to save setting:', e);
  }
}

export async function resetSettings(): Promise<void> {
  try {
    const s = await getStore();
    await s.clear();
    await s.save();
  } catch (e) {
    console.error('Failed to reset settings:', e);
  }
}
