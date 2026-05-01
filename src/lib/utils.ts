import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
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

export function rgbaToDataUrl(
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

export function imageSignature(bytes: number[]): string {
  let sig = `${bytes.length}|`;
  const len = Math.min(bytes.length, 256);
  for (let i = 0; i < len; i += 4) {
    sig += bytes[i].toString(16).padStart(2, '0');
  }
  return sig;
}
