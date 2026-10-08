import { ModernSystem } from "@/components/ModernSystem";
import { liveText, liveValue } from "@/lib/sensors";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

/**
 * Modern system widget — ring-gauge redesign of the classic system module
 * (CPU / RAM rings + bridge status). One component (`ModernSystem`) picks
 * card / standard / compact / simple from the measured zone size. The
 * classic `system` module stays untouched.
 */

const SYSTEM_MODERN_SETTINGS: ModuleSetting[] = [
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
  { key: "showStatus", label: "Bridge status", type: "boolean", default: true },
];

export const systemModernModule: DashboardModule = {
  id: "systemmodern",
  title: "System (modern)",
  minCols: 2,
  minRows: 1,
  matches: (key) => key.startsWith("system."),
  settings: SYSTEM_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(systemModernModule, s);
    const cpu = liveValue(sensors["system.cpu.load"]);
    const ram = liveValue(sensors["system.ram.load"]);
    const status = liveText(sensors["system.bridge.status"]);

    if (cpu === undefined && ram === undefined && !status) return null;

    return (
      <ModernSystem
        cpu={cpu}
        ram={ram}
        status={Boolean(cfg.showStatus) ? status : undefined}
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
