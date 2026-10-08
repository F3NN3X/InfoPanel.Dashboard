import { ModernAudio } from "@/components/ModernAudio";
import { byName, groupByContainer } from "@/lib/sensors";
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
 */

const AUDIO_MODERN_SETTINGS: ModuleSetting[] = [
  {
    key: "layout",
    label: "Layout",
    type: "select",
    default: "auto",
    options: [
      { value: "auto", label: "Auto (fit to zone)" },
      { value: "card", label: "Card" },
      { value: "standard", label: "Standard" },
      { value: "compact", label: "Compact bar" },
      { value: "simple", label: "Simple" },
    ],
  },
  {
    key: "surface",
    label: "Surface",
    type: "select",
    default: "glass",
    options: [
      { value: "glass", label: "Glass" },
      { value: "matte-light", label: "Matte (light)" },
      { value: "matte-dark", label: "Matte (dark)" },
    ],
  },
  {
    key: "showDetails",
    label: "Peak / RMS & L/R/volume details",
    type: "boolean",
    default: true,
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

    const devices = [...groups.entries()].map(([container, items]) => ({
      name: byName(items, "Device")?.text ?? container,
      level: byName(items, "Level")?.value,
      peak: byName(items, "Peak")?.value,
      rms: byName(items, "RMS")?.value,
      left: byName(items, "Left")?.value,
      right: byName(items, "Right")?.value,
      volume: byName(items, "Volume")?.value,
      muted: byName(items, "Mute")?.text,
    }));

    return (
      <ModernAudio
        devices={devices}
        showDetails={Boolean(cfg.showDetails)}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
      />
    );
  },
};
