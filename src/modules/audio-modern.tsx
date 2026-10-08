import { ModernAudio } from "@/components/ModernAudio";
import { byName, groupByContainer } from "@/lib/sensors";
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
 */

const AUDIO_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
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
      />
    );
  },
};
