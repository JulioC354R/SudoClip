import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FooterProps {
  historyLength: number;
  filteredLength: number;
  search: string;
  onClear: () => void;
}

export default function Footer({
  historyLength,
  filteredLength,
  search,
  onClear,
}: FooterProps) {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border/50 px-4 py-2">
      <span className="text-xs text-muted-foreground/70">
        {search
          ? `${filteredLength} of ${historyLength} items`
          : `${historyLength} ${historyLength === 1 ? 'item' : 'items'}`}
      </span>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground/50">
          ↑↓ navigate · Enter paste · Esc close
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={onClear}
          disabled={historyLength === 0}
          className="h-6 gap-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
        >
          <Trash2 className="size-3" />
          Clear
        </Button>
      </div>
    </div>
  );
}
