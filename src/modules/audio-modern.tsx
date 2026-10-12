import { templateModule } from "@/widgets/module";
import AudioModern, { meta, type AudioModernProps } from "@/widgets/AudioModern";
import type { BallisticsPreset } from "@/lib/audio/ballistics";
import type { ModuleSetting, ModuleSettings } from "./types";

const P = "plugins.audio-level-meter.";

/**
 * Modern audio widget — per-device level metering (the AudioLevelMeter
 * plugin's dynamic containers). Rendered through the widget shell: the
 * `view` setting picks the template (meter → AudioMeter, audiometer →
 * MeterBridge, volume → VolumeMixer, see `widgets/AudioModern.tsx`).
 */

export const AUDIO_MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "source",
    label: "Source (device)",
    type: "select",
    default: "",
    optionsFrom: "sources",
    sourcePlugin: P,
    group: "Content",
  },
  {
    key: "view",
    label: "View",
    type: "select",
    default: "meter",
    options: [
      { value: "meter", label: "Level meter" },
      {
        value: "audiometer",
        label: "Pro level meter (dB)",
        applies: { showDetails: true, showDevice: true },
      },
      {
        value: "volume",
        label: "Volume control",
        applies: {
          showVolume: true,
          showMute: true,
          showDevice: true,
          showDetails: false,
        },
      },
    ],
    group: "Content",
  },
  { key: "showDevice", label: "Device name", type: "boolean", default: true, group: "Content" },
  {
    key: "showDetails",
    label: "Peak / RMS & L/R/volume details",
    type: "boolean",
    default: true,
    group: "Content",
  },
  { key: "showVolume", label: "Volume bar", type: "boolean", default: false, group: "Content" },
  { key: "showMute", label: "Mute indicator", type: "boolean", default: true, group: "Content" },
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
    default: "horizontal",
    options: [
      { value: "horizontal", label: "Horizontal" },
      { value: "vertical", label: "Vertical" },
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
  { key: "levelColor", label: "Level bar color", type: "color", default: "", group: "Meter", advanced: true },
  { key: "hotColor", label: "Hot level color", type: "color", default: "", group: "Meter", advanced: true },
];

/** The settings a template zone of AudioMeter / MeterBridge / VolumeMixer gets: the legacy keys whose meaning is the same. */
export const audioSettings = (...keys: string[]): ModuleSetting[] => keys.map((k) => AUDIO_MODERN_SETTINGS.find((s) => s.key === k)!);

/** The stored `meterBallistics` (a select: peak / vu / instant). */
export const ballisticsOf = (s: ModuleSettings): BallisticsPreset => (s.meterBallistics === "vu" ? "vu" : s.meterBallistics === "instant" ? "instant" : "peak");

export const audioToProps = (s: ModuleSettings): Partial<AudioModernProps> => ({
  view: s.view === "audiometer" ? "audiometer" : s.view === "volume" ? "volume" : "meter",
  source: String(s.source ?? ""),
  showDevice: Boolean(s.showDevice),
  showDetails: Boolean(s.showDetails),
  showVolume: Boolean(s.showVolume),
  showMute: Boolean(s.showMute),
  meterVariant: s.meterVariant === "segmented" ? "segmented" : s.meterVariant === "gradient" ? "gradient" : "solid",
  meterOrientation: s.meterOrientation === "vertical" ? "vertical" : "horizontal",
  meterBallistics: ballisticsOf(s),
  levelColor: String(s.levelColor ?? ""),
  hotColor: String(s.hotColor ?? ""),
});

export const audioModernModule = templateModule({
  meta,
  Component: AudioModern,
  settings: AUDIO_MODERN_SETTINGS,
  toProps: audioToProps,
  // The volume plugin's volume / mute entries are read without being owned.
  prefixes: ["plugins.volume-plugin."],
  legacy: { id: "audiomodern", minCols: 2, minRows: 1, prefixes: [P], libraryHidden: true },
});
