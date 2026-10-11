import { cn } from "@/lib/utils";
import { Sparkline, useHistory } from "@/lib/sparkline";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern system widget.
 *
 * Ring gauges for CPU / RAM load, in the "dashboard card" look: colored rings, value inside, soft glow behind. One component,
 * four layouts picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: two rings side by side
 * - `standard` — wide zones: rings + labels
 * - `compact`  — very short zones: one pill (ring · % · ring · %)
 * - `simple`   — small zones: two mini rings with values only
 */

export type SystemVariant = "card" | "standard" | "compact" | "simple";

export interface ModernSystemProps {
  /** CPU load, percent. */
  cpu?: number;
  /** RAM usage, percent. */
  ram?: number;
  /** Show a rolling trend sparkline under each ring. */
  sparkline?: boolean;
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

const CPU_COLOR = "#38bdf8";
const RAM_COLOR = "#4ade80";

function Ring({
  value,
  color,
  size,
  stroke,
  showValue = true,
}: {
  value: number | undefined;
  color: string;
  size: number;
  stroke: number;
  showValue?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value !== undefined ? clamp01(value / 100) : 0;
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
          strokeDasharray={`${c * pct} ${c}`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      {showValue && (
        <div
          className="absolute inset-0 flex items-center justify-center font-bold tabular-nums"
          style={{ fontSize: Math.max(10, size * 0.26) }}
        >
          {value !== undefined ? Math.round(value) : "—"}
        </div>
      )}
    </div>
  );
}

export function ModernSystem({
  cpu,
  ram,
  sparkline = false,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernSystemProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const cpuHist = useHistory(cpu);
  const ramHist = useHistory(ram);

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "card") {
    const ring = Math.max(64, Math.min(104, h * 0.24));
    const sparkW = ring * 1.5;
    body = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-[20px] p-5" style={box}>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <Ring value={cpu} color={CPU_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
              CPU
            </div>
            {sparkline && (
              <div style={{ width: sparkW }} className="text-sky-400">
                <Sparkline data={cpuHist} color={CPU_COLOR} height={22} />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Ring value={ram} color={RAM_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
              RAM
            </div>
            {sparkline && (
              <div style={{ width: sparkW }} className="text-green-400">
                <Sparkline data={ramHist} color={RAM_COLOR} height={22} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } else if (v === "compact") {
    const ring = Math.max(26, h * 0.5);
    body = (
      <div className="flex h-full w-full items-center gap-4 overflow-hidden rounded-full px-4" style={box}>
        <div className="flex items-center gap-2">
          <Ring value={cpu} color={CPU_COLOR} size={ring} stroke={Math.max(3, ring * 0.14)} />
          <span className="text-sm font-semibold tabular-nums">{cpu !== undefined ? `${Math.round(cpu)}%` : "—"}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: sv.muted }}>
            cpu
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Ring value={ram} color={RAM_COLOR} size={ring} stroke={Math.max(3, ring * 0.14)} />
          <span className="text-sm font-semibold tabular-nums">{ram !== undefined ? `${Math.round(ram)}%` : "—"}</span>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: sv.muted }}>
            ram
          </span>
        </div>
      </div>
    );
  } else if (v === "simple") {
    const ring = Math.max(30, h * 0.45);
    body = (
      <div className="flex h-full w-full items-center justify-center gap-5 overflow-hidden rounded-xl p-3" style={box}>
        <Ring value={cpu} color={CPU_COLOR} size={ring} stroke={Math.max(3, ring * 0.14)} />
        <Ring value={ram} color={RAM_COLOR} size={ring} stroke={Math.max(3, ring * 0.14)} />
      </div>
    );
  } else {
    // standard
    const ring = Math.max(56, Math.min(88, h * 0.42));
    const sparkW = 110;
    body = (
      <div className="flex h-full w-full items-center gap-6 overflow-hidden rounded-xl p-5" style={box}>
        <div className="flex min-w-0 flex-1 items-center gap-8">
          <div className="flex items-center gap-3">
            <Ring value={cpu} color={CPU_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
                CPU
              </div>
              <div className="text-lg font-bold tabular-nums">
                {cpu !== undefined ? `${Math.round(cpu)}%` : "—"}
              </div>
              {sparkline && (
                <div style={{ width: sparkW }}>
                  <Sparkline data={cpuHist} color={CPU_COLOR} height={18} />
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Ring value={ram} color={RAM_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="min-w-0">
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
                RAM
              </div>
              <div className="text-lg font-bold tabular-nums">
                {ram !== undefined ? `${Math.round(ram)}%` : "—"}
              </div>
              {sparkline && (
                <div style={{ width: sparkW }}>
                  <Sparkline data={ramHist} color={RAM_COLOR} height={18} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      <ModernChrome chrome={chrome}>{body}</ModernChrome>
    </div>
  );
}
