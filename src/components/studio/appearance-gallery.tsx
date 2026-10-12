import { useState } from "react";
import { Menu } from "@base-ui/react/menu";
import { Image, MoreHorizontal, Plus, X } from "lucide-react";
import { isBuiltinPreset, type AppearancePreset } from "@/lib/appearance-presets";
import { cn } from "@/lib/utils";
import { useInspectorLayout } from "./inspector-layout";
import type { AppearanceTarget } from "./appearance-panel";
import { AppearancePreview } from "./appearance-preview";
import { ICON_BUTTON, ITEM, POPUP, SEPARATOR } from "./style-tools";
import type { AppearancePresetsApi } from "./use-appearance-presets";

/** An inline name input (Enter saves, Esc cancels; blur saves when `commitOnBlur`). */
function NameInput({
  initial,
  label,
  onDone,
  commitOnBlur = false,
}: {
  initial: string;
  label: string;
  onDone: (name: string | null) => void;
  commitOnBlur?: boolean;
}) {
  const [name, setName] = useState(initial);
  const commit = () => onDone(name.trim() || null);
  return (
    <input
      autoFocus
      value={name}
      onFocus={(e) => e.target.select()}
      onChange={(e) => setName(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        // Keep Esc from also stepping the studio's selection out.
        e.stopPropagation();
        if (e.key === "Enter") commit();
        if (e.key === "Escape") onDone(null);
      }}
      onBlur={commitOnBlur ? commit : undefined}
      placeholder={label}
      aria-label={label}
      className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-0.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/50 focus:border-ring"
    />
  );
}

/** The "⋯" of a saved look's card. */
function SavedLookMenu({ onRename, onDelete }: { onRename: () => void; onDelete: () => void }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className="rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground data-popup-open:bg-accent data-popup-open:text-foreground"
        title="Saved look actions"
      >
        <MoreHorizontal className="h-3 w-3" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className="z-50" sideOffset={4} align="end">
          <Menu.Popup className={POPUP}>
            <Menu.Item className={ITEM} onClick={onRename}>
              Rename…
            </Menu.Item>
            <Menu.Separator className={SEPARATOR} />
            <Menu.Item className={cn(ITEM, "text-red-400")} onClick={onDelete}>
              Delete
            </Menu.Item>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** One gallery card: preview, name, description; click applies. */
function PresetCard({
  preset,
  onApply,
  onRename,
  onDelete,
}: {
  preset: AppearancePreset;
  onApply: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const saved = !isBuiltinPreset(preset.id);
  return (
    <div className="group relative break-inside-avoid rounded-lg border border-border p-1.5 hover:border-ring/50">
      <button
        type="button"
        onClick={onApply}
        className="block w-full text-left"
        title={`Apply “${preset.name}”`}
        aria-label={`Apply appearance ${preset.name}`}
      >
        <AppearancePreview preset={preset} />
      </button>
      <div className="mt-1.5 flex min-h-5 items-center gap-1 px-0.5">
        {renaming ? (
          <NameInput
            initial={preset.name}
            label="Look name"
            commitOnBlur
            onDone={(name) => {
              setRenaming(false);
              if (name) onRename(name);
            }}
          />
        ) : (
          <button type="button" onClick={onApply} className="min-w-0 flex-1 truncate text-left text-xs text-foreground/90">
            {preset.name}
          </button>
        )}
        {preset.background && (
          <span title="Comes with a page background">
            <Image className="h-3 w-3 shrink-0 text-muted-foreground/70" />
          </span>
        )}
        {saved && !renaming && <SavedLookMenu onRename={() => setRenaming(true)} onDelete={onDelete} />}
      </div>
      <div className="line-clamp-2 px-0.5 text-[11px] leading-snug text-muted-foreground/70" title={preset.description}>
        {preset.description}
      </div>
    </div>
  );
}

/** After an apply: what still hides the look, and the one-click fix. */
function OverridesBanner({
  widgets,
  profiles,
  onFollow,
  onDismiss,
}: {
  widgets: number;
  profiles: number;
  onFollow: () => void;
  onDismiss: () => void;
}) {
  const own = (n: number, noun: string, verb: [string, string], what: string) =>
    n === 1 ? `1 ${noun} ${verb[0]} its own ${what}` : `${n} ${noun}s ${verb[1]} their own ${what}`;
  const parts = [
    widgets > 0 && own(widgets, "widget", ["keeps", "keep"], "style"),
    profiles > 0 && own(profiles, "profile", ["has", "have"], "look"),
  ].filter(Boolean);
  return (
    <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-2 text-[11px] text-foreground/85">
      <div className="min-w-0 flex-1">
        {parts.join(" · ")} —{" "}
        <button type="button" onClick={onFollow} className="font-medium text-foreground underline-offset-2 hover:underline">
          Make them follow
        </button>
      </div>
      <button type="button" onClick={onDismiss} className="text-muted-foreground hover:text-foreground" title="Dismiss">
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/**
 * The appearance presets: a gallery of whole looks (built-ins, then the
 * user's saved ones), applied to the scope of the global style card's switch.
 */
export function AppearanceGallery({ api, target }: { api: AppearancePresetsApi; target: AppearanceTarget }) {
  const dock = useInspectorLayout() === "dock";
  const [applied, setApplied] = useState(false);
  const [naming, setNaming] = useState(false);
  const [replaceBackground, setReplaceBackground] = useState(false);
  const { widgets, profiles } = api.overrides(target);
  const apply = (preset: AppearancePreset) => {
    api.apply(preset, target, replaceBackground || undefined);
    setApplied(true);
  };

  return (
    // A wide card: in the dock its cards run as a strip across every column.
    <div className="space-y-2">
      {target === "profile" && (
        <p className="text-[11px] text-muted-foreground/70">
          Here a preset gives this profile its own theme colours, corner radius, style and background; the
          other profiles keep theirs.
        </p>
      )}
      <div className={cn("grid gap-2", dock ? "grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))]" : "grid-cols-2")}>
        {api.presets.map((preset) => (
          <PresetCard
            key={preset.id}
            preset={preset}
            onApply={() => apply(preset)}
            onRename={(name) => api.rename(preset.id, name)}
            onDelete={() => api.remove(preset.id)}
          />
        ))}
      </div>
      {applied && widgets + profiles > 0 && (
        <OverridesBanner
          widgets={widgets}
          profiles={profiles}
          onFollow={() => {
            api.clearOverrides(target);
            setApplied(false);
          }}
          onDismiss={() => setApplied(false)}
        />
      )}
      <label className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <input
          type="checkbox"
          checked={replaceBackground}
          onChange={(e) => setReplaceBackground(e.target.checked)}
          className="accent-ring"
        />
        Replace the page background (otherwise only set where there is none)
      </label>
      {naming ? (
        <div className="flex items-center gap-1">
          <NameInput
            initial=""
            label="Look name"
            onDone={(name) => {
              setNaming(false);
              if (name) api.save(target, name);
            }}
          />
          <button type="button" className={ICON_BUTTON} onClick={() => setNaming(false)} title="Cancel">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setNaming(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          title="Keep the current theme, style and background as a preset"
        >
          <Plus className="h-3 w-3" />
          Save current as preset…
        </button>
      )}
    </div>
  );
}
