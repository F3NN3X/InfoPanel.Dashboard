// SystemOverview's stored settings: the legacy `systemmodern` keys (src/modules/system-modern.tsx) and
// the subset a SystemOverview zone stores under the same keys, plus the mapping to template props.
import type { ModuleSetting, ModuleSettings } from "@/modules/types";
import type { Detail, Section, SystemOverviewProps } from "../SystemOverview";

const DEVICES = ["cpu", "gpu", "ram", "disk"] as const;
const GROUP_THRESHOLDS = "Thresholds";
const GROUP_UNITS = "Units & labels";

const DEVICES_SETTING: ModuleSetting = {
  key: "devices",
  label: "Devices",
  type: "select",
  multiple: true,
  default: "cpu,gpu,ram",
  options: [
    { value: "cpu", label: "CPU" },
    { value: "gpu", label: "GPU" },
    { value: "ram", label: "RAM" },
    { value: "disk", label: "Disks" },
  ],
  group: "Devices",
};

const CORE_SETTINGS: ModuleSetting[] = [
  { key: "showCores", label: "CPU threads", type: "boolean", default: false, group: "CPU" },
  {
    key: "coreStyle",
    label: "Thread style",
    type: "select",
    default: "heatmap",
    options: [
      { value: "heatmap", label: "Heatmap" },
      { value: "bars", label: "Bars" },
    ],
    group: "CPU",
  },
];

/** The detail switches, each stored under its legacy key. */
const DETAIL_KEYS: Record<Detail, string> = {
  names: "showNames",
  temps: "showTemps",
  power: "showPower",
  clock: "showClock",
  hotspot: "showHotspot",
  fans: "showFans",
  memClock: "showMemClock",
  powerLimit: "showPowerLimit",
  memory: "showMemory",
  pageFile: "showPageFile",
  diskTemp: "showDiskTemp",
  diskIo: "showDiskIo",
  diskLife: "showDiskLife",
};

const LABEL_KEYS: Partial<Record<Section, string>> = { cpu: "cpuLabel", gpu: "gpuLabel", ram: "ramLabel", disk: "diskLabel" };
const COLOR_KEYS: Partial<Record<Section, string>> = { cpu: "cpuColor", gpu: "gpuColor", ram: "ramColor", disk: "diskColor", vram: "vramColor" };

/** Settings in the legacy order; `devices`, `showVram` and the CPU block are legacy-only (a SystemOverview zone has `sections` / `coreView`). */
function settings(legacy: boolean): ModuleSetting[] {
  // A new SystemOverview zone shows every detail and its graphs; systemmodern keeps its old defaults.
  const on = (legacyDefault: boolean) => (legacy ? legacyDefault : true);
  return [
    ...(legacy ? [DEVICES_SETTING] : []),
    { key: "showNames", label: "Hardware names", type: "boolean", default: on(false), group: "Devices" },
    { key: "showTemps", label: "Temperatures", type: "boolean", default: true, group: "Devices" },
    { key: "showPower", label: "Power draw", type: "boolean", default: true, group: "Devices" },
    ...(legacy ? CORE_SETTINGS : []),
    ...(legacy ? [{ key: "showVram", label: "GPU memory (VRAM)", type: "boolean", default: true, group: "GPU" } satisfies ModuleSetting] : []),
    { key: "showClock", label: "GPU clock", type: "boolean", default: on(false), group: "GPU" },
    { key: "showHotspot", label: "GPU hotspot (memory junction)", type: "boolean", default: on(false), group: "GPU" },
    { key: "showFans", label: "GPU fans", type: "boolean", default: on(false), group: "GPU" },
    { key: "showMemClock", label: "GPU memory clock", type: "boolean", default: on(false), group: "GPU" },
    { key: "showPowerLimit", label: "GPU power (% of limit)", type: "boolean", default: on(false), group: "GPU" },
    { key: "showMemory", label: "Memory used / total", type: "boolean", default: true, group: "Memory" },
    { key: "showPageFile", label: "RAM page file", type: "boolean", default: on(false), group: "Memory" },
    { key: "showDiskTemp", label: "Drive temperature", type: "boolean", default: true, group: "Drives" },
    { key: "showDiskIo", label: "Drive read / write rate", type: "boolean", default: true, group: "Drives" },
    { key: "showDiskLife", label: "Drive life remaining", type: "boolean", default: on(false), group: "Drives" },
    {
      key: "diskFilter",
      label: "Drives to show (names, comma-separated; empty = all)",
      type: "text",
      default: "",
      group: "Drives",
    },
    { key: "sparkline", label: "Trend sparklines", type: "boolean", default: on(false), group: "Trends" },
    {
      key: "historyLength",
      label: "Sparkline length (samples)",
      type: "number",
      default: legacy ? 48 : 60,
      min: 12,
      max: 120,
      step: 12,
      group: "Trends",
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
    ...(legacy
      ? ([
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
        ] satisfies ModuleSetting[])
      : []),
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
    { key: "cpuColor", label: "CPU color", type: "color", default: "", group: "Device colors" },
    { key: "gpuColor", label: "GPU color", type: "color", default: "", group: "Device colors" },
    { key: "ramColor", label: "RAM color", type: "color", default: "", group: "Device colors" },
    { key: "diskColor", label: "Disks color", type: "color", default: "", group: "Device colors" },
    { key: "vramColor", label: "VRAM color", type: "color", default: "", group: "Device colors" },
  ];
}

/** systemmodern's own settings, keys and defaults unchanged. */
export const SYSTEM_MODERN_SETTINGS: ModuleSetting[] = settings(true);
/** The SystemOverview zone's settings for the props it gained from systemmodern. */
export const SYSTEM_OVERVIEW_SETTINGS: ModuleSetting[] = settings(false);

/** The device colours systemmodern had before the port (`ModernSystem` at 6513067); the template's own palette differs (RAM is amber). */
export const LEGACY_COLORS: Partial<Record<Section, string>> = { cpu: "#38bdf8", gpu: "#a78bfa", ram: "#4ade80", vram: "#fbbf24", disk: "#fb7185" };

const text = (v: unknown) => String(v ?? "").trim();
const has = (s: ModuleSettings, key: string) => s[key] !== undefined && s[key] !== "";

/** Stored keys → props; a key that is not stored leaves the template's default. */
export function systemOverviewProps(s: ModuleSettings): Partial<SystemOverviewProps> {
  const out: Partial<SystemOverviewProps> = {};
  if (s.devices !== undefined) {
    const picked = new Set(String(s.devices).split(",").map((x) => x.trim()));
    // VRAM was part of the GPU block; it is its own section here, right after the GPU.
    out.sections = DEVICES.filter((k) => picked.has(k)).flatMap((k): Section[] => (k === "gpu" && s.showVram !== false ? ["gpu", "vram"] : [k]));
  }
  if (s.showCores !== undefined) out.coreView = s.showCores ? (s.coreStyle === "bars" ? "bars" : "heatmap") : "off";
  const show = Object.fromEntries((Object.entries(DETAIL_KEYS) as [Detail, string][]).filter(([, key]) => s[key] !== undefined).map(([d, key]) => [d, Boolean(s[key])]));
  if (Object.keys(show).length) out.show = show;
  if (s.sparkline !== undefined) out.sparkline = Boolean(s.sparkline);
  if (has(s, "historyLength")) out.historyLength = Math.max(12, Math.round(Number(s.historyLength) || 48));
  if (has(s, "loadWarn")) out.warn = Number(s.loadWarn) || 80;
  if (has(s, "loadCrit")) out.crit = Number(s.loadCrit) || 95;
  if (has(s, "tempWarn")) out.tempWarn = Number(s.tempWarn) || 80;
  if (has(s, "tempCrit")) out.tempCrit = Number(s.tempCrit) || 90;
  if (has(s, "vramWarn")) out.vramWarn = Number(s.vramWarn) || 90;
  if (has(s, "tempUnit")) out.tempUnit = s.tempUnit === "f" ? "f" : "c";
  if (has(s, "decimals")) out.decimals = Number(s.decimals) === 1 ? 1 : 0;
  if (has(s, "diskFilter")) out.diskFilter = String(s.diskFilter);
  const labels = Object.fromEntries((Object.entries(LABEL_KEYS) as [Section, string][]).filter(([, key]) => text(s[key])).map(([k, key]) => [k, text(s[key])]));
  if (Object.keys(labels).length) out.labels = labels;
  const colors = Object.fromEntries((Object.entries(COLOR_KEYS) as [Section, string][]).filter(([, key]) => text(s[key])).map(([k, key]) => [k, text(s[key])]));
  if (Object.keys(colors).length) out.colors = colors;
  return out;
}

/** `systemOverviewProps` for the legacy systemmodern id: a device colour not stored keeps today's default. */
export function systemModernProps(s: ModuleSettings): Partial<SystemOverviewProps> {
  const props = systemOverviewProps(s);
  return { ...props, colors: { ...LEGACY_COLORS, ...props.colors } };
}
