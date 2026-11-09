// GPU Monitor's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "monitor", name: "Monitor", view: "monitor", settings: {}, size: [3, 2], default: true },
  { id: "rings", name: "Rings", view: "rings", blurb: "GPU load, VRAM and temperature as rings", tags: "donut radial legend", settings: {}, size: [3, 2] },
];

export default presets;
