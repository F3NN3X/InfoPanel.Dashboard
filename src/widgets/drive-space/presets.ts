// Drive Space's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "list", name: "List", view: "list", settings: {}, size: [2, 2], default: true },
  { id: "segments", name: "Segments", view: "segments", blurb: "Segmented fill bar per drive", settings: {}, size: [4, 3] },
  { id: "bars", name: "Bars", view: "bars", blurb: "Slim fill bar per drive", settings: {}, size: [4, 3] },
];

export default presets;
