// Steam Friends's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "list", name: "List", view: "list", settings: {}, size: [2, 2], default: true },
  { id: "table", name: "Table", view: "table", blurb: "Friends in columns: status, game, last seen", tags: "columns grid", settings: {}, size: [2, 2] },
];

export default presets;
