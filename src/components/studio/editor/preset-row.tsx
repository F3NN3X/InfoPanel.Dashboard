import { FOCUS_RING } from "@/components/ui/button";
import { onRovingKeyDown } from "@/lib/roving";
import { cn } from "@/lib/utils";
import type { DashboardModule, ModuleSettings } from "@/modules/types";
import { iconFor } from "@/widgets/core/icons";
import { currentView, viewChange, viewsOf } from "./view-presets";

interface PresetRowProps {
  mod: DashboardModule;
  settings: ModuleSettings | undefined;
  /** One undo step. */
  onPick: (patch: ModuleSettings, clear: string[]) => void;
  /** Keep the widget's own style (Style tab › Save); unset when it has none. */
  onSaveStyle?: () => void;
}

/**
 * The inspector's Preset row (D-5, Q24): the widget's views as tiles, reading and writing `settings[viewKey]`, so a
 * placement's view id never changes. Saved styles are another list and stay under Style; the link goes there.
 */
export default function PresetRow({ mod, settings, onPick, onSaveStyle }: PresetRowProps) {
  const views = viewsOf(mod);
  const current = currentView(mod, settings);
  const Icon = iconFor(mod.icon);
  return (
    <section data-testid="inspector-presets" className="flex flex-col gap-2 border-b border-ui-subtle px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-medium text-ui-3">Preset</span>
        {onSaveStyle && (
          <button type="button" onClick={onSaveStyle} className={cn("rounded-ui-sm text-caption text-ui-accent-text hover:underline", FOCUS_RING)}>
            Save as style
          </button>
        )}
      </div>
      <div role="radiogroup" aria-label="Preset" onKeyDown={(e) => onRovingKeyDown(e, '[role="radio"]')} className="grid grid-cols-3 gap-2">
        {views.map((v) => {
          const on = v.id === current;
          return (
            <button
              key={v.id}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              title={v.blurb}
              onClick={() => {
                if (on) return;
                const { patch, clear } = viewChange(mod, v.id, settings);
                onPick(patch, clear);
              }}
              className={cn(
                "flex h-16 min-w-0 flex-col items-center justify-center gap-1.5 rounded-ui-lg border px-1 transition-colors duration-(--ui-dur-fast) ease-ui",
                FOCUS_RING,
                on ? "border-ui-accent text-ui-1" : "border-ui-subtle text-ui-3 hover:border-ui-strong hover:text-ui-1"
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", on ? "text-ui-accent" : "text-ui-hint")} strokeWidth={1.75} aria-hidden />
              <span className="max-w-full truncate text-micro">{v.name}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
