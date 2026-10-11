import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Check, ChevronRight, ClipboardPaste, Copy, MoreHorizontal } from "lucide-react";
import type { StylePreset } from "@/lib/layout";

interface StyleToolsProps {
  /** Something was copied (Paste is enabled). */
  canPaste: boolean;
  presets: StylePreset[];
  onCopy: () => void;
  onPaste: () => void;
  /** Make this widget's style the profile's default. */
  onUseForProfile: () => void;
  onSavePreset: (name: string) => void;
  onApplyPreset: (id: string) => void;
  onDeletePreset: (id: string) => void;
}

const ICON_BUTTON =
  "flex h-6 w-6 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground disabled:pointer-events-none disabled:opacity-40 data-popup-open:bg-accent/40 data-popup-open:text-foreground";
const POPUP =
  "min-w-40 rounded-md border border-border bg-popover p-1 text-xs text-foreground shadow-lg outline-none";
const ITEM =
  "flex cursor-default items-center justify-between gap-3 rounded-[5px] px-2 py-1.5 outline-none select-none data-disabled:text-muted-foreground/50 data-highlighted:bg-accent data-popup-open:bg-accent/60";
const SEPARATOR = "mx-1 my-1 h-px bg-border";

/** A "▸" submenu listing the style presets. */
function PresetSubmenu({
  label,
  presets,
  onPick,
}: {
  label: string;
  presets: StylePreset[];
  onPick: (id: string) => void;
}) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={ITEM} disabled={presets.length === 0}>
        {label} <ChevronRight className="h-3 w-3" />
      </Menu.SubmenuTrigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} alignOffset={-4}>
          <Menu.Popup className={POPUP}>
            {presets.map((p) => (
              <Menu.Item key={p.id} className={ITEM} onClick={() => onPick(p.id)}>
                {p.name}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

/**
 * Inspector actions for a widget's look (the keys in `PROFILE_STYLE_KEYS`):
 * copy / paste it between widgets, and a "⋯" menu to make it the profile
 * default and keep named presets.
 */
export function StyleTools({
  canPaste,
  presets,
  onCopy,
  onPaste,
  onUseForProfile,
  onSavePreset,
  onApplyPreset,
  onDeletePreset,
}: StyleToolsProps) {
  // Non-null while the "Save as preset…" name input is shown.
  const [name, setName] = useState<string | null>(null);

  const save = () => {
    const trimmed = name?.trim();
    if (!trimmed) return;
    onSavePreset(trimmed);
    setName(null);
  };

  if (name !== null) {
    return (
      <div className="flex items-center gap-1">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setName(null);
          }}
          onBlur={() => !name.trim() && setName(null)}
          placeholder="Preset name"
          className="w-28 rounded-md border border-border bg-background px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/50"
        />
        <button
          type="button"
          className={ICON_BUTTON}
          disabled={!name.trim()}
          onClick={save}
          title="Save as preset"
        >
          <Check className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <button type="button" className={ICON_BUTTON} onClick={onCopy} title="Copy this widget's style">
        <Copy className="h-3 w-3" />
      </button>
      <button
        type="button"
        className={ICON_BUTTON}
        onClick={onPaste}
        disabled={!canPaste}
        title="Paste style: replace this widget's style with the copied one"
      >
        <ClipboardPaste className="h-3 w-3" />
      </button>
      <Menu.Root>
        <Menu.Trigger className={ICON_BUTTON} title="More style actions">
          <MoreHorizontal className="h-3 w-3" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner className="z-50" sideOffset={4} align="end">
            <Menu.Popup className={POPUP}>
              <Menu.Item
                className={ITEM}
                onClick={onUseForProfile}
                title="Make this style the default for every widget in the profile"
              >
                Use for profile
              </Menu.Item>
              <Menu.Separator className={SEPARATOR} />
              <PresetSubmenu label="Apply preset" presets={presets} onPick={onApplyPreset} />
              <Menu.Item className={ITEM} onClick={() => setName("")}>
                Save as preset…
              </Menu.Item>
              <PresetSubmenu label="Delete preset" presets={presets} onPick={onDeletePreset} />
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}
