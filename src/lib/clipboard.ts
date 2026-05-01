import { readText, writeText, readImage } from '@tauri-apps/plugin-clipboard-manager';

export function detectContentType(content: string): 'url' | 'code' | 'text' {
  if (/^https?:\/\/[^\s]+$/.test(content.trim())) return 'url';
  if (
    /[{}().;=<>]/.test(content) ||
    /\b(function|const|let|var|import|export|class|def|return)\b/.test(content)
  )
    return 'code';
  return 'text';
}

export function timeAgo(timestamp: number): string {
  const diff = Math.floor(Date.now() / 1000) - timestamp;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

let idCounter = 0;
export function generateId(): string {
  return `item_${Date.now()}_${++idCounter}`;
}

export function imageSignature(bytes: number[]): string {
  let sig = `${bytes.length}|`;
  const len = Math.min(bytes.length, 256);
  for (let i = 0; i < len; i += 4) {
    sig += bytes[i].toString(16).padStart(2, '0');
  }
  return sig;
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
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(size.width, size.height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);
    return {
      dataUrl: canvas.toDataURL(),
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
