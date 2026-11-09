// Audio Meter's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "single", name: "One device", view: "single", settings: {}, size: [2, 1], default: true },
  { id: "bridge", name: "All devices", view: "bridge", blurb: "A meter bridge for every audio device", tags: "bridge mixer devices", settings: {}, size: [3, 2] },
];

export default presets;
