import { Play } from "lucide-react";
import type { Severity } from "@/lib/alerts";
import { islandBus } from "@/lib/island/bus";
import {
  ISLAND_COLLAPSE_MAX,
  ISLAND_DEFAULTS,
  ISLAND_LABEL_MAX,
  ISLAND_OFFSET_MAX,
  type IslandConfig,
  type IslandIdle,
  type IslandSize,
  type IslandTint,
} from "@/lib/island/config";
import { SegmentedRow, SliderRow, TextRow, ToggleRow } from "../setting-rows";
import { SensorField } from "../widget-editor/sensor-field";

const IDLE_OPTIONS: { value: IslandIdle; label: string; title?: string }[] = [
  { value: "time", label: "Time" },
  { value: "time-date", label: "+ Date" },
  { value: "sensor", label: "+ Sensor", title: "The time and one live value" },
  { value: "hidden", label: "Hidden", title: "Only shows while there is something to show" },
];
const SIZE_OPTIONS: { value: IslandSize; label: string }[] = [
  { value: "s", label: "S" },
  { value: "m", label: "M" },
  { value: "l", label: "L" },
];
const TINT_OPTIONS: { value: IslandTint; label: string; title?: string }[] = [
  { value: "black", label: "Black" },
  { value: "theme", label: "Theme", title: "The theme's card colour" },
];

/** The bus source of the studio's preview notices. */
export const PREVIEW_SOURCE = "preview";
const PREVIEW: { severity: Severity; title: string; body: string }[] = [
  { severity: "info", title: "Preview", body: "An info notice opens for 4 s" },
  { severity: "warning", title: "GPU temperature high", body: "84 °C" },
  { severity: "critical", title: "Plugin stopped reporting", body: "Stopped reporting" },
];
let previewAt = 0;

interface IslandSectionProps {
  island: IslandConfig | undefined;
  onChange: (patch: Partial<IslandConfig>) => void;
  /** The sensor picker's "Open data explorer". */
  onOpenExplorer: () => void;
}

/**
 * Dashboard › Profile › Dynamic Island: the pill at the top centre of the profile. Alert rules
 * reach it by picking the Island display style, widgets by their "Send to island" setting.
 */
export function IslandSection({ island, onChange, onOpenExplorer }: IslandSectionProps) {
  const v = island ?? { ...ISLAND_DEFAULTS, enabled: false };
  // Plays on the canvas only (the studio's own bus); each press shows the next severity.
  const preview = () => {
    const i = previewAt++ % PREVIEW.length;
    islandBus.notify({ source: PREVIEW_SOURCE, id: `p${i}`, ...PREVIEW[i], ttl: 4000 });
  };
  return (
    <div className="space-y-3">
      <ToggleRow
        label="Show Dynamic Island"
        hint="A pill at the top centre of the profile with the time, alerts and live activities"
        value={v.enabled}
        onChange={(enabled) => onChange({ enabled })}
      />
      {v.enabled && (
        <>
          <SegmentedRow label="When idle" options={IDLE_OPTIONS} value={v.idle} onChange={(idle) => onChange({ idle: idle as IslandIdle })} />
          {v.idle === "sensor" && (
            <>
              <SensorField
                label="Sensor"
                value={v.sensorKey || undefined}
                onChange={(key) => onChange({ sensorKey: key ?? "" })}
                onOpenExplorer={onOpenExplorer}
              />
              <TextRow
                label="Label"
                hint={`Before the value, up to ${ISLAND_LABEL_MAX} characters`}
                value={v.sensorLabel}
                placeholder="GPU"
                onChange={(text) => onChange({ sensorLabel: text.slice(0, ISLAND_LABEL_MAX) })}
              />
            </>
          )}
          <SegmentedRow label="Size" options={SIZE_OPTIONS} value={v.size} onChange={(size) => onChange({ size: size as IslandSize })} />
          <SegmentedRow label="Color" options={TINT_OPTIONS} value={v.tint} onChange={(tint) => onChange({ tint: tint as IslandTint })} />
          <SliderRow
            label="Offset from top"
            value={v.offsetY}
            min={0}
            max={ISLAND_OFFSET_MAX}
            unit="px"
            fallback={ISLAND_DEFAULTS.offsetY}
            onChange={(offsetY) => onChange({ offsetY })}
          />
          <ToggleRow
            label="Reserve space"
            hint="Start the zones under the island instead of overlaying the top row"
            value={v.reserve}
            onChange={(reserve) => onChange({ reserve })}
          />
          <SliderRow
            label="Collapse alerts after"
            hint="For screens without touch: alerts that stay until tapped shrink to a badge after this many seconds. 0 = stay open until tapped."
            value={v.collapseAfter}
            min={0}
            max={120}
            step={5}
            unit="s"
            fallback={0}
            onChange={(collapseAfter) => onChange({ collapseAfter: Math.min(ISLAND_COLLAPSE_MAX, collapseAfter) })}
          />
          <button
            type="button"
            onClick={preview}
            className="flex h-[28px] items-center gap-1.5 rounded-[6px] border border-ui-default px-2.5 text-[12px] text-ui-2 hover:bg-ui-hover hover:text-ui-1"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Preview an alert
          </button>
          <p className="text-[11px] leading-snug text-ui-5">
            Alert rules show here when their display style is Island; widgets with “Send to island” on add their
            notices and live activity on the kiosk. On the canvas the island plays only test alerts and previews.
          </p>
        </>
      )}
    </div>
  );
}
