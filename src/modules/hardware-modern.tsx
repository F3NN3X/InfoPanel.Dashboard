import { ModernHardware, type ModernHardwareRow } from "@/components/ModernHardware";
import { liveText, liveValue } from "@/lib/sensors";
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
 * measured zone size. The classic `hardware` module stays untouched.
 */

const HARDWARE_MODERN_SETTINGS: ModuleSetting[] = [
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
    key: "maxRows",
    label: "Max rows (0 = all)",
    type: "number",
    default: 12,
    min: 0,
    max: 100,
    step: 2,
  },
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
    rows.push({
      label,
      value: text ?? (value !== undefined ? `${value.toFixed(1)}` : "—"),
      kind: kindOf(label, unit),
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
  matches: (key) => key.startsWith("libre.") || key.startsWith("hwinfo."),
  settings: HARDWARE_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(hardwareModernModule, s);
    const maxRows = Math.max(0, Math.round(Number(cfg.maxRows) || 0));
    const rows = pickRows(sensors, maxRows);
    if (rows.length === 0) return null;

    return (
      <ModernHardware
        rows={rows}
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
