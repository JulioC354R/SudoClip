import { Store } from '@tauri-apps/plugin-store';

export interface AppSettings {
  shortcutKey: string;
  maxItems: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  shortcutKey: 'Alt+V',
  maxItems: 50,
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
    return {
      shortcutKey: shortcutKey ?? DEFAULT_SETTINGS.shortcutKey,
      maxItems: maxItems != null
        ? Math.max(1, Math.min(500, maxItems))
        : DEFAULT_SETTINGS.maxItems,
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
    if (key === 'maxItems' && typeof value === 'number') {
      value = Math.max(1, Math.min(500, value)) as AppSettings[K];
    }
    await s.set(key, value);
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
