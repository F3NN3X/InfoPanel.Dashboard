// Thermals's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "bars", name: "Bars", view: "bars", settings: {}, size: [2, 2], default: true },
  { id: "gauges", name: "Temp gauges", view: "gauges", blurb: "Hottest four as rings, fans under them", tags: "ring dial fan rpm", settings: {}, size: [2, 2] },
];

export default presets;
