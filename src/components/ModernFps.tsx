import { Sparkline, useHistory } from "@/lib/sparkline";
import { ModernChrome, type ModernChrome as ModernChromeSpec } from "./modern-chrome";
import { makeSurface, type ModernStyle } from "./surfaces";
import { useElementSize } from "@/hooks/use-element-size";
import { byShape, flow, labelStyle, strokeOf, surfaceBox, ws } from "./widget-style";

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
 *
 * The standard style options apply through `ModernChrome` and the
 * `widget-style` helpers: it scales with the zone (designed for about
 * 560×200 wide, 300×420 tall), and alignment, spacing, label case, value
 * weight and ring thickness follow the user's choices.
 */

/**
 * The zone size each shape of the layout is designed for: the standard
 * layout (ring up to 110 px, stat columns, GPU column) fits a wide strip of
 * about 560×200; the card stacks ring and stats in a 300×420 column.
 */
const DESIGN = byShape({
  wide: { w: 560, h: 200 },
  tall: { w: 300, h: 420 },
  square: { w: 380, h: 300 },
});

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
  /** Ring color ("" = by how close the FPS is to the refresh rate). */
  ringColor?: string;
  /** Trend sparkline color ("" = the default purple). */
  sparkColor?: string;
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
  color: colorOverride,
  showValue = true,
}: {
  fps?: number;
  maxFps: number;
  size: number;
  stroke: number;
  color?: string;
  showValue?: boolean;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = fps !== undefined ? clamp01(fps / Math.max(1, maxFps)) : 0;
  const color = colorOverride || fpsColor(fps, maxFps);
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
          className="absolute inset-0 flex items-center justify-center tabular-nums"
          style={{ fontSize: Math.max(12, size * 0.24), color, fontWeight: ws.weight(700) }}
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
        <span className="text-xl tabular-nums" style={{ fontWeight: ws.weight(700) }}>
          {value}
        </span>
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
  ringColor,
  sparkColor,
  layout = "auto",
  surfaceStyle = "glass",
  chrome,
  className,
}: ModernFpsProps) {
  const { ref, w, h } = useElementSize();
  const sv = makeSurface(surfaceStyle, null);
  const v = pickVariant(w, h, layout);
  const fpsHist = useHistory(fps);
  const spark = sparkColor || FPS_SPARK;

  const maxFps = refresh !== undefined && refresh > 0 ? refresh : 144;
  const box = {
    ...surfaceBox(sv, chrome),
  } as const;
  const muted = sv.muted;
  const shownExtras = showMetrics ? extras.slice(0, 4) : [];

  let body: React.ReactNode;
  if (v === "card") {
    const ring = Math.max(96, Math.min(150, h * 0.36));
    body = (
      <div
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("column", { x: "center", y: "center" }),
          gap: ws.gap(16),
          padding: ws.pad(20),
          borderRadius: ws.radius(20),
        }}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={strokeOf(chrome, ring * 0.09)} color={ringColor} />
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
            <Sparkline data={fpsHist} color={spark} height={24} />
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
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(16),
          paddingInline: ws.pad(16),
          borderRadius: ws.radius(999),
        }}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={strokeOf(chrome, Math.max(3, ring * 0.16))} color={ringColor} />
        <div className="min-w-0">
          <span className="text-sm tabular-nums" style={{ fontWeight: ws.weight(600) }}>
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
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "center", y: "center" }),
          gap: ws.gap(12),
          padding: ws.pad(12),
          borderRadius: ws.radius(12),
        }}
      >
        <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={strokeOf(chrome, Math.max(3, ring * 0.14))} color={ringColor} />
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
        className="flex h-full w-full overflow-hidden"
        style={{
          ...box,
          ...flow("row", { x: "start", y: "center" }),
          gap: ws.gap(24),
          padding: ws.pad(20),
          borderRadius: ws.radius(12),
        }}
      >
        <div className="flex shrink-0 flex-col items-center gap-1">
          <FpsRing fps={fps} maxFps={maxFps} size={ring} stroke={strokeOf(chrome, ring * 0.09)} color={ringColor} />
          <div className="text-xs font-medium tracking-wider" style={{ color: muted, ...labelStyle() }}>
            {source ?? "fps"} · {maxFps}Hz
          </div>
          {sparkline && (
            <div style={{ width: ring }} className="text-purple-400">
              <Sparkline data={fpsHist} color={spark} height={20} />
            </div>
          )}
        </div>
        <div className="flex min-w-0 items-center justify-center gap-8" style={{ flex: ws.flex() }}>
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
    <ModernChrome chrome={chrome} designSize={DESIGN} className={className}>
      <div ref={ref} className="h-full w-full">
        {body}
      </div>
    </ModernChrome>
  );
}
