import { ModernWaveLink } from "@/components/ModernWaveLink";
import type { LevelMeterVariant } from "@/components/ui/level-meter";
import type { BallisticsPreset } from "@/lib/audio/ballistics";
import type { Orientation } from "@/lib/audio/types";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

/**
 * Wave Link widget — the Elgato app's mixer, live at device pace.
 *
 * Unlike every other module, this one claims no sensor keys: its data is
 * JSON in the `wavelink-plugin` entries, read through their own 100 ms
 * stream by the shared `wavelink` client. `prefixes` is therefore empty, and the render
 * reads only settings — the component pulls the inventory and the meters
 * from the shared `wavelink` client itself.
 */

const WAVELINK_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
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
  { key: "liveColor", label: "Live indicator color", type: "color", default: "", group: "Meter" },
  { key: "muteColor", label: "Muted / offline color", type: "color", default: "", group: "Meter" },
];

export const wavelinkModernModule: DashboardModule = {
  id: "wavelinkmodern",
  title: "Wave Link (modern)",
  minCols: 2,
  minRows: 1,
  // No sensor keys — the data comes from the shared wavelink-plugin stream.
  prefixes: [],
  settings: WAVELINK_SETTINGS,
  render: (_sensors, s) => {
    const cfg = effectiveSettings(wavelinkModernModule, s);
    return (
      <ModernWaveLink
        source={String(cfg.source ?? "")}
        showReadout={Boolean(cfg.showReadout)}
        showFader={Boolean(cfg.showFader)}
        showMixes={Boolean(cfg.showMixes)}
        liveColor={String(cfg.liveColor ?? "")}
        muteColor={String(cfg.muteColor ?? "")}
        layout={String(cfg.layout) as
          | "auto"
          | "card"
          | "standard"
          | "compact"
          | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
        meterVariant={String(cfg.meterVariant) as LevelMeterVariant}
        meterOrientation={String(cfg.meterOrientation) as Orientation}
        meterBallistics={String(cfg.meterBallistics) as BallisticsPreset}
      />
    );
  },
};
