// What the inspector needs to know about each template widget beyond its settings (widget settings v2):
// whether it draws a header, what it draws in small zones, the units and thresholds it renders (its schema has
// one Units & format / Thresholds row each; checked against what each renderer draws) and its look subset.
import type { CompactShape, DashboardModule, ModuleSetting } from "@/modules/types";
import { CARD, NONE } from "../define";

export type InspectorMeta = Required<Pick<DashboardModule, "header" | "compact">> &
  Pick<DashboardModule, "fmt" | "thr" | "styleSubset" | "noData" | "byView">;

const yes = (compact: CompactShape, more: Omit<InspectorMeta, "header" | "compact"> = {}): InspectorMeta => ({ header: "yes", compact, ...more });

/** Every group widget, by id; a folder widget (`src/widgets/<kebab-id>/widget.ts`) carries its own `inspector`. */
export const INSPECTOR_META: Record<string, InspectorMeta> = {
  // Group B: storage, network, info, generic
  SensorValue: yes(CARD, { fmt: ["decimals"], thr: ["value"] }),
  CustomGauge: yes(NONE),
};

/**
 * A widget's Fit rows for its small-zone shape (SPEC §4.6): Small zones
 * without the choices it cannot draw (Card without a summary card, Dense
 * without a dense view); with only Auto / Full left the row goes and
 * Density stops being a More row.
 */
export function fitSettings(defs: ModuleSetting[], compact: CompactShape): ModuleSetting[] {
  const drawn = (value: string) => (value === "card" ? compact.card : value === "dense" ? compact.dense !== false : true);
  const row = defs.find((d) => d.key === "compact");
  const options = row?.options?.filter((o) => drawn(o.value)) ?? [];
  const keep = options.length > 2;
  return defs.flatMap((d): ModuleSetting[] => {
    if (d === row) return keep ? [{ ...d, options }] : [];
    if (d.key === "sizeTier" && !keep) return [{ ...d, more: false }];
    return [d];
  });
}
