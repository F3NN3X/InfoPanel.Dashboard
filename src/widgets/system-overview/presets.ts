// System Overview's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "panel", name: "Panel", view: "panel", settings: {}, size: [5, 2], default: true },
  { id: "graphs", name: "Graphs", view: "graphs", blurb: "One sparkline row per metric", settings: {}, size: [4, 3] },
  { id: "gauges", name: "Gauges", view: "gauges", blurb: "Open-arc dials per metric", settings: {}, size: [4, 3] },
];

export default presets;
