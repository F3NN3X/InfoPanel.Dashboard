// Countdown's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "inline", name: "Inline", view: "inline", settings: {}, size: [4, 2], default: true },
  { id: "tiles", name: "Tiles", view: "tiles", blurb: "Each unit in its own box", settings: {}, size: [4, 2] },
  { id: "big", name: "Big number", view: "big", blurb: "One large number", settings: {}, size: [4, 2] },
];

export default presets;
