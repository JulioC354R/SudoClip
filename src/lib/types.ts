export interface ClipboardItem {
  id: string;
  content: string;
  contentType: 'url' | 'code' | 'text' | 'image';
  timestamp: number;
  imageBytes?: number[];
  imageWidth?: number;
  imageHeight?: number;
  imageSignature?: string;
}
