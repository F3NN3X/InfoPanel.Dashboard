import { useEffect, useId, useRef, useState } from "react";

/**
 * Rolling history of a live value — the last `size` *changed* samples.
 * Feeds `Sparkline` so modern widgets can show a trend (the "history"
 * sparkline look from the reference dashboards). The hook only appends
 * when the value actually changes, so re-renders with the same number
 * don't flatten the line.
 */
export function useHistory(value: number | undefined, size = 48): number[] {
  const [hist, setHist] = useState<number[]>([]);
  const last = useRef<number | undefined>(value);
  useEffect(() => {
    if (value === undefined) return;
    if (value === last.current) return;
    last.current = value;
    setHist((h) => (h.length >= size ? [...h.slice(1), value] : [...h, value]));
  }, [value, size]);
  return hist;
}

export interface SparklineProps {
  /** Sample values (a rolling window). */
  data: number[];
  color?: string;
  /** Rendered height in px (width always fills the parent). */
  height?: number;
  /** Paint a soft gradient under the line (default on). */
  fill?: boolean;
  strokeWidth?: number;
  className?: string;
}

/**
 * A tiny SVG trend line. `data` is a rolling window of samples; the line is
 * normalized to the window's own min/max so it always fills the height.
 * Renders an empty (sized) box until there are at least two samples.
 */
export function Sparkline({
  data,
  color = "currentColor",
  height = 28,
  fill = true,
  strokeWidth = 1.5,
  className,
}: SparklineProps) {
  const gid = useId();
  const W = 100;
  const H = height;

  if (data.length < 2) {
    return <div className={className} style={{ height, width: "100%" }} />;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;
  const pad = 2;
  const pts = data.map((v, i) => {
    const x = (i / (n - 1)) * W;
    const y = H - pad - ((v - min) / range) * (H - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const area = `0,${H} ${line} ${W},${H}`;

  return (
    <svg
      className={className}
      width="100%"
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      {fill && (
        <>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.28} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <polygon points={area} fill={`url(#${gid})`} />
        </>
      )}
      <polyline
        points={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
