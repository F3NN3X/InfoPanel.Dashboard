/** The inspector's Value range (spec §5): the scale a gauge reads, whether the stage labels its ends, and the sensor the previews read. */
import { SensorField } from "@/components/studio/widget-editor/sensor-field";
import type { GaugeViewPrefs } from "../use-gauge-view";
import { ToggleRow, type InspectorProps } from "./rows";
import { ScaleRows } from "./text";

export interface ValueRangeProps extends InspectorProps {
  view: GaugeViewPrefs;
  onView: (patch: Partial<GaugeViewPrefs>) => void;
  /** The sensor picker's "Open data explorer". */
  onOpenSources: () => void;
}

export function ValueRange({ g, set, view, onView, onOpenSources }: ValueRangeProps) {
  return (
    <section aria-label="Value range" className="space-y-1 border-t border-ui-subtle pt-4">
      <h3 className="pb-1 text-body font-medium text-ui-1">Value range</h3>
      <ScaleRows g={g} set={set} />
      <ToggleRow label="Show end labels" hint="In the editor preview" value={view.endLabels} onChange={(endLabels) => onView({ endLabels })} />
      <SensorField label="Preview with" hint="Only for looking: not saved with the gauge" value={view.sensor ?? undefined} onChange={(sensor) => onView({ sensor: sensor ?? null })} onOpenExplorer={onOpenSources} />
    </section>
  );
}
