import { Segmented } from "@/components/ui/segmented";
import type { StyleMode } from "@/lib/style-resolve";

const MODES = [
  { value: "follow" as const, label: "Follow global", title: "Use the dashboard / profile style only" },
  { value: "custom" as const, label: "Custom", title: "This widget's own look overrides the global style" },
];

/**
 * The top of a widget's Style tab: follow the global style or keep a
 * custom look. Following (or a forced global style) shows the look rows
 * read-only; "Customize" switches back to custom. The widget's own values
 * stay stored either way.
 */
export function StyleModeBar({
  mode,
  enforced,
  onMode,
}: {
  /** The placement's `styleMode` (unset counts as custom). */
  mode: StyleMode | undefined;
  /** The global style is forced on every widget of the profile. */
  enforced: boolean;
  onMode: (mode: StyleMode) => void;
}) {
  const value = mode === "follow" ? "follow" : "custom";
  return (
    <div className="space-y-1.5">
      <Segmented options={MODES} value={value} onChange={onMode} className="w-full *:flex-1" />
      {enforced ? (
        <p className="text-[11px] text-muted-foreground/70">
          The global style is forced on every widget (Appearance); this widget&apos;s own look is
          kept but not shown.
        </p>
      ) : value === "follow" ? (
        <p className="text-[11px] text-muted-foreground/70">
          Takes the global style (Appearance); its own look is kept but not shown.{" "}
          <button
            type="button"
            className="text-foreground underline-offset-2 hover:underline"
            onClick={() => onMode("custom")}
          >
            Customize
          </button>
        </p>
      ) : null}
    </div>
  );
}
