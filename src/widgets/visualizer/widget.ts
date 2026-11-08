// Visualizer: an animated audio visualiser. What the registry needs; the component is its own chunk.
import type { ModuleSettings } from "@/modules/types";
import { DENSE, defineWidget } from "../define";
import { audioFlowSetting, autoCount, flowOfSettings, opts, pickedDevicesOf } from "../shared/audio-settings";
import { boolSetting, colorSetting, devicesSetting, enumSetting, numberOf, numberSetting, oneOf, pick, stringOf } from "../shared/settings-kit";
import { VIZ_DYNAMICS_GROUP, vizColorRows, vizColorSettings, vizDynamicsSettings, vizLookOf, vizShapeSettings } from "../shared/viz-settings";
import { meta } from "./meta";
import type { VisualizerProps } from "./Visualizer";

const VIZ_MODES = ["bars", "mirror", "radial", "wave", "blob", "dots", "line", "scroll"] as const;
const SPECTRUM = "Spectrum";
/** The colour rows (its colour 1 is `ramp`); Sensitivity and Auto gain stay out of More. */
const VIZ_COLOR_ROWS = vizColorRows("ramp");
const DYNAMICS = vizDynamicsSettings();
const AUTO_GAIN = DYNAMICS.find((d) => d.key === "vizAutoGain")!;

export default defineWidget({
  meta,
  // A dense view only.
  inspector: { header: "yes", compact: DENSE },
  settings: [
    enumSetting("mode", "Style", "bars", opts(VIZ_MODES), { group: SPECTRUM }),
    numberSetting("bands", "Bands (0 = auto)", 0, { min: 0, max: 64, step: 1, group: SPECTRUM }),
    boolSetting("peaks", "Peak caps", true, { group: SPECTRUM }),
    ...vizShapeSettings("mode").map((d) => ({ ...d, group: SPECTRUM, more: true })),
    ...vizColorSettings(colorSetting("ramp", "Color")).map((d) => ({ ...d, ...VIZ_COLOR_ROWS[d.key] })),
    devicesSetting("Audio devices (none = loudest)", "audio", { group: "Audio device" }),
    audioFlowSetting("Audio device"),
    numberSetting("sensitivity", "Sensitivity", 1.4, { min: 0.2, max: 4, step: 0.1, group: VIZ_DYNAMICS_GROUP, tab: "behaviour" }),
    { ...AUTO_GAIN, more: false },
    ...DYNAMICS.filter((d) => d !== AUTO_GAIN),
  ],
  render: {
    load: () => import("./Visualizer"),
    // the level meters' spectrum, read from `data` (not owned)
    reads: ["plugins.audio-level-meter."],
    toProps: (s: ModuleSettings, saved?: ModuleSettings): Partial<VisualizerProps> => ({
      ...pick<VisualizerProps>(["peaks"])(s),
      vizLook: vizLookOf(s, saved),
      mode: oneOf(s.mode, VIZ_MODES),
      devices: pickedDevicesOf(s, "devices"),
      flow: flowOfSettings(s),
      bands: autoCount(s.bands),
      ramp: stringOf(s.ramp),
      sensitivity: numberOf(s.sensitivity),
    }),
  },
  // Migrations and sample stay central (the default): the sample is src/widgets/__fixtures__/snapshot.json, with no
  // widget-qa demo settings.
});
