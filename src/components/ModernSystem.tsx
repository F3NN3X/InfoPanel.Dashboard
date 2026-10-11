import type { CSSProperties, ReactNode } from "react";
import { Sparkline, useHistory } from "@/lib/sparkline";
import {
  filterDisks,
  formatRate,
  formatTemp,
  levelOf,
  type DiskReading,
  type Level,
  type SystemReadings,
  type TempUnit,
} from "@/lib/system-metrics";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import { makeSurface, type ModernStyle } from "./ModernNowPlaying";
import { useElementSize } from "@/hooks/use-element-size";
import { byShape, flow, labelStyle, strokeOf, surfaceBox, ws } from "./widget-style";

/**
 * Modern system widget.
 *
 * One block per device — CPU, GPU, RAM, Disks — in the "dashboard card"
 * look: a colored load ring with the value, the device's details beside it
 * (temperature, power, clock, memory, fans …), the GPU's VRAM as a thin bar,
 * an optional per-thread CPU grid and trend sparkline, and the drives as a
 * list of used-space bars. Every device and detail can be switched off, and
 * readings past their warning / critical threshold turn amber / red.
 * Four layouts, picked from the zone's measured size:
 *
 * - `standard` — wide zones: the devices side by side
 * - `card`     — tall zones: the devices stacked
 * - `compact`  — very short zones: one pill (ring · % · temp per device)
 * - `simple`   — small zones: mini rings with values only
 *
 * The standard style options apply through `ModernChrome` and the
 * `widget-style` helpers: it scales with the zone (designed for at least
 * 560×220 wide, 300×420 tall, more as devices and details are added — see
 * `designFor`), and alignment, spacing, label case, value weight and ring
 * thickness follow the user's choices.
 */

/** The smallest zone size each shape of the layout is designed for. */
const BASE = {
  wide: { w: 560, h: 220 },
  tall: { w: 300, h: 420 },
  square: { w: 380, h: 300 },
};

/**
 * The design size for what is actually shown: auto-scale must not zoom a
 * widget full of details, threads and drives as if it held three rings.
 * Rough unzoomed sizes of each block — a ring with its text column, a
 * detail line, the VRAM bar, a thread-grid row, a drive row.
 */
function designFor(groups: Group[]) {
  const lines = (g: Group) =>
    g.id === "disk"
      ? 30 + (g.disks?.length ?? 0) * 56
      : Math.max(
          88 + (g.cores?.length ? Math.ceil(g.cores.length / 8) * 14 + 8 : 0),
          32 + g.details.length * 20 + (g.sub ? 46 : 0)
        );
  const width = (g: Group) => (g.id === "disk" ? 270 : 230);
  const n = Math.max(1, groups.length);
  const rowW = 40 + groups.reduce((sum, g) => sum + width(g), 0) + 24 * (n - 1);
  const rowH = 40 + Math.max(0, ...groups.map(lines));
  const colH = 40 + groups.reduce((sum, g) => sum + lines(g), 0) + 16 * (n - 1);
  const atLeast = (base: { w: number; h: number }, w: number, h: number) => ({
    w: Math.max(base.w, w),
    h: Math.max(base.h, h),
  });
  const row = byShape({
    wide: atLeast(BASE.wide, rowW, rowH),
    tall: BASE.tall,
    square: atLeast(BASE.square, rowW, rowH),
  });
  // Zones `pickVariant` stacks (card) are sized for the column.
  return (w: number, h: number) =>
    h >= w * 0.72 ? atLeast(w >= h * 1.2 ? BASE.square : BASE.tall, 300, colH) : row(w, h);
}

export type SystemVariant = "card" | "standard" | "compact" | "simple";
export type SystemDevice = "cpu" | "gpu" | "ram" | "disk";
export type CoreStyle = "heatmap" | "bars";

export interface SystemDetails {
  vram: boolean;
  temps: boolean;
  power: boolean;
  clock: boolean;
  /** Used / total GB for RAM and VRAM. */
  memory: boolean;
  /** The hardware model under each device label. */
  names: boolean;
  /** GPU memory junction temperature. */
  hotspot: boolean;
  /** GPU fan speed (RPM, duty). */
  fans: boolean;
  memClock: boolean;
  /** GPU power as percent of its limit. */
  powerLimit: boolean;
  /** RAM page file used / total. */
  pageFile: boolean;
  diskTemp: boolean;
  /** Per-drive read / write rate. */
  diskIo: boolean;
  diskLife: boolean;
}

/** Warning / critical levels: °C for temperatures, percent for the rest. */
export interface SystemThresholds {
  tempWarn: number;
  tempCrit: number;
  loadWarn: number;
  loadCrit: number;
  /** Capacity warning for VRAM and drives; red at `loadCrit`. */
  vramWarn: number;
}

export const DEFAULT_THRESHOLDS: SystemThresholds = {
  tempWarn: 80,
  tempCrit: 90,
  loadWarn: 80,
  loadCrit: 95,
  vramWarn: 90,
};

/** Ring / bar color per device ("" = the default). */
export type SystemColors = Partial<Record<SystemDevice | "vram", string>>;

/** Label overrides per device ("" = the default). */
export type SystemLabels = Partial<Record<SystemDevice, string>>;

export interface ModernSystemProps {
  readings: SystemReadings;
  /** Devices to show, in display order. */
  devices: SystemDevice[];
  details: SystemDetails;
  /** Show a rolling trend sparkline per load. */
  sparkline?: boolean;
  /** Sparkline window, in changed samples. */
  historyLength?: number;
  /** One block per thread inside the CPU group (needs room; not in compact / simple). */
  showCores?: boolean;
  coreStyle?: CoreStyle;
  thresholds?: SystemThresholds;
  tempUnit?: TempUnit;
  /** Decimals on percentages and temperatures. */
  decimals?: 0 | 1;
  labels?: SystemLabels;
  /** Comma-separated drive-name substrings; empty = all drives. */
  diskFilter?: string;
  colors?: SystemColors;
  layout?: SystemVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

function pickVariant(w: number, h: number, forced: SystemVariant | "auto"): SystemVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const gb = (v: number) => (v >= 100 ? v.toFixed(0) : v.toFixed(1));

const DEFAULT_COLORS: Record<SystemDevice | "vram", string> = {
  cpu: "#38bdf8",
  gpu: "#a78bfa",
  ram: "#4ade80",
  vram: "#fbbf24",
  disk: "#fb7185",
};
const WARN = "#f59e0b";
const HOT = "#ef4444";

/** The amber / red a reading past its threshold turns, if it has. */
const alertOf = (level: Level): string | undefined =>
  level === "crit" ? HOT : level === "warn" ? WARN : undefined;

interface Detail {
  text: string;
  color?: string;
  temp?: boolean;
}

interface DiskRow {
  id: string;
  name: string;
  used?: number;
  usedText: string;
  alert?: string;
  details: Detail[];
}

interface Group {
  id: SystemDevice;
  label: string;
  name?: string;
  load?: number;
  loadText: string;
  color: string;
  /** Set when the load is past its warning / critical level. */
  alert?: string;
  history: number[];
  details: Detail[];
  /** The GPU's VRAM bar. */
  sub?: { label: string; load?: number; text: string; color: string; history: number[] };
  /** Per-thread loads for the CPU grid. */
  cores?: number[];
  /** The drives of the Disks group. */
  disks?: DiskRow[];
}

function Ring({
  value,
  color,
  size,
  stroke,
  showValue = true,
  valueColor,
}: {
  value: number | undefined;
  color: string;
  size: number;
  stroke: number;
  showValue?: boolean;
  valueColor?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const fill = value !== undefined ? clamp01(value / 100) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(128,128,140,0.28)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * fill} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {showValue && (
        <div
          className="absolute inset-0 flex items-center justify-center font-bold tabular-nums"
          style={{ fontSize: Math.max(10, size * 0.26), color: valueColor }}
        >
          {value !== undefined ? Math.round(value) : "—"}
        </div>
      )}
    </div>
  );
}

function Bar({ value, color, height }: { value: number | undefined; color: string; height: number }) {
  return (
    <div
      className="w-full overflow-hidden rounded-full"
      style={{ height, background: "rgba(128,128,140,0.24)" }}
    >
      <div
        className="h-full w-full origin-left rounded-full"
        style={{
          transform: `scaleX(${clamp01((value ?? 0) / 100)})`,
          background: color,
          transition: "transform 0.6s ease",
        }}
      />
    </div>
  );
}

function DetailLine({ details, muted }: { details: Detail[]; muted: string }) {
  if (details.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 text-xs tabular-nums" style={{ color: muted }}>
      {details.map((d) => (
        <span key={d.text} className="whitespace-nowrap" style={d.color ? { color: d.color, fontWeight: 600 } : undefined}>
          {d.text}
        </span>
      ))}
    </div>
  );
}

/**
 * One block per thread: a heatmap (opacity follows load) or small vertical
 * bars, in the CPU color. Eight columns up to 16 threads, then a quarter of
 * the count (at most 16) so 32 threads stay four rows.
 */
function CoreGrid({ cores, color, style }: { cores: number[]; color: string; style: CoreStyle }) {
  const cols = cores.length <= 16 ? Math.min(cores.length, 8) : Math.min(16, Math.ceil(cores.length / 4));
  return (
    <div
      className="grid w-full"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 2 }}
    >
      {cores.map((v, i) =>
        style === "bars" ? (
          <div
            key={i}
            title={`#${i + 1}: ${Math.round(v)}%`}
            className="relative overflow-hidden rounded-[2px]"
            style={{ height: 22, background: "rgba(128,128,140,0.24)" }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-full origin-bottom"
              style={{ transform: `scaleY(${clamp01(v / 100)})`, background: color, transition: "transform 0.6s ease" }}
            />
          </div>
        ) : (
          <div
            key={i}
            title={`#${i + 1}: ${Math.round(v)}%`}
            className="rounded-[2px]"
            style={{
              height: 10,
              background: color,
              opacity: 0.12 + 0.88 * clamp01(v / 100),
              transition: "opacity 0.6s ease",
            }}
          />
        )
      )}
    </div>
  );
}

/** One device: ring, label + %, details, sparkline, VRAM bar, CPU thread grid. */
function GroupBlock({
  g,
  ring,
  sparkline,
  muted,
  chrome,
  coreStyle,
}: {
  g: Group;
  ring: number;
  sparkline: boolean;
  muted: string;
  chrome?: ModernChromeSpec;
  coreStyle: CoreStyle;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-2" style={{ flex: ws.flex() }}>
      <div className="flex min-w-0 items-center gap-3">
        <Ring
          value={g.load}
          color={g.alert ?? g.color}
          valueColor={g.alert}
          size={ring}
          stroke={strokeOf(chrome, ring * 0.12)}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xs font-medium tracking-wider" style={{ color: muted, ...labelStyle() }}>
              {g.label}
            </span>
            <span
              className="text-lg leading-none tabular-nums"
              style={{ fontWeight: ws.weight(700), color: g.alert }}
            >
              {g.loadText}
            </span>
          </div>
          {g.name && (
            <div className="truncate text-[11px]" style={{ color: muted }} title={g.name}>
              {g.name}
            </div>
          )}
          <DetailLine details={g.details} muted={muted} />
          {sparkline && <Sparkline data={g.history} color={g.color} height={18} />}
          {g.sub && (
            <div className="mt-0.5 flex flex-col gap-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-[11px] tabular-nums">
                <span className="font-medium tracking-wider" style={{ color: muted, ...labelStyle() }}>
                  {g.sub.label}
                </span>
                <span className="whitespace-nowrap">{g.sub.text}</span>
              </div>
              <Bar value={g.sub.load} color={g.sub.color} height={strokeOf(chrome, 6)} />
              {sparkline && <Sparkline data={g.sub.history} color={g.sub.color} height={14} />}
            </div>
          )}
        </div>
      </div>
      {g.cores && g.cores.length > 0 && <CoreGrid cores={g.cores} color={g.color} style={coreStyle} />}
    </div>
  );
}

/** The Disks group: a used-space bar and details per drive, no ring. */
function DiskBlock({
  g,
  muted,
  chrome,
}: {
  g: Group;
  muted: string;
  chrome?: ModernChromeSpec;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-2" style={{ flex: ws.flex() }}>
      <span className="text-xs font-medium tracking-wider" style={{ color: muted, ...labelStyle() }}>
        {g.label}
      </span>
      {g.disks?.map((d) => (
        <div key={d.id} className="flex min-w-0 flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2 text-[11px]">
            <span className="truncate" title={d.name}>
              {d.name}
            </span>
            <span className="font-semibold tabular-nums" style={{ color: d.alert }}>
              {d.usedText}
            </span>
          </div>
          <Bar value={d.used} color={d.alert ?? g.color} height={strokeOf(chrome, 6)} />
          <DetailLine details={d.details} muted={muted} />
        </div>
      ))}
    </div>
  );
}

/** The rows for the Disks group, with the per-drive details the user switched on. */
function diskRows(
  disks: DiskReading[],
  details: SystemDetails,
  capacity: (used: number | undefined) => string | undefined,
  temp: (c: number) => Detail,
  fmtPct: (v: number | undefined) => string
): DiskRow[] {
  return disks.map((d) => {
    const list: Detail[] = [];
    if (details.diskTemp && d.temp !== undefined) list.push(temp(d.temp));
    if (details.diskIo && d.read !== undefined) list.push({ text: `R ${formatRate(d.read)}` });
    if (details.diskIo && d.write !== undefined) list.push({ text: `W ${formatRate(d.write)}` });
    if (details.diskLife && d.life !== undefined) list.push({ text: `Life ${Math.round(d.life)}%` });
    return {
      id: d.id,
      name: d.name,
      used: d.used,
      usedText: fmtPct(d.used),
      alert: capacity(d.used),
      details: list,
    };
  });
}

export function ModernSystem({
  readings,
  devices,
  details,
  sparkline = false,
  historyLength = 48,
  showCores = false,
  coreStyle = "heatmap",
  thresholds = DEFAULT_THRESHOLDS,
  tempUnit = "c",
  decimals = 0,
  labels,
  diskFilter = "",
  colors,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernSystemProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const { cpu, gpu, ram } = readings;
  const COLORS = {
    cpu: colors?.cpu || DEFAULT_COLORS.cpu,
    gpu: colors?.gpu || DEFAULT_COLORS.gpu,
    ram: colors?.ram || DEFAULT_COLORS.ram,
    disk: colors?.disk || DEFAULT_COLORS.disk,
    vram: colors?.vram || DEFAULT_COLORS.vram,
  };
  const LABELS: Record<SystemDevice, string> = {
    cpu: labels?.cpu || "CPU",
    gpu: labels?.gpu || "GPU",
    ram: labels?.ram || "RAM",
    disk: labels?.disk || "Disks",
  };
  // Every history runs (hooks can't be conditional); hidden ones cost a few numbers.
  const hist = {
    cpu: useHistory(cpu.load, historyLength),
    gpu: useHistory(gpu.load, historyLength),
    ram: useHistory(ram.load, historyLength),
    disk: [] as number[],
    vram: useHistory(gpu.vram.load, historyLength),
  };

  const fmtPct = (x: number | undefined) => (x !== undefined ? `${x.toFixed(decimals)}%` : "—");
  const loadAlert = (x: number | undefined) =>
    alertOf(levelOf(x, thresholds.loadWarn, thresholds.loadCrit));
  /** Memory-like fullness (VRAM, drives): its own warning, the load's critical level. */
  const capacityAlert = (x: number | undefined) =>
    alertOf(levelOf(x, thresholds.vramWarn, thresholds.loadCrit));
  /** Thresholds are in °C; the text follows the chosen unit. */
  const temp = (c: number, label?: string): Detail => ({
    text: `${label ? `${label} ` : ""}${formatTemp(c, tempUnit, decimals)}`,
    color: alertOf(levelOf(c, thresholds.tempWarn, thresholds.tempCrit)),
    temp: !label,
  });

  const groups: Group[] = [];
  for (const id of devices) {
    const list: (Detail | null)[] = [];
    let sub: Group["sub"];
    let name: string | undefined;
    let load: number | undefined;
    let cores: number[] | undefined;
    let disks: DiskRow[] | undefined;
    if (id === "cpu") {
      load = cpu.load;
      name = cpu.name;
      cores = showCores ? cpu.cores : undefined;
      if (details.temps && cpu.temp !== undefined) list.push(temp(cpu.temp));
      if (details.power && cpu.power !== undefined) list.push({ text: `${Math.round(cpu.power)} W` });
    } else if (id === "gpu") {
      load = gpu.load;
      name = gpu.name;
      if (details.temps && gpu.temp !== undefined) list.push(temp(gpu.temp));
      if (details.hotspot && gpu.hotspot !== undefined) list.push(temp(gpu.hotspot, "Hotspot"));
      if (details.power && gpu.power !== undefined) list.push({ text: `${Math.round(gpu.power)} W` });
      if (details.powerLimit && gpu.powerLimit !== undefined) {
        list.push({ text: `${Math.round(gpu.powerLimit)}% limit` });
      }
      if (details.clock && gpu.clock !== undefined) list.push({ text: `${Math.round(gpu.clock)} MHz` });
      if (details.memClock && gpu.memClock !== undefined) {
        list.push({ text: `Mem ${Math.round(gpu.memClock)} MHz` });
      }
      if (details.fans && gpu.fanRpm !== undefined) {
        const duty = gpu.fanPct !== undefined ? ` · ${Math.round(gpu.fanPct)}%` : "";
        list.push({ text: `Fans ${Math.round(gpu.fanRpm)} RPM${duty}` });
      }
      const vr = gpu.vram;
      if (details.vram && vr.load !== undefined) {
        const amount =
          details.memory && vr.used !== undefined && vr.total !== undefined
            ? `${gb(vr.used)} / ${gb(vr.total)} GB`
            : fmtPct(vr.load);
        sub = {
          label: "VRAM",
          load: vr.load,
          text: amount,
          color: capacityAlert(vr.load) ?? COLORS.vram,
          history: hist.vram,
        };
      }
    } else if (id === "ram") {
      load = ram.load;
      if (details.memory && ram.used !== undefined && ram.total !== undefined) {
        list.push({ text: `${gb(ram.used)} / ${gb(ram.total)} GB` });
      }
      const page = ram.page;
      if (details.pageFile && page) {
        list.push({
          text:
            page.used !== undefined && page.total !== undefined
              ? `Page ${gb(page.used)} / ${gb(page.total)} GB`
              : `Page ${fmtPct(page.load)}`,
        });
      }
    } else {
      const drives = filterDisks(readings.disks, diskFilter);
      disks = diskRows(drives, details, capacityAlert, temp, fmtPct);
      // The ring variants (compact / simple) show the fullest drive.
      const fullest = drives.map((d) => d.used).filter((x): x is number => x !== undefined);
      load = fullest.length > 0 ? Math.max(...fullest) : undefined;
    }
    const shown = list.filter((d): d is Detail => d !== null);
    // A device the machine does not report (no GPU, no libre data, no drives) is left out.
    if (load === undefined && shown.length === 0 && !sub) continue;
    // Drives are judged by how full they are, the other loads by the load levels.
    const alert = id === "disk" ? capacityAlert(load) : loadAlert(load);
    groups.push({
      id,
      label: LABELS[id],
      name: details.names ? name : undefined,
      load,
      loadText: fmtPct(load),
      color: COLORS[id],
      alert,
      history: hist[id],
      details: shown,
      sub,
      cores,
      disks,
    });
  }

  const box: CSSProperties = {
    ...surfaceBox(sv, chrome),
  };

  let body: ReactNode;
  if (groups.length === 0) {
    body = (
      <div
        className="flex h-full w-full items-center justify-center text-sm"
        style={{ ...box, color: sv.muted, borderRadius: ws.radius(12) }}
      >
        No system data
      </div>
    );
  } else if (v === "compact") {
    // The thread grid and drive list are left out here (and in `simple`): they
    // need more room than a pill or mini rings offer.
    // A bar: rings stay small even when the bar is forced into a tall zone.
    const ring = Math.min(44, Math.max(26, h * 0.5));
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(20),
          paddingInline: ws.pad(16),
          borderRadius: ws.radius(999),
        }}
      >
        {groups.map((g) => {
          const temp = g.details.find((d) => d.temp);
          return (
            <div key={g.id} className="flex items-center gap-2">
              <Ring value={g.load} color={g.alert ?? g.color} size={ring} stroke={strokeOf(chrome, Math.max(3, ring * 0.14))} showValue={false} />
              <span className="text-sm tabular-nums" style={{ fontWeight: ws.weight(600), color: g.alert }}>
                {g.loadText}
              </span>
              <span className="text-[10px] tracking-wider" style={{ color: sv.muted, ...labelStyle() }}>
                {g.label}
              </span>
              {temp && (
                <span className="text-xs tabular-nums" style={{ color: temp.color ?? sv.muted }}>
                  {temp.text}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  } else if (v === "simple") {
    const ring = Math.max(30, Math.min(h * 0.45, (w - 24) / groups.length - 16));
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "center", y: "center" }),
          gap: ws.gap(16),
          padding: ws.pad(12),
          borderRadius: ws.radius(12),
        }}
      >
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col items-center gap-1">
            <Ring
              value={g.load}
              color={g.alert ?? g.color}
              valueColor={g.alert}
              size={ring}
              stroke={strokeOf(chrome, Math.max(3, ring * 0.14))}
            />
            <span className="text-[10px] tracking-wider" style={{ color: sv.muted, ...labelStyle() }}>
              {g.label}
            </span>
          </div>
        ))}
      </div>
    );
  } else if (v === "card") {
    const ring = Math.max(44, Math.min(84, (h - 40) / groups.length - 24));
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("column", { x: "between", y: "center" }),
          gap: ws.gap(16),
          padding: ws.pad(20),
          borderRadius: ws.radius(20),
        }}
      >
        {groups.map((g) =>
          g.id === "disk" ? (
            <DiskBlock key={g.id} g={g} muted={sv.muted} chrome={chrome} />
          ) : (
            <GroupBlock
              key={g.id}
              g={g}
              ring={ring}
              sparkline={sparkline}
              muted={sv.muted}
              chrome={chrome}
              coreStyle={coreStyle}
            />
          )
        )}
      </div>
    );
  } else {
    const ring = Math.max(44, Math.min(88, h * 0.4, w / groups.length / 3));
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(24),
          padding: ws.pad(20),
          borderRadius: ws.radius(12),
        }}
      >
        {groups.map((g) =>
          g.id === "disk" ? (
            <DiskBlock key={g.id} g={g} muted={sv.muted} chrome={chrome} />
          ) : (
            <GroupBlock
              key={g.id}
              g={g}
              ring={ring}
              sparkline={sparkline}
              muted={sv.muted}
              chrome={chrome}
              coreStyle={coreStyle}
            />
          )
        )}
      </div>
    );
  }

  return (
    <ModernChrome chrome={chrome} designSize={designFor(groups)} className={className}>
      <div ref={ref} className="h-full w-full">
        {body}
      </div>
    </ModernChrome>
  );
}
