// Now Playing's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "card", name: "Card", view: "card", settings: {}, size: [3, 1], default: true },
  { id: "vinyl", name: "Vinyl", view: "vinyl", blurb: "The cover on a spinning record", tags: "record turntable lp", settings: {}, size: [3, 1] },
  { id: "backdrop", name: "Backdrop", view: "backdrop", blurb: "Track over its blurred cover art", tags: "background blur", settings: {}, size: [3, 1] },
  { id: "wave", name: "Wave", view: "wave", blurb: "Track with a waveform progress line", tags: "waveform visualizer", settings: {}, size: [3, 1] },
];

export default presets;
