// KPI Tiles's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "tiles", name: "Tiles", view: "tiles", settings: {}, size: [6, 1], default: true },
  { id: "cards", name: "Vitals", view: "cards", blurb: "CPU, GPU, RAM and network side by side", tags: "cpu gpu ram network vitals cards", settings: {}, size: [4, 1] },
];

export default presets;
