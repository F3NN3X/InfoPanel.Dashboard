import { ModernSystem, type CoreStyle, type SystemDevice } from "@/components/ModernSystem";
import { readSystem, SYSTEM_PREFIXES, type TempUnit } from "@/lib/system-metrics";
import { chromeOf, GROUP_COLORS, STANDARD_SETTINGS } from "./standard-settings";
import {
  effectiveSettings,
  type DashboardModule,
  type ModuleSetting,
} from "./types";

/**
 * Modern system widget — CPU / GPU / RAM / Disks as device groups: a load
 * ring each (drives get used-space bars), with temperature, power, clock,
 * memory, VRAM, fan and page-file details, an optional per-thread CPU grid
 * and trend sparkline, every part switchable. One component
 * (`ModernSystem`) picks card / standard / compact / simple from the
 * measured zone size.
 */

const DEVICES: SystemDevice[] = ["cpu", "gpu", "ram", "disk"];
/** What `devices` selects until the user adds Disks. */
const DEFAULT_DEVICES: SystemDevice[] = ["cpu", "gpu", "ram"];

const GROUP_THRESHOLDS = "Thresholds";
const GROUP_UNITS = "Units & labels";

const SYSTEM_MODERN_SETTINGS: ModuleSetting[] = [
  ...STANDARD_SETTINGS,
  {
    key: "devices",
    label: "Devices",
    type: "select",
    multiple: true,
    default: DEFAULT_DEVICES.join(","),
    options: [
      { value: "cpu", label: "CPU" },
      { value: "gpu", label: "GPU" },
      { value: "ram", label: "RAM" },
      { value: "disk", label: "Disks" },
    ],
  },
  { key: "showVram", label: "GPU memory (VRAM)", type: "boolean", default: true },
  { key: "showTemps", label: "Temperatures", type: "boolean", default: true },
  { key: "showPower", label: "Power draw", type: "boolean", default: true },
  { key: "showClock", label: "GPU clock", type: "boolean", default: false },
  { key: "showMemory", label: "Memory used / total", type: "boolean", default: true },
  { key: "showNames", label: "Hardware names", type: "boolean", default: false },
  { key: "showHotspot", label: "GPU hotspot (memory junction)", type: "boolean", default: false },
  { key: "showFans", label: "GPU fans", type: "boolean", default: false },
  { key: "showMemClock", label: "GPU memory clock", type: "boolean", default: false },
  { key: "showPowerLimit", label: "GPU power (% of limit)", type: "boolean", default: false },
  { key: "showPageFile", label: "RAM page file", type: "boolean", default: false },
  { key: "showCores", label: "CPU threads", type: "boolean", default: false },
  {
    key: "coreStyle",
    label: "Thread style",
    type: "select",
    default: "heatmap",
    options: [
      { value: "heatmap", label: "Heatmap" },
      { value: "bars", label: "Bars" },
    ],
  },
  { key: "showDiskTemp", label: "Drive temperature", type: "boolean", default: true },
  { key: "showDiskIo", label: "Drive read / write rate", type: "boolean", default: true },
  { key: "showDiskLife", label: "Drive life remaining", type: "boolean", default: false },
  {
    key: "diskFilter",
    label: "Drives to show (names, comma-separated; empty = all)",
    type: "text",
    default: "",
  },
  { key: "sparkline", label: "Trend sparklines", type: "boolean", default: false },
  {
    key: "historyLength",
    label: "Sparkline length (samples)",
    type: "number",
    default: 48,
    min: 12,
    max: 120,
    step: 12,
  },
  {
    key: "tempWarn",
    label: "Temperature warning (°C)",
    type: "number",
    default: 80,
    min: 50,
    max: 100,
    step: 5,
    group: GROUP_THRESHOLDS,
  },
  {
    key: "tempCrit",
    label: "Temperature critical (°C)",
    type: "number",
    default: 90,
    min: 50,
    max: 110,
    step: 5,
    group: GROUP_THRESHOLDS,
  },
  {
    key: "loadWarn",
    label: "Load warning (%)",
    type: "number",
    default: 80,
    min: 10,
    max: 100,
    step: 5,
    group: GROUP_THRESHOLDS,
  },
  {
    key: "loadCrit",
    label: "Load critical (%)",
    type: "number",
    default: 95,
    min: 10,
    max: 100,
    step: 5,
    group: GROUP_THRESHOLDS,
  },
  {
    key: "vramWarn",
    label: "VRAM / drive full warning (%)",
    type: "number",
    default: 90,
    min: 10,
    max: 100,
    step: 5,
    group: GROUP_THRESHOLDS,
  },
  {
    key: "tempUnit",
    label: "Temperature unit",
    type: "select",
    default: "c",
    options: [
      { value: "c", label: "Celsius (°C)" },
      { value: "f", label: "Fahrenheit (°F)" },
    ],
    group: GROUP_UNITS,
  },
  {
    key: "decimals",
    label: "Decimals",
    type: "select",
    default: "0",
    options: [
      { value: "0", label: "None" },
      { value: "1", label: "One" },
    ],
    group: GROUP_UNITS,
  },
  { key: "cpuLabel", label: "CPU label", type: "text", default: "", group: GROUP_UNITS },
  { key: "gpuLabel", label: "GPU label", type: "text", default: "", group: GROUP_UNITS },
  { key: "ramLabel", label: "RAM label", type: "text", default: "", group: GROUP_UNITS },
  { key: "diskLabel", label: "Disks label", type: "text", default: "", group: GROUP_UNITS },
  { key: "cpuColor", label: "CPU color", type: "color", default: "", group: GROUP_COLORS },
  { key: "gpuColor", label: "GPU color", type: "color", default: "", group: GROUP_COLORS },
  { key: "ramColor", label: "RAM color", type: "color", default: "", group: GROUP_COLORS },
  { key: "diskColor", label: "Disks color", type: "color", default: "", group: GROUP_COLORS },
  { key: "vramColor", label: "VRAM color", type: "color", default: "", group: GROUP_COLORS },
];

/** The saved "cpu,ram" list → devices in canonical order. */
function devicesOf(value: unknown): SystemDevice[] {
  const picked = new Set(String(value ?? "").split(",").map((s) => s.trim()));
  return DEVICES.filter((d) => picked.has(d));
}

export const systemModernModule: DashboardModule = {
  id: "systemmodern",
  title: "System (modern)",
  minCols: 2,
  minRows: 1,
  prefixes: SYSTEM_PREFIXES.filter((p) => p.startsWith("system.")),
  // Hardware details come from LibreHardwareMonitor, which the Hardware
  // widget owns.
  reads: SYSTEM_PREFIXES.filter((p) => !p.startsWith("system.")),
  settings: SYSTEM_MODERN_SETTINGS,
  render: (sensors, s) => {
    const cfg = effectiveSettings(systemModernModule, s);
    const devices = devicesOf(cfg.devices);
    if (devices.length === 0) return null;
    const readings = readSystem(sensors);
    // No data at all yet (drives count only when the Disks block is shown).
    const hasDisks = devices.includes("disk") && readings.disks.length > 0;
    if (
      readings.cpu.load === undefined &&
      readings.ram.load === undefined &&
      readings.gpu.load === undefined &&
      !hasDisks
    ) {
      return null;
    }

    return (
      <ModernSystem
        readings={readings}
        devices={devices}
        details={{
          vram: Boolean(cfg.showVram),
          temps: Boolean(cfg.showTemps),
          power: Boolean(cfg.showPower),
          clock: Boolean(cfg.showClock),
          memory: Boolean(cfg.showMemory),
          names: Boolean(cfg.showNames),
          hotspot: Boolean(cfg.showHotspot),
          fans: Boolean(cfg.showFans),
          memClock: Boolean(cfg.showMemClock),
          powerLimit: Boolean(cfg.showPowerLimit),
          pageFile: Boolean(cfg.showPageFile),
          diskTemp: Boolean(cfg.showDiskTemp),
          diskIo: Boolean(cfg.showDiskIo),
          diskLife: Boolean(cfg.showDiskLife),
        }}
        sparkline={Boolean(cfg.sparkline)}
        historyLength={Math.max(12, Math.round(Number(cfg.historyLength) || 48))}
        showCores={Boolean(cfg.showCores)}
        coreStyle={String(cfg.coreStyle) as CoreStyle}
        thresholds={{
          tempWarn: Number(cfg.tempWarn) || 80,
          tempCrit: Number(cfg.tempCrit) || 90,
          loadWarn: Number(cfg.loadWarn) || 80,
          loadCrit: Number(cfg.loadCrit) || 95,
          vramWarn: Number(cfg.vramWarn) || 90,
        }}
        tempUnit={String(cfg.tempUnit) as TempUnit}
        decimals={Number(cfg.decimals) === 1 ? 1 : 0}
        labels={{
          cpu: String(cfg.cpuLabel ?? "").trim(),
          gpu: String(cfg.gpuLabel ?? "").trim(),
          ram: String(cfg.ramLabel ?? "").trim(),
          disk: String(cfg.diskLabel ?? "").trim(),
        }}
        diskFilter={String(cfg.diskFilter ?? "")}
        colors={{
          cpu: String(cfg.cpuColor ?? ""),
          gpu: String(cfg.gpuColor ?? ""),
          ram: String(cfg.ramColor ?? ""),
          disk: String(cfg.diskColor ?? ""),
          vram: String(cfg.vramColor ?? ""),
        }}
        layout={String(cfg.layout) as "auto" | "card" | "standard" | "compact" | "simple"}
        surfaceStyle={String(cfg.surface) as "glass" | "matte-light" | "matte-dark"}
        chrome={chromeOf(cfg)}
      />
    );
  },
};
