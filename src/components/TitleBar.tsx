import { Clipboard, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TitleBarProps {
  itemCount: number;
  onClose: () => void;
}

export default function TitleBar({ itemCount, onClose }: TitleBarProps) {
  return (
    <div
      data-tauri-drag-region
      className="flex h-11 shrink-0 items-center justify-between border-b border-border/50 px-4"
    >
      <div className="flex items-center gap-2" data-tauri-drag-region>
        <div className="flex size-6 items-center justify-center rounded-md bg-primary/10">
          <Clipboard className="size-3.5 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">
          SudoClip
        </span>
      </div>
      <div className="flex items-center gap-2.5">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
          {itemCount}/30
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
