// Service Health's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "list", name: "List", view: "list", settings: {}, size: [2, 2], default: true },
  { id: "pills", name: "Pills", view: "pills", blurb: "Every data source as a status pill", tags: "chips badges compact", settings: {}, size: [2, 2] },
];

export default presets;
