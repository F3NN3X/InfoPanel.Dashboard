// Status Bar's presets: the views the Add panel offered, as named bundles (studio only, see _docs/widgets/FORMAT.md).
import type { WidgetPreset } from "../define";

const presets: readonly WidgetPreset[] = [
  { id: "edge", name: "Edge", view: "edge", settings: {}, size: [12, 1], default: true },
  { id: "pill", name: "Pill", view: "pill", blurb: "A floating capsule", tags: "capsule rounded", settings: {}, size: [12, 1] },
  { id: "islands", name: "Islands", view: "islands", blurb: "Each slot in its own pill", tags: "waybar separate", settings: {}, size: [12, 1] },
  { id: "meters", name: "Meters", view: "meters", blurb: "A wide pill: double rings with thin-bar rows", tags: "cpu gpu fps rings bars load temperature", settings: { left: "cpuDual", center: "gpuDual", right: "fps,frameTime", separators: false }, size: [12, 1] },
  { id: "orbit", name: "Orbit", view: "orbit", blurb: "A pill with a load ring at each end", tags: "cpu gpu fps rings load temperature power", settings: { left: "cpuRing", center: "fps", right: "gpuRing", separators: false }, size: [12, 1] },
  { id: "ticker", name: "Ticker", view: "ticker", blurb: "One long line: CPU, GPU, FPS and the time", tags: "cpu gpu fps text load temperature clock", settings: { left: "", center: "cpuLine,gpuLine,fpsLine,time", right: "", separators: true }, size: [12, 1] },
];

export default presets;
