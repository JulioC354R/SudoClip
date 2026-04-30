import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager';

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
