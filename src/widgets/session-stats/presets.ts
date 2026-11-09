// Session Stats's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "stats", name: "Stats", view: "stats", settings: {}, size: [4, 3], default: true },
  { id: "lanes", name: "Threshold timeline", view: "lanes", blurb: "Green, amber and red lanes over minutes", tags: "timeline history lanes threshold heat strip status minutes", settings: {}, size: [4, 2] },
];

export default presets;
