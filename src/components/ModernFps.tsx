import { cn } from "@/lib/utils";
import { Sparkline, useHistory } from "@/lib/sparkline";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import {
  makeSurface,
  useElementSize,
  type ModernStyle,
} from "./ModernNowPlaying";

/**
 * Modern FPS / performance widget.
 *
 * A single FPS ring gauge (value vs. refresh rate) with the key stats
 * around it — the "big number" look. One component, four layouts picked
 * from the zone's measured size:
 *
 * - `card`     — tall/portrait zones: big FPS ring centered, 1% low +
 *                frame time below, title/source line
 * - `standard` — wide zones: ring left, stats middle, GPU/resolution right
 * - `compact`  — very short zones: one pill (ring · fps · 1% low · frame)
 * - `simple`   — small zones: ring + fps number
 */

export type FpsVariant = "card" | "standard" | "compact" | "simple";

export interface ModernFpsProps {
  fps?: number;
  /** 1% low frames. */
  low1?: number;
  /** 0.1% low frames. */
  low01?: number;
  /** Current frame time, ms. */
  frameTime?: number;
  /** Display refresh, Hz — the ring's max. */
  refresh?: number;
  gpu?: string;
  resolution?: string;
  title?: string;
  source?: string;
  extras?: [string, string][];
  showMetrics?: boolean;
  /** Show a rolling FPS trend sparkline (the "trend" view). */
  sparkline?: boolean;
  layout?: FpsVariant | "auto";
  surfaceStyle?: ModernStyle;
  /** Standard chrome: custom title / icon / accent / background image. */
  chrome?: ModernChromeSpec;
  className?: string;
}

function pickVariant(
  w: number,
  h: number,
  forced: FpsVariant | "auto"
): FpsVariant {
  if (forced !== "auto") return forced;
  if (!w || !h) return "standard";
  if (h <= 72) return "compact";
  if (w < 300 && h < 150) return "simple";
  if (h >= w * 0.72) return "card";
  return "standard";
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Trend sparkline color (the purple FPS line from the reference dashboards). */
const FPS_SPARK = "#c084fc";

function fpsColor(fps: number | undefined, maxFps: number): string {
  if (fps === undefined) return "rgba(128,128,140,0.5)";
  const ratio = clamp01(fps / Math.max(1, maxFps));
  if (ratio >= 0.9) return "#34d399";
  if (ratio >= 0.6) return "#fbbf24";
  return "#f87171";
}

function FpsRing({
  fps,
  maxFps,
  size,
  stroke,
  showValue = true,
}: {
  fps?: number;
  maxFps: number;
  size: number;
  stroke: number;
  showValue?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = fps !== undefined ? clamp01(fps / Math.max(1, maxFps)) : 0;
  const color = fpsColor(fps, maxFps);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--wp-accent, rgba(128,128,140,0.28))"
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
          style={{ fontSize: Math.max(12, size * 0.24), color }}
        >
          {fps !== undefined ? Math.round(fps) : "—"}
        </div>
      )}
    </div>
  );
}

function StatCell({
  value,
  unit,
  label,
  muted,
}: {
  value: string;
  unit?: string;
  label: string;
  muted: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-bold tabular-nums">{value}</span>
        {unit && (
          <span className="text-xs" style={{ color: muted }}>
            {unit}
          </span>
        )}
      </div>
      <div className="text-xs" style={{ color: muted }}>
        {label}
      </div>
    </div>
  );
}

export function ModernFps({
  fps,
  low1,
  low01,
  frameTime,
  refresh,
  gpu,
  resolution,
  title,
  source,
  extras = [],
  showMetrics = true,
  sparkline = false,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernFpsProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const fpsHist = useHistory(fps);

  const maxFps = refresh !== undefined && refresh > 0 ? refresh : 144;
  const box = {
    background: sv.background,
    color: sv.fg,
    boxShadow: `inset 0 0 0 1px ${sv.ring}`,
  } as const;
  const muted = sv.muted;
  const shownExtras = showMetrics ? extras.slice(0, 4) : [];

  let body: React.ReactNode;
  if (v === "card") {
    const ring = Math.max(96, Math.min(150, h * 0.36));
    body = (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-4 overflow-hidden rounded-[20px] p-5"
        style={box}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={ring * 0.09} />
        <div className="flex items-center gap-6">
          {low1 !== undefined && (
            <StatCell
              value={`${Math.round(low1)}`}
              unit={low01 !== undefined ? `· ${Math.round(low01)} 0.1%` : undefined}
              label="1% low"
              muted={muted}
            />
          )}
          {frameTime !== undefined && (
            <StatCell
              value={frameTime.toFixed(1)}
              unit="ms"
              label="frame time"
              muted={muted}
            />
          )}
        </div>
        {sparkline && (
          <div style={{ width: ring * 1.3 }} className="text-purple-400">
            <Sparkline data={fpsHist} color={FPS_SPARK} height={24} />
          </div>
        )}
        {(title || source || resolution) && (
          <div className="max-w-full truncate text-xs" style={{ color: muted }}>
            {[title, source, resolution].filter(Boolean).join(" · ")}
          </div>
        )}
        {shownExtras.length > 0 && (
          <div className="flex max-w-full flex-wrap justify-center gap-x-4 gap-y-1 text-xs" style={{ color: muted }}>
            {shownExtras.map(([label, value]) => (
              <span key={label}>
                {label}{" "}
                <span className="font-semibold tabular-nums" style={{ color: sv.fg }}>
                  {value}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  } else if (v === "compact") {
    const ring = Math.max(26, h * 0.5);
    body = (
      <div
        className="flex h-full w-full items-center gap-4 overflow-hidden rounded-full px-4"
        style={box}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={Math.max(3, ring * 0.16)} />
        <div className="min-w-0">
          <span className="text-sm font-semibold tabular-nums">
            {fps !== undefined ? Math.round(fps) : "—"}
            <span className="ml-1 text-xs font-normal" style={{ color: muted }}>
              fps
            </span>
          </span>
          <div className="truncate text-[10px] tabular-nums" style={{ color: muted }}>
            {[
              low1 !== undefined ? `1% low ${Math.round(low1)}` : undefined,
              frameTime !== undefined ? `${frameTime.toFixed(1)}ms` : undefined,
            ]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        {(source || resolution) && (
          <div className="ml-auto shrink-0 truncate text-xs" style={{ color: muted }}>
            {[source, resolution].filter(Boolean).join(" · ")}
          </div>
        )}
      </div>
    );
  } else if (v === "simple") {
    const ring = Math.max(36, Math.min(56, h * 0.6));
    body = (
      <div
        className="flex h-full w-full items-center justify-center gap-3 overflow-hidden rounded-xl p-3"
        style={box}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={Math.max(3, ring * 0.14)} />
        <div className="text-sm font-semibold" style={{ color: muted }}>
          {source}
        </div>
      </div>
    );
  } else {
    // standard
    const ring = Math.max(64, Math.min(110, h * 0.55));
    body = (
      <div
        className="flex h-full w-full items-center gap-6 overflow-hidden rounded-xl p-5"
        style={box}
      >
        <div className="flex shrink-0 flex-col items-center gap-1">
          <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={ring * 0.09} />
          <div className="text-xs font-medium uppercase tracking-wider" style={{ color: muted }}>
            {source ?? "fps"} · {maxFps}Hz
          </div>
          {sparkline && (
            <div style={{ width: ring }} className="text-purple-400">
              <Sparkline data={fpsHist} color={FPS_SPARK} height={20} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-8">
          {low1 !== undefined && (
            <StatCell value={`${Math.round(low1)}`} unit="fps" label="1% low" muted={muted} />
          )}
          {frameTime !== undefined && (
            <StatCell value={frameTime.toFixed(1)} unit="ms" label="frame time" muted={muted} />
          )}
          {shownExtras.length > 0 && (
            <div className="flex max-w-[40%] min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: muted }}>
              {shownExtras.map(([label, value]) => (
                <span key={label}>
                  {label}{" "}
                  <span className="font-semibold tabular-nums" style={{ color: sv.fg }}>
                    {value}
                  </span>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="w-[24%] min-w-[130px] max-w-[220px] shrink-0 text-right">
          <div className="truncate text-sm font-medium" title={gpu}>
            {gpu ?? "—"}
          </div>
          <div className="truncate text-xs" style={{ color: muted }}>
            {[resolution, refresh !== undefined ? `${refresh}Hz` : undefined]
              .filter(Boolean)
              .join(" · ") || " "}
          </div>
          {title && (
            <div className="mt-1 truncate text-xs" style={{ color: muted }} title={title}>
              {title}
            </div>
          )}
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
