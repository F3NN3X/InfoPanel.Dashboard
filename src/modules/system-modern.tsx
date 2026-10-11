import { ModernSystem } from "@/components/ModernSystem";
import { liveValue } from "@/lib/sensors";
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

/**
 * Modern system widget — ring-gauge redesign of the classic system module
 * (CPU / RAM rings). One component (`ModernSystem`) picks
 * card / standard / compact / simple from the measured zone size.
 */

const SYSTEM_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  { key: "sparkline", label: "Trend sparkline", type: "boolean", default: false },
  {
    key: "view",
    label: "View",
    type: "select",
    default: "rings",
    options: [
      { value: "rings", label: "Rings" },
      { value: "trends", label: "Trends", applies: { sparkline: true } },
    ],
  },
];

export const systemModernModule: DashboardModule = {
  id: "systemmodern",
  title: "System (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: ["system.cpu.", "system.ram."],
  settings: SYSTEM_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(systemModernModule, s);
    const cpu = liveValue(sensors["system.cpu.load"]);
    const ram = liveValue(sensors["system.ram.load"]);

    if (cpu === undefined && ram === undefined) return null;

    return (
      <ModernSystem
        cpu={cpu}
        ram={ram}
        sparkline={Boolean(cfg.sparkline)}
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
