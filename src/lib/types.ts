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

export interface PinnedItem {
  id: string;
  contentType: 'url' | 'code' | 'text' | 'image';
  content?: string;
  imageFile?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageSignature?: string;
  timestamp: number;
  imageDataUrl?: string;
  imageBytes?: number[];
}
