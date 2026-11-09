// Wave Link's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "rows", name: "Rows", view: "rows", settings: {}, size: [2, 2], default: true },
  { id: "strips", name: "Strips", view: "strips", blurb: "Console strips: fader, meter and LCD", tags: "console fader channel strip", settings: {}, size: [2, 2] },
  { id: "lcd", name: "LCD", view: "lcd", blurb: "One LCD screen, a line per channel", tags: "display segment readout", settings: {}, size: [2, 2] },
];

export default presets;
