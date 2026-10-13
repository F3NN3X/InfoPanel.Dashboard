import { templateModule } from "@/widgets/module";
import WaveLink, { meta, type WaveLinkProps } from "@/widgets/WaveLink";
import { ballisticsOf } from "./audio-modern";
import type { ModuleSetting, ModuleSettings } from "./types";

/**
 * Wave Link widget — the Elgato app's mixer, live at device pace. Rendered
 * by the `WaveLink` template through the widget shell.
 *
 * Unlike every other module, this one claims no sensor keys: its data is
 * JSON in the `wavelink-plugin` entries, read through their own 100 ms
 * stream by the shared `wavelink` client (`useWavelinkState` /
 * `useWavelinkMeter`). `prefixes` is therefore empty and the sensors are
 * not read at all.
 */

export const WAVELINK_SETTINGS: ModuleSetting[] = [
  {
    key: "source",
    label: "Meters to show",
    type: "select",
    default: "",
    multiple: true,
    optionsFrom: "wavelink",
    group: "Content",
  },
  {
    key: "showReadout",
    label: "dB readouts & scale",
    type: "boolean",
    default: true,
    group: "Content",
  },
  {
    key: "showFader",
    label: "Fader level",
    type: "boolean",
    default: true,
    group: "Content",
  },
  {
    key: "showMixes",
    label: "Mixes (routes & output mixers)",
    type: "boolean",
    default: true,
    group: "Content",
  },
  {
    key: "meterVariant",
    label: "Meter style",
    type: "select",
    default: "solid",
    options: [
      { value: "solid", label: "Solid" },
      { value: "segmented", label: "Segmented" },
      { value: "gradient", label: "Gradient" },
    ],
    group: "Meter",
  },
  {
    key: "meterOrientation",
    label: "Meter orientation",
    type: "select",
    default: "vertical",
    options: [
      { value: "vertical", label: "Vertical" },
      { value: "horizontal", label: "Horizontal" },
    ],
    group: "Meter",
  },
  {
    key: "meterBallistics",
    label: "Meter response",
    type: "select",
    default: "peak",
    options: [
      { value: "peak", label: "Peak (fast attack, peak-hold)" },
      { value: "vu", label: "VU (slow)" },
      { value: "instant", label: "Instant" },
    ],
    group: "Meter",
  },
  { key: "liveColor", label: "Live indicator color", type: "color", default: "", group: "Meter", advanced: true },
  { key: "muteColor", label: "Muted / offline color", type: "color", default: "", group: "Meter", advanced: true },
];

/** The colour the legacy widget metered in (`--meter-ok`). */
export const LEGACY_METER_OK = "oklch(0.72 0.12 200)";

export const wavelinkToProps = (s: ModuleSettings): Partial<WaveLinkProps> => ({
  source: String(s.source ?? ""),
  showReadout: Boolean(s.showReadout),
  showFader: Boolean(s.showFader),
  showMixes: Boolean(s.showMixes),
  meterVariant: s.meterVariant === "segmented" ? "segmented" : s.meterVariant === "gradient" ? "gradient" : "solid",
  meterOrientation: s.meterOrientation === "horizontal" ? "horizontal" : "vertical",
  ballistics: ballisticsOf(s),
  liveColor: String(s.liveColor ?? ""),
  muteColor: String(s.muteColor ?? ""),
});

export const wavelinkModernModule = templateModule({
  meta,
  Component: WaveLink,
  settings: WAVELINK_SETTINGS,
  // The legacy meter's teal safe zone.
  toProps: (s) => ({ ...wavelinkToProps(s), levelColor: LEGACY_METER_OK }),
  // No sensor keys — the data comes from the shared wavelink-plugin stream.
  alias: { id: "wavelinkmodern", title: "Wave Link (modern)", minCols: 2, minRows: 1, prefixes: [] },
});
