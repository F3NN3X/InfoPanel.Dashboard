import { ArrowRight } from "lucide-react";
import { FOCUS_RING } from "@/components/ui/button";
import type { AppearancePreset } from "@/lib/appearance-presets";
import { cn } from "@/lib/utils";
import { LookThumb } from "./look-thumb";

export interface QuickTheme {
  id: string;
  name: string;
  preset: AppearancePreset;
}

interface ThemeChangesProps {
  /** "1 change from Field Kit", or "Matches Field Kit". */
  line: string;
  /** What changed ("Colors · Corners"). */
  what: string;
  /** Whether anything differs (the dot is filled and Reset is offered). */
  changed: boolean;
  /** Reset to ‹name›. */
  reset?: { name: string; onReset: () => void };
  /** A few themes to try, applied on a click. */
  quick: readonly QuickTheme[];
  onQuick: (theme: QuickTheme) => void;
  /** All N: Browse themes. */
  allCount: number;
  onAll: () => void;
}

/** Under the preview: what changed from the theme, with Reset, and a quick switch to other themes (a click applies it, with Undo in the toast). */
export function ThemeChanges({ line, what, changed, reset, quick, onQuick, allCount, onAll }: ThemeChangesProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1 text-body">
      <p data-testid="theme-changes" className="flex min-w-0 items-center gap-2 text-ui-2">
        <span aria-hidden className={cn("h-[7px] w-[7px] shrink-0 rounded-full", changed ? "bg-ui-accent" : "border border-ui-hint")} />
        <span className="text-ui-1">{line}</span>
        {what && <span className="truncate text-ui-3">{what}</span>}
      </p>
      {reset && changed && (
        <button type="button" onClick={reset.onReset} className={cn("rounded-ui-sm text-ui-2 hover:text-ui-1 hover:underline", FOCUS_RING)}>
          Reset to {reset.name}
        </button>
      )}
      <span className="ml-auto" />
      {quick.length > 0 && (
        <div role="group" aria-label="Try another theme" className="flex items-center gap-2">
          <span className="text-caption text-ui-3">Try another</span>
          {quick.map((t) => (
            <button
              key={t.id}
              type="button"
              title={t.name}
              aria-label={`Apply ${t.name}`}
              onClick={() => onQuick(t)}
              className={cn("overflow-hidden rounded-ui-sm border border-ui-subtle hover:border-ui-hover-edge", FOCUS_RING)}
            >
              <LookThumb preset={t.preset} width={56} />
            </button>
          ))}
          <button type="button" onClick={onAll} className={cn("flex items-center gap-1 rounded-ui-sm text-caption text-ui-2 hover:text-ui-1", FOCUS_RING)}>
            All {allCount}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      )}
    </div>
  );
}
