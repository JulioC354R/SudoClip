import { readText, writeText, readImage, writeImage } from '@tauri-apps/plugin-clipboard-manager';
import { Image } from '@tauri-apps/api/image';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { debug } from '@tauri-apps/plugin-log';
import { rgbaToDataUrl, imageSignature, generateId } from '@/lib/utils';
import { PASTE_DELAY_MS } from '@/lib/constants';
import type { ClipboardItem } from '@/lib/types';

export function detectContentType(content: string): 'url' | 'code' | 'text' {
  if (/^https?:\/\/[^\s]+$/.test(content.trim())) return 'url';
  if (
    /[{}().;=<>]/.test(content) ||
    /\b(function|const|let|var|import|export|class|def|return)\b/.test(content)
  )
    return 'code';
  return 'text';
}

export async function readImageFromClipboard(): Promise<{
  dataUrl: string;
  bytes: number[];
  width: number;
  height: number;
  signature: string;
} | null> {
  try {
    const image = await readImage();
    const rgba = await image.rgba();
    const size = await image.size();
    const bytes = Array.from(rgba);
    return {
      dataUrl: rgbaToDataUrl(bytes, size.width, size.height),
      bytes,
      width: size.width,
      height: size.height,
      signature: imageSignature(bytes),
    };
  } catch {
    return null;
  }
}

export async function readClipboard(): Promise<string | null> {
  try {
    return await readText();
  } catch {
    return null;
  }
}

export async function writeClipboard(text: string): Promise<void> {
  await writeText(text);
}

export async function performPaste(item: {
  contentType: string;
  content: string;
  imageBytes?: number[];
  imageWidth?: number;
  imageHeight?: number;
}): Promise<void> {
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
  await new Promise((r) => setTimeout(r, PASTE_DELAY_MS));
  await invoke('simulate_paste');
}

export function createClipboardItem(
  dataUrlOrText: string,
  contentType: 'url' | 'code' | 'text' | 'image',
  extra?: Partial<Pick<ClipboardItem, 'imageBytes' | 'imageWidth' | 'imageHeight' | 'imageSignature'>>,
): ClipboardItem {
  return {
    id: generateId(),
    content: dataUrlOrText,
    contentType,
    timestamp: Math.floor(Date.now() / 1000),
    ...extra,
  };
}
