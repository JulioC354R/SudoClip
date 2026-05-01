import { Link, Code2, Type, Image, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ClipboardItem } from '@/lib/types';
import { timeAgo } from '@/lib/clipboard';

interface ClipboardItemRowProps {
  item: ClipboardItem;
  isSelected: boolean;
  onSelect: () => void;
  onPaste: () => void;
  onDelete: () => void;
}

function TypeIcon({ type }: { type: string }) {
  if (type === 'url') return <Link className="size-3.5 shrink-0" />;
  if (type === 'code') return <Code2 className="size-3.5 shrink-0" />;
  if (type === 'image') return <Image className="size-3.5 shrink-0" />;
  return <Type className="size-3.5 shrink-0" />;
}

function typeBadgeVariant(type: string): 'accent' | 'default' | 'muted' {
  if (type === 'url') return 'accent';
  if (type === 'code') return 'default';
  return 'muted';
}

function typeLabel(type: string): string {
  if (type === 'url') return 'URL';
  if (type === 'code') return 'Code';
  if (type === 'image') return 'Image';
  return 'Text';
}

function typeIconBg(type: string): string {
  if (type === 'url') return 'bg-accent/10 text-accent';
  if (type === 'code') return 'bg-primary/10 text-primary';
  if (type === 'image') return 'bg-emerald-500/10 text-emerald-500';
  return 'bg-muted text-muted-foreground';
}

export default function ClipboardItemRow({
  item,
  isSelected,
  onSelect,
  onPaste,
  onDelete,
}: ClipboardItemRowProps) {
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
          typeIconBg(item.contentType),
        )}
      >
        <TypeIcon type={item.contentType} />
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
          <Badge variant={typeBadgeVariant(item.contentType)}>
            {typeLabel(item.contentType)}
          </Badge>
          <span className="text-[11px] text-muted-foreground">
            {timeAgo(item.timestamp)}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className={cn(
          'mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground',
          'opacity-0 transition-all group-hover:opacity-100',
          'hover:bg-destructive/10 hover:text-destructive',
        )}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
