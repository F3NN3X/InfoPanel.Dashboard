import { cn } from "@/lib/utils";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern system widget.
 *
 * Ring gauges for CPU / RAM load plus the bridge status, in the "dashboard
 * card" look: colored rings, value inside, soft glow behind. One component,
 * four layouts picked from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: two rings side by side, status line
 *                below
 * - `standard` — wide zones: rings + labels left, status chip on the right
 * - `compact`  — very short zones: one pill (ring · % · ring · % · status)
 * - `simple`   — small zones: two mini rings with values only
 */

export type SystemVariant = "card" | "standard" | "compact" | "simple";

export interface ModernSystemProps {
  /** CPU load, percent. */
  cpu?: number;
  /** RAM usage, percent. */
  ram?: number;
  /** Bridge status text ("running"). */
  status?: string;
  layout?: SystemVariant | "auto";
  surfaceStyle?: ModernStyle;
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
const STATUS_COLOR = "#fb923c";

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

function StatusChip({
  status,
  size = "md",
}: {
  status?: string;
  size?: "sm" | "md";
}) {
  const running = status !== undefined && status.toLowerCase() !== "stopped";
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full",
        size === "sm" ? "px-2.5 py-1" : "px-3.5 py-1.5"
      )}
      style={{ background: "rgba(128,128,140,0.14)" }}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: running ? STATUS_COLOR : "#71717a" }}
      />
      <span className="text-sm font-semibold">
        {status ?? "—"}
      </span>
    </div>
  );
}

export function ModernSystem({
  cpu,
  ram,
  status,
  layout = "auto",
  surfaceStyle = "glass",
  className,
}: ModernSystemProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);

  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;

  let body: React.ReactNode;
  if (v === "card") {
    const ring = Math.max(64, Math.min(104, h * 0.24));
    body = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 rounded-[20px] p-5" style={box}>
        <div className="flex items-center gap-8">
          <div className="flex flex-col items-center gap-1.5">
            <Ring value={cpu} color={CPU_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
              CPU
            </div>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Ring value={ram} color={RAM_COLOR} size={ring} stroke={ring * 0.12} />
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: sv.muted }}>
              RAM
            </div>
          </div>
        </div>
        {status !== undefined && (
          <div className="flex items-center gap-2 text-sm" style={{ color: sv.muted }}>
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: STATUS_COLOR }} />
            Bridge {status}
          </div>
        )}
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
        {status !== undefined && (
          <div className="ml-auto flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: STATUS_COLOR }} />
            <span className="text-xs" style={{ color: sv.muted }}>
              {status}
            </span>
          </div>
        )}
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
            </div>
          </div>
        </div>
        {status !== undefined && <StatusChip status={status} />}
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full w-full", className)}>
      {body}
    </div>
  );
}
