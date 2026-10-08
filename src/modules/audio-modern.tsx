import { ModernAudio } from "@/components/ModernAudio";
import { bySuffixOrName, groupByContainer } from "@/lib/sensors";
import type { LevelMeterVariant } from "@/components/ui/level-meter";
import type { BallisticsPreset } from "@/lib/audio/ballistics";
import type { Orientation } from "@/lib/audio/types";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

const P = "plugins.audio-level-meter.";

/**
 * Modern audio widget — per-device level metering (the AudioLevelMeter
 * plugin's dynamic containers) as name + big level % + level bar + peak
 * / L/R / volume details. One component (`ModernAudio`) picks card /
 * standard / compact / simple from the measured zone size. The classic
 * `audio` module stays untouched.
 *
 * Entries are resolved by key suffix (the AudioMeter plugin names its
 * display strings "🎵 {Device} · Level", so matching the stable key
 * suffix — `audio-level`, `peak-level`, … — is the robust lookup) with a
 * fallback to the legacy plain names.
 */

const AUDIO_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  {
    key: "source",
    label: "Source (device)",
    type: "select",
    default: "",
    optionsFrom: "sources",
    sourcePlugin: P,
  },
  {
    key: "showDetails",
    label: "Peak / RMS & L/R/volume details",
    type: "boolean",
    default: true,
  },
  { key: "showDevice", label: "Device name", type: "boolean", default: true },
  { key: "showVolume", label: "Volume bar", type: "boolean", default: false },
  { key: "showMute", label: "Mute indicator", type: "boolean", default: true },
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
  },
];

export const audioModernModule: DashboardModule = {
  id: "audiomodern",
  title: "Audio (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith(P),
  settings: AUDIO_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(audioModernModule, s);
    const groups = groupByContainer(sensors, P);
    if (groups.size === 0) return null;

    // Bind to one device (container), or show them all.
    const source = String(cfg.source ?? "");
    const entries = source
      ? groups.has(source)
        ? [[source, groups.get(source)!] as const]
        : []
      : [...groups.entries()];

    const devices = entries.map(([container, items]) => ({
      // The "default-audio" container meters the active default device;
      // label it distinctly so it doesn't read as a duplicate of that
      // device's own per-device container.
      name:
        container === "default-audio"
          ? "Default device"
          : (bySuffixOrName(items, "device-name", "Device")?.text ??
            container),
      level: bySuffixOrName(items, "audio-level", "Level")?.value,
      peak: bySuffixOrName(items, "peak-level", "Peak")?.value,
      rms: bySuffixOrName(items, "rms-level", "RMS")?.value,
      left: bySuffixOrName(items, "left-channel", "Left")?.value,
      right: bySuffixOrName(items, "right-channel", "Right")?.value,
      // Volume / mute come from the volume plugin, not the level meter.
      volume: bySuffixOrName(items, "volume", "Volume")?.value,
      muted: bySuffixOrName(items, "mute", "Mute")?.text,
    }));

    return (
      <ModernAudio
        devices={devices}
        showDetails={Boolean(cfg.showDetails)}
        showDevice={Boolean(cfg.showDevice)}
        showVolume={Boolean(cfg.showVolume)}
        showMute={Boolean(cfg.showMute)}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
        meterView={String(cfg.view) === "audiometer" ? "audiocn" : "classic"}
        meterVariant={String(cfg.meterVariant) as LevelMeterVariant}
        meterOrientation={String(cfg.meterOrientation) as Orientation}
        meterBallistics={String(cfg.meterBallistics) as BallisticsPreset}
      />
    );
  },
};
