// Sensor Group's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "auto", name: "Auto", view: "auto", settings: {}, size: [2, 2], default: true },
  { id: "rows", name: "Rows", view: "rows", blurb: "Any list of values, one per row", tags: "list table", settings: {}, size: [2, 2] },
  { id: "grid", name: "Grid", view: "grid", blurb: "Any list of values as a tile grid", tags: "tiles cards", settings: {}, size: [2, 2] },
];

export default presets;
