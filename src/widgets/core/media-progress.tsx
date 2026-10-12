// Media progress: the bar, wave or inline visualiser under a track (NowPlaying, GameSpotlight combo).
import { Bar, MiniViz, type MiniVizProps } from "./primitives";

export type MediaProgressMode = "bar" | "wave" | "visualizer";

export interface MediaProgressProps {
  mode?: MediaProgressMode;
  /** Track progress, 0–100. */
  pct: number;
  /** Level-meter channels driving the visualiser, 0–100. */
  l?: number;
  r?: number;
  level?: number;
  vizMode?: MiniVizProps["mode"];
  ramp?: string;
  playing?: boolean;
  sens?: number;
  /** Height class of the visualiser. */
  className?: string;
  /** Class of the bar / wave meter; default `h-1` (bar) or `h-2.5` (wave). */
  barClassName?: string;
}

export function MediaProgress({ mode = "bar", pct, l, r, level, vizMode = "bars", ramp, playing, sens, className = "h-6", barClassName }: MediaProgressProps) {
  if (mode === "visualizer") return <MiniViz l={l} r={r} level={level} mode={vizMode} ramp={ramp} playing={playing} sens={sens} className={className} />;
  const wave = mode === "wave";
  return <Bar value={pct} style={wave ? "wave" : undefined} className={barClassName ?? (wave ? "h-2.5" : "h-1")} />;
}
