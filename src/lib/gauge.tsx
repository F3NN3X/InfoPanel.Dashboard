import { useId } from "react";

export interface ArcGaugeProps {
  /** Current value. */
  value: number;
  /** Full-scale value (the arc's 100%). */
  max: number;
  size?: number;
  stroke?: number;
  /** Arc color; falls back to the widget accent when empty. */
  color?: string;
  /** Track (unfilled) color. */
  track?: string;
  /** Big centered readout (defaults to the rounded value). */
  display?: string;
  /** Small label under the value, e.g. "WARM" / "NORMAL". */
  sublabel?: string;
}

/**
 * A 3/4 (270°) arc gauge — the "temps" card look from the reference
 * dashboards (CPU / GPU / SSD / MEMORY gauges). The value arc is colored by
 * the caller (typically a temp threshold color); the rest of the ring is the
 * neutral track. Center shows `display` + an optional `sublabel`.
 */
export function ArcGauge({
  value,
  max,
  size = 72,
  stroke = 8,
  color = "var(--wp-accent, #38bdf8)",
  track = "rgba(128,128,140,0.25)",
  display,
  sublabel,
}: ArcGaugeProps) {
  const gid = useId();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const SPAN = 0.75; // 270°
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;

  // Rotate so the 90° gap sits at the bottom (start at 135°).
  const start = 135;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.85} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* Track: the full 270° arc. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * SPAN} ${c}`}
          transform={`rotate(${start} ${size / 2} ${size / 2})`}
        />
        {/* Value arc. */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gid})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * SPAN * pct} ${c}`}
          transform={`rotate(${start} ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-bold leading-none tabular-nums" style={{ fontSize: Math.max(12, size * 0.26) }}>
          {display ?? `${Math.round(value)}`}
        </div>
        {sublabel && (
          <div
            className="mt-0.5 text-[9px] font-medium uppercase tracking-wider"
            style={{ color: "rgba(128,128,140,0.9)" }}
          >
            {sublabel}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pick a temp color: green (cool) → amber (warm) → red (hot). */
export function tempColor(t: number): string {
  if (t >= 85) return "#f87171";
  if (t >= 70) return "#fbbf24";
  if (t >= 55) return "#facc15";
  return "#34d399";
}

/** A short status word for a temperature. */
export function tempWord(t: number): string {
  if (t >= 85) return "Hot";
  if (t >= 70) return "Warm";
  if (t >= 45) return "Normal";
  return "Cool";
}
