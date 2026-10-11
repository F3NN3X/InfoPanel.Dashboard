import { Segmented } from "@/components/ui/segmented";
import type { PlacementDesign } from "@/lib/layout";
import { hslToHex } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { CollapsibleSection } from "./collapsible-section";

interface ZoneDesignSectionProps {
  design: PlacementDesign | undefined;
  /** The theme's accent (HSL token), shown when no override is set. */
  themeAccent: string;
  onChange: (fn: (design: PlacementDesign | undefined) => PlacementDesign) => void;
  /** Open regardless of the remembered state (a search match). */
  forceOpen?: boolean;
}

/** Search text for the section (its title and field labels). */
export const ZONE_FRAME_TERMS = [
  "Zone frame",
  "Frame accent",
  "Frame background",
  "Frame title header",
];

/**
 * "Zone frame": the zone's own frame around the widget — accent override,
 * background and title header (`placement.design`).
 */
export function ZoneDesignSection({
  design,
  themeAccent,
  onChange,
  forceOpen,
}: ZoneDesignSectionProps) {
  const set = [
    design?.accent,
    design?.background && design.background !== "none",
    design?.header,
  ].filter(Boolean).length;
  return (
    <CollapsibleSection
      id="zone-frame"
      title="Zone frame"
      aside={set > 0 ? `${set} set` : ""}
      forceOpen={forceOpen}
    >
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>Frame accent</span>
          {design?.accent && (
            <button
              onClick={() => onChange((d) => ({ ...d, accent: undefined }))}
              className="hover:text-foreground"
            >
              Use theme
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={design?.accent ?? hslToHex(themeAccent)}
            onChange={(e) =>
              onChange((d) => ({ ...d, accent: e.target.value }))
            }
            className="h-7 w-10 cursor-pointer rounded border border-border bg-transparent p-0.5"
          />
          <span className="text-xs tabular-nums text-muted-foreground">
            {design?.accent ?? "theme"}
          </span>
        </div>
      </div>

      <div>
        <div className="mb-1 text-xs text-muted-foreground">Frame background</div>
        <Segmented
          options={[
            { value: "none", label: "None" },
            { value: "panel", label: "Panel" },
            { value: "bordered", label: "Bordered" },
          ]}
          value={design?.background ?? "none"}
          onChange={(v) =>
            onChange((d) => ({
              ...d,
              background: v as PlacementDesign["background"],
            }))
          }
        />
      </div>

      <button
        onClick={() => onChange((d) => ({ ...d, header: !d?.header }))}
        className="flex w-full items-center justify-between rounded-md border border-border px-3 py-2 text-left transition-colors hover:bg-accent/40"
      >
        <span className="text-xs text-muted-foreground">Frame title header</span>
        <span
          className={cn(
            "relative h-4 w-7 rounded-full transition-colors",
            design?.header ? "bg-ring" : "bg-muted-foreground/30"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-3 w-3 rounded-full bg-background transition-all",
              design?.header ? "left-3.5" : "left-0.5"
            )}
          />
        </span>
      </button>
    </CollapsibleSection>
  );
}
