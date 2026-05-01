import { Link, Code2, Type, Image, X, Pin, PinOff } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ClipboardItem } from '@/lib/types';

interface ClipboardItemRowProps {
  item: ClipboardItem;
  isSelected: boolean;
  onSelect: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onPin?: () => void;
  pinned?: boolean;
}

const TYPE_CONFIG: Record<
  string,
  { icon: typeof Link; badge: 'accent' | 'default' | 'muted'; label: string; bg: string }
> = {
  url: {
    icon: Link,
    badge: 'accent',
    label: 'URL',
    bg: 'bg-accent/10 text-accent',
  },
  code: {
    icon: Code2,
    badge: 'default',
    label: 'Code',
    bg: 'bg-primary/10 text-primary',
  },
  image: {
    icon: Image,
    badge: 'muted',
    label: 'Image',
    bg: 'bg-emerald-500/10 text-emerald-500',
  },
  text: {
    icon: Type,
    badge: 'muted',
    label: 'Text',
    bg: 'bg-muted text-muted-foreground',
  },
};

export default function ClipboardItemRow({
  item,
  isSelected,
  onSelect,
  onPaste,
  onDelete,
  onPin,
  pinned,
}: ClipboardItemRowProps) {
  const config = TYPE_CONFIG[item.contentType] || TYPE_CONFIG.text;
  const TypeIcon = config.icon;

  return (
    <div
      data-selected={isSelected}
      onClick={onPaste}
      onMouseEnter={onSelect}
      className={cn(
        'group relative flex cursor-pointer select-none items-start gap-3 rounded-lg px-3 py-2.5 transition-colors',
        isSelected ? 'bg-muted/70 ring-1 ring-border' : 'hover:bg-muted/40',
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md',
          config.bg,
        )}
      >
        <TypeIcon className="size-3.5 shrink-0" />
      </div>

      <div className="min-w-0 flex-1">
        {item.contentType === 'image' ? (
          <div className="flex items-center gap-3">
            <img
              src={item.content}
              alt="clipboard image"
              className="h-12 w-auto rounded border border-border/50 object-cover"
            />
            <span className="text-xs text-muted-foreground">
              {item.imageWidth}&times;{item.imageHeight}
            </span>
          </div>
        ) : (
          <p
            className={cn(
              'truncate text-sm leading-snug',
              item.contentType === 'code' && 'font-mono text-[0.8rem]',
              isSelected ? 'text-foreground' : 'text-foreground/85',
            )}
          >
            {item.content}
          </p>
        )}
        <div className="mt-1 flex items-center gap-1.5">
          <Badge variant={config.badge}>{config.label}</Badge>
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(item.timestamp)}
          </span>
        </div>
      </div>

      <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
        {onPin && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            className={cn(
              'flex size-6 items-center justify-center rounded-md',
              'opacity-0 transition-all group-hover:opacity-100',
              pinned
                ? 'text-primary hover:text-primary/80'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className={cn(
            'flex size-6 items-center justify-center rounded-md text-muted-foreground',
            'opacity-0 transition-all group-hover:opacity-100',
            'hover:bg-destructive/10 hover:text-destructive',
          )}
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
