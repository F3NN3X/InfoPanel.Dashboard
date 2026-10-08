import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Sparkline, useHistory } from "@/lib/sparkline";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern network widget.
 *
 * Current download / upload speed (the `libre.ethernet_*` LibreHardwareMonitor
 * keys) as two big readouts with optional rolling sparklines, a session
 * totals row, and a thin link-utilization bar. One component, four layouts
 * picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: stacked DL / UL blocks
 * - `standard` — wide zones: DL / UL blocks side by side, totals below
 * - `compact`  — very short zones: one pill (↓ · ↑)
 * - `simple`   — small zones: two values (↓ / ↑)
 */

export type NetworkVariant = "card" | "standard" | "compact" | "simple";

export interface ModernNetworkProps {
  /** Current download speed, bytes/second. */
  download?: number;
  /** Current upload speed, bytes/second. */
  upload?: number;
  /** Session download total, bytes. */
  downloadTotal?: number;
  /** Session upload total, bytes. */
  uploadTotal?: number;
  /** Link utilization, 0-100. */
  utilization?: number;
  /** Show a rolling sparkline under each speed. */
  sparkline?: boolean;
  /** Show the session DL / UL totals row. */
  showTotals?: boolean;
  layout?: NetworkVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

/** "1.8 MB/s" style rate from bytes/second. */
export function formatRate(bps?: number): string {
  if (bps === undefined) return "—";
  const units = ["B/s", "kB/s", "MB/s", "GB/s"];
  let v = bps;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

/** "158.3 MB" style size from bytes. */
export function formatSize(bytes?: number): string {
  if (bytes === undefined) return "—";
  const units = ["B", "kB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

const DL_COLOR = "#34d399";
const UL_COLOR = "#60a5fa";

function pickVariant(
  w: number,
  h: number,
  forced: NetworkVariant | "auto"
): NetworkVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

function SpeedBlock({
  icon,
  label,
  value,
  color,
  spark,
  sparkline,
  muted,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  spark: number[];
  sparkline: boolean;
  muted: string;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        <span style={{ color }}>{icon}</span>
        <span className="text-xs font-medium uppercase tracking-wider" style={{ color: muted }}>
          {label}
        </span>
      </div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      {sparkline && (
        <div className="mt-1" style={{ color }}>
          <Sparkline data={spark} color={color} height={18} />
        </div>
      )}
    </div>
  );
}

export function ModernNetwork({
  download,
  upload,
  downloadTotal,
  uploadTotal,
  utilization,
  sparkline = false,
  showTotals = true,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernNetworkProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const dlHist = useHistory(download);
  const ulHist = useHistory(upload);

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;
  const muted = sv.muted;

  const totals = (
    <div className="flex shrink-0 items-center gap-4 text-xs" style={{ color: muted }}>
      <span>
        Total DL{" "}
        <span className="font-semibold tabular-nums" style={{ color: DL_COLOR }}>
          {formatSize(downloadTotal)}
        </span>
      </span>
      <span>
        Total UL{" "}
        <span className="font-semibold tabular-nums" style={{ color: UL_COLOR }}>
          {formatSize(uploadTotal)}
        </span>
      </span>
      {utilization !== undefined && (
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full" style={{ background: "rgba(128,128,140,0.22)" }}>
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.min(100, Math.max(0, utilization))}%`,
                background: "var(--wp-accent, #38bdf8)",
              }}
            />
          </span>
          <span className="tabular-nums">{Math.round(utilization)}%</span>
        </span>
      )}
    </div>
  );

  let body: React.ReactNode;
  if (v === "card") {
    body = (
      <div
        className="flex h-full w-full flex-col justify-center gap-4 overflow-hidden rounded-[20px] p-5"
        style={box}
      >
        <div className="flex items-center gap-6">
          <SpeedBlock
            icon={<ArrowDown className="h-4 w-4" />}
            label="Download"
            value={formatRate(download)}
            color={DL_COLOR}
            spark={dlHist}
            sparkline={sparkline}
            muted={muted}
          />
          <SpeedBlock
            icon={<ArrowUp className="h-4 w-4" />}
            label="Upload"
            value={formatRate(upload)}
            color={UL_COLOR}
            spark={ulHist}
            sparkline={sparkline}
            muted={muted}
          />
        </div>
        {showTotals && totals}
      </div>
    );
  } else if (v === "compact") {
    body = (
      <div
        className="flex h-full w-full items-center gap-5 overflow-hidden rounded-full px-4"
        style={box}
      >
        <div className="flex items-center gap-1.5">
          <ArrowDown className="h-3.5 w-3.5" style={{ color: DL_COLOR }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: DL_COLOR }}>
            {formatRate(download)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUp className="h-3.5 w-3.5" style={{ color: UL_COLOR }} />
          <span className="text-sm font-bold tabular-nums" style={{ color: UL_COLOR }}>
            {formatRate(upload)}
          </span>
        </div>
        {showTotals && (
          <div className="ml-auto text-xs" style={{ color: muted }}>
            {formatSize(downloadTotal)} / {formatSize(uploadTotal)}
          </div>
        )}
      </div>
    );
  } else if (v === "simple") {
    body = (
      <div
        className="flex h-full w-full items-center justify-center gap-6 overflow-hidden rounded-xl p-3"
        style={box}
      >
        <div className="flex items-center gap-1.5">
          <ArrowDown className="h-4 w-4" style={{ color: DL_COLOR }} />
          <span className="text-lg font-bold tabular-nums" style={{ color: DL_COLOR }}>
            {formatRate(download)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUp className="h-4 w-4" style={{ color: UL_COLOR }} />
          <span className="text-lg font-bold tabular-nums" style={{ color: UL_COLOR }}>
            {formatRate(upload)}
          </span>
        </div>
      </div>
    );
  } else {
    // standard
    body = (
      <div
        className="flex h-full w-full flex-col justify-center gap-4 overflow-hidden rounded-xl p-5"
        style={box}
      >
        <div className="flex items-center gap-8">
          <SpeedBlock
            icon={<ArrowDown className="h-4 w-4" />}
            label="Download"
            value={formatRate(download)}
            color={DL_COLOR}
            spark={dlHist}
            sparkline={sparkline}
            muted={muted}
          />
          <SpeedBlock
            icon={<ArrowUp className="h-4 w-4" />}
            label="Upload"
            value={formatRate(upload)}
            color={UL_COLOR}
            spark={ulHist}
            sparkline={sparkline}
            muted={muted}
          />
        </div>
        {showTotals && totals}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
