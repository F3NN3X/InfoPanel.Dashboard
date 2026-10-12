import { Segmented } from "@/components/ui/segmented";
import type { StyleMode } from "@/lib/style-resolve";

const MODES = [
  { value: "follow" as const, label: "Follow global", title: "Use the dashboard / profile style only" },
  { value: "custom" as const, label: "Custom", title: "This widget's own look overrides the global style" },
];

/**
 * Colors & surface › Look: follow the global style or keep a custom look.
 * The widget's own values stay stored either way; the Style tab's banner
 * explains what following (or a forced global style) means.
 */
export function StyleModeBar({
  mode,
  onMode,
}: {
  /** The placement's `styleMode` (unset counts as custom). */
  mode: StyleMode | undefined;
  onMode: (mode: StyleMode) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-[12.5px] text-ui-2">Look</div>
      <Segmented
        options={MODES}
        value={mode === "follow" ? "follow" : "custom"}
        onChange={onMode}
        label="Look"
        className="w-full *:flex-1"
      />
    </div>
  );
}
