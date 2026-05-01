import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface SettingsPanelProps {
  shortcutKey: string;
  maxItems: number;
  pinnedMaxItems: number;
  onShortcutKeyChange: (key: string) => void;
  onMaxItemsChange: (max: number) => void;
  onPinnedMaxItemsChange: (max: number) => void;
  onReset: () => void;
  onClose: () => void;
}

export default function SettingsPanel({
  shortcutKey,
  maxItems,
  pinnedMaxItems,
  onShortcutKeyChange,
  onMaxItemsChange,
  onPinnedMaxItemsChange,
  onReset,
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
      'ArrowUp': 'Up',
      'ArrowDown': 'Down',
      'ArrowLeft': 'Left',
      'ArrowRight': 'Right',
    };

    parts.push(keyMap[e.key] || e.key.toUpperCase());
    onShortcutKeyChange(parts.join('+'));
    setRecording(false);
  };

  const handleMaxItemsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw === '') return;
    let val = parseInt(raw, 10);
    if (isNaN(val)) return;
    val = Math.max(1, Math.min(500, val));
    onMaxItemsChange(val);
  };

  const handlePinnedMaxItemsChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const raw = e.target.value;
    if (raw === '') return;
    let val = parseInt(raw, 10);
    if (isNaN(val)) return;
    val = Math.max(1, Math.min(200, val));
    onPinnedMaxItemsChange(val);
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
        <div className="space-y-5">
          <div className="space-y-2">
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

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Max Items
            </label>
            <Input
              type="number"
              min={1}
              max={500}
              value={maxItems}
              onChange={handleMaxItemsChange}
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground/60">
              Maximum clipboard items to store (1–500). Values above 500 are
              capped automatically.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Pinned Max Items
            </label>
            <Input
              type="number"
              min={1}
              max={200}
              value={pinnedMaxItems}
              onChange={handlePinnedMaxItemsChange}
              className="h-9"
            />
            <p className="text-[10px] text-muted-foreground/60">
              Maximum pinned items (1–200). Values above 200 are capped
              automatically.
            </p>
          </div>

          <Button
            variant="destructive"
            size="sm"
            onClick={onReset}
            className="w-full gap-1.5"
          >
            <RotateCcw className="size-3" />
            Reset to Defaults
          </Button>
        </div>
      </div>
    </div>
  );
}
