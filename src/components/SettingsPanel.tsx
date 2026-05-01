import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Trash2, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';
import { clamp } from '@/lib/utils';
import { MAX_ITEMS_MAX, PINNED_MAX_ITEMS_MAX } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsPanelProps {
  shortcutKey: string;
  maxItems: number;
  pinnedMaxItems: number;
  autoStart: boolean;
  onShortcutKeyChange: (key: string) => void;
  onMaxItemsChange: (max: number) => void;
  onPinnedMaxItemsChange: (max: number) => void;
  onAutoStartChange: (enabled: boolean) => void;
  onReset: () => void;
  onClearAllPinned: () => void;
  onClose: () => void;
}

export default function SettingsPanel({
  shortcutKey,
  maxItems,
  pinnedMaxItems,
  autoStart,
  onShortcutKeyChange,
  onMaxItemsChange,
  onPinnedMaxItemsChange,
  onAutoStartChange,
  onReset,
  onClearAllPinned,
  onClose,
}: SettingsPanelProps) {
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (recording) {
      recorderRef.current?.focus();
    }
  }, [recording]);

  const handleRecorderKeyDown = (e: React.KeyboardEvent) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      setRecording(false);
      return;
    }

    const parts: string[] = [];
    if (e.ctrlKey) parts.push('Ctrl');
    if (e.altKey) parts.push('Alt');
    if (e.shiftKey) parts.push('Shift');
    if (e.metaKey) parts.push('Super');

    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return;
    if (parts.length === 0) return;

    const keyMap: Record<string, string> = {
      ' ': 'Space',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
    };

    parts.push(keyMap[e.key] || e.key.toUpperCase());
    onShortcutKeyChange(parts.join('+'));
    setRecording(false);
  };

  const handleNumericChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    min: number,
    max: number,
    onChange: (val: number) => void,
  ) => {
    const raw = e.target.value;
    if (raw === '') return;
    const val = parseInt(raw, 10);
    if (isNaN(val)) return;
    onChange(clamp(val, min, max));
  };

  return (
    <div
      className="absolute inset-0 z-50 flex flex-col bg-background"
      onKeyDown={(e) => {
        if (e.key === 'Escape' && !recording) {
          onClose();
        }
        e.stopPropagation();
      }}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border/50 px-4 py-3">
        <h2 className="text-sm font-semibold tracking-tight">Settings</h2>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Global Shortcut
            </label>
            <button
              ref={recorderRef}
              type="button"
              tabIndex={0}
              onClick={() => setRecording(true)}
              onKeyDown={handleRecorderKeyDown}
              onBlur={() => setRecording(false)}
              className={`flex h-9 w-full items-center justify-center rounded-lg border px-3 py-1 font-mono text-sm transition-colors outline-none ${
                recording
                  ? 'border-primary ring-2 ring-primary/20 text-primary'
                  : 'border-input text-foreground hover:border-ring'
              }`}
            >
              {recording ? 'Press shortcut...' : shortcutKey}
            </button>
            <p className="text-[10px] text-muted-foreground/60">
              Click and press a key combination. Requires at least one modifier
              (Ctrl, Alt, Shift, or Super).
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Max Items
            </label>
            <Input
              type="number"
              min={1}
              max={MAX_ITEMS_MAX}
              value={maxItems}
              onChange={(e) =>
                handleNumericChange(e, 1, MAX_ITEMS_MAX, onMaxItemsChange)
              }
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground/60">
              Maximum clipboard items to store (1–{MAX_ITEMS_MAX}). Values above{' '}
              {MAX_ITEMS_MAX} are capped automatically.
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              Pinned Max Items
            </label>
            <Input
              type="number"
              min={1}
              max={PINNED_MAX_ITEMS_MAX}
              value={pinnedMaxItems}
              onChange={(e) =>
                handleNumericChange(
                  e,
                  1,
                  PINNED_MAX_ITEMS_MAX,
                  onPinnedMaxItemsChange,
                )
              }
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground/60">
              Maximum pinned items (1–{PINNED_MAX_ITEMS_MAX}). Values above{' '}
              {PINNED_MAX_ITEMS_MAX} are capped automatically.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2.5">
            <div className="min-w-0 flex-1">
              <label className="text-xs font-medium text-foreground">
                Launch at startup
              </label>
              <p className="text-[10px] text-muted-foreground/60">
                Automatically start SudoClip when you log in
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoStart}
              onClick={() => onAutoStartChange(!autoStart)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                autoStart ? 'bg-primary' : 'bg-muted-foreground/30'
              }`}
            >
              <span
                className={`pointer-events-none block size-4 rounded-full bg-background shadow-sm ring-0 transition-transform ${
                  autoStart ? 'translate-x-[18px]' : 'translate-x-[2px]'
                }`}
              />
            </button>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={onReset}
            className="w-full gap-1"
          >
            <RotateCcw className="size-3" />
            Reset to Defaults
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={onClearAllPinned}
            className="w-full gap-1"
          >
            <Trash2 className="size-3" />
            Clear All Pinned
          </Button>

          <div className="border-t border-border/50 pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => openUrl('https://github.com/JulioC354R')}
                title="JulioC354R"
                className="shrink-0 overflow-hidden rounded-full ring-offset-background transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <img
                  src="https://github.com/JulioC354R.png"
                  alt="JulioC354R"
                  className="size-8"
                />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">
                  JulioC354R
                </p>
                <p className="truncate text-[10px] text-muted-foreground/60">
                  Creator &amp; maintainer
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  openUrl('https://github.com/JulioC354R/SudoClip')
                }
                className="gap-1.5"
              >
                <ExternalLink className="size-3.5" />
                GitHub
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
