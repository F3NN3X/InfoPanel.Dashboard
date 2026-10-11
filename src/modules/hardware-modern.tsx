import { ModernHardware, type ModernHardwareRow } from "@/components/ModernHardware";
import { liveText, liveValue } from "@/lib/sensors";
import { chromeOf, GROUP_COLORS, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
  type SensorMap,
} from "./types";

/**
 * Modern hardware widget — key readings from the LibreHardwareMonitor /
 * HWiNFO exports (the `libre.*` and `hwinfo.*` sensor keys) as a modern
 * list with kind-colored dots (temp / fan / power). One component
 * (`ModernHardware`) picks card / standard / compact / simple from the
 * measured zone size.
 */

const HARDWARE_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  {
    key: "maxRows",
    label: "Max rows (0 = all)",
    type: "number",
    default: 12,
    min: 0,
    max: 100,
    step: 2,
  },
  {
    key: "view",
    label: "View",
    type: "select",
    default: "list",
    options: [
      { value: "list", label: "Reading list" },
      { value: "temps", label: "Temp gauges", applies: { showFans: true } },
    ],
  },
  { key: "showFans", label: "Fan readings", type: "boolean", default: true },
  { key: "tempColor", label: "Temperature dot color", type: "color", default: "", group: GROUP_COLORS },
  { key: "fanColor", label: "Fan dot color", type: "color", default: "", group: GROUP_COLORS },
  { key: "powerColor", label: "Power dot color", type: "color", default: "", group: GROUP_COLORS },
];

/** Classify a reading by its name / unit for the dot color. */
function kindOf(name: string, unit: string): ModernHardwareRow["kind"] {
  const t = `${name} ${unit}`.toLowerCase();
  if (/fan|rpm/.test(t)) return "fan";
  if (/watt|power|\bw\b/.test(t)) return "power";
  if (/temp|°c|celsius|°c\b/.test(t)) return "temp";
  return "other";
}

/**
 * Pick the readings worth surfacing: temperatures, fans, power first
 * (the interesting ones), then everything else.
 */
function pickRows(
  sensors: SensorMap,
  maxRows: number
): ModernHardwareRow[] {
  const entries = Object.entries(sensors).filter(
    ([key]) => key.startsWith("libre.") || key.startsWith("hwinfo.")
  );

  const rows: ModernHardwareRow[] = [];
  for (const [key, sensor] of entries) {
    const value = liveValue(sensor);
    const text = liveText(sensor);
    if (value === undefined && !text) continue;
    const label = sensor.name ?? key;
    const unit = sensor.unit ?? "";
    const kind = kindOf(label, unit);
    rows.push({
      label,
      value: text ?? (value !== undefined ? `${value.toFixed(1)}` : "—"),
      kind,
      temp: kind === "temp" ? value : undefined,
      fan: kind === "fan" ? value : undefined,
    });
  }

  const rank: Record<ModernHardwareRow["kind"], number> = {
    temp: 0,
    fan: 1,
    power: 2,
    other: 3,
  };
  rows.sort((a, b) => rank[a.kind] - rank[b.kind]);
  return maxRows > 0 ? rows.slice(0, maxRows) : rows;
}

export const hardwareModernModule: DashboardModule = {
  id: "hardwaremodern",
  title: "Hardware (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: ["libre.", "hwinfo."],
  settings: HARDWARE_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(hardwareModernModule, s);
    const maxRows = Math.max(0, Math.round(Number(cfg.maxRows) || 0));
    const rows = pickRows(sensors, maxRows);
    if (rows.length === 0) return null;

    return (
      <ModernHardware
        rows={rows}
        gauges={String(cfg.view) === "temps"}
        showFans={Boolean(cfg.showFans)}
        kindColors={{
          temp: String(cfg.tempColor ?? ""),
          fan: String(cfg.fanColor ?? ""),
          power: String(cfg.powerColor ?? ""),
        }}
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
