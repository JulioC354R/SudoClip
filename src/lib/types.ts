export interface ClipboardItem {
  id: string;
  content: string;
  contentType: 'url' | 'code' | 'text';
  timestamp: number;
}
