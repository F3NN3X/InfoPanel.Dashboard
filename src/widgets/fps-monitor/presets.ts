// FPS Monitor's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "frametime", name: "Frame-time graph", view: "frametime", settings: {}, size: [3, 2], default: true },
  { id: "gauge", name: "Gauge", view: "gauge", blurb: "Frame rate on a ring with 1% low", tags: "ring dial", settings: { sparkline: false }, size: [3, 2] },
  { id: "trend", name: "Trend", view: "trend", blurb: "Frame rate ring with a trend sparkline", tags: "ring sparkline history", settings: { sparkline: true }, size: [3, 2] },
  { id: "pacing", name: "Frame pacing", view: "pacing", blurb: "Frame-time graph with budget lines", tags: "stutter fps frametime budget", settings: {}, size: [4, 2], minSize: [2, 1] },
];

export default presets;
