// Media progress: the bar, wave or inline visualiser under a track (NowPlaying, GameSpotlight combo).
// The visualiser draws with MiniViz, or with the app's live engines (LiveWaveform / BarVisualizer,
// fed by the smoothed sensor level or by Web Audio capture) that the legacy media widgets used.
import type { CSSProperties } from "react";
import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useMediaVisualSource } from "@/hooks/use-media-visual-source";
import { useSensorVisualSource } from "@/hooks/use-sensor-visual-source";
import type { BarIdle } from "@/lib/audio/bar-levels";
import type { FrameSource, Orientation, VisualFrame } from "@/lib/audio/types";
import { clamp } from "./data";
import { Bar, MiniViz, type MiniVizProps } from "./primitives";

export type MediaProgressMode = "bar" | "wave" | "visualizer";
/** What draws the visualiser: the inline canvas, the live waveform or the bar visualizer. */
export type VizEngine = "mini" | "waveform" | "bars";

/** The live engines' options, under the legacy setting keys. */
export interface LiveTuning {
  /** `scrolling` shows the level history; `static` the current bands. */
  waveformMode: "scrolling" | "static";
  waveformBarWidth: number;
  waveformBarGap: number;
  waveformBarRadius: number;
  waveformMinBarHeight: number;
  waveformLineWidth: number;
  waveformFadeEdges: boolean;
  waveformFadeWidth: number;
  /** Off shows the idle dotted line. */
  waveformActive: boolean;
  /** Visual gain (also scales the inline canvas). */
  waveformSensitivity: number;
  visualizerBarCount: number;
  visualizerAlign: "center" | "start" | "end";
  /** Resting bar size, 0..1. */
  visualizerMinLevel: number;
  visualizerIdle: BarIdle;
  /** Runs a sweep animation (connecting / thinking state). */
  visualizerLoading: boolean;
  visualizerOrientation: Orientation;
}

export const LIVE_TUNING_DEFAULTS: LiveTuning = {
  waveformMode: "scrolling",
  waveformBarWidth: 3,
  waveformBarGap: 1,
  waveformBarRadius: 1.5,
  waveformMinBarHeight: 4,
  waveformLineWidth: 1.5,
  waveformFadeEdges: true,
  waveformFadeWidth: 24,
  waveformActive: true,
  waveformSensitivity: 1,
  visualizerBarCount: 24,
  visualizerAlign: "center",
  visualizerMinLevel: 0.08,
  visualizerIdle: "static",
  visualizerLoading: false,
  visualizerOrientation: "horizontal",
};

export const LIVE_TUNING_KEYS = Object.keys(LIVE_TUNING_DEFAULTS) as (keyof LiveTuning)[];

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
  /** Default `mini`. The live engines take `vizMode` bars / line / mirror (waveform) or mirror (bars). */
  engine?: VizEngine;
  tuning?: Partial<LiveTuning>;
  /** Decorative per-track band shape for the live engines (`trackPeaks`). */
  shape?: number[];
  /** Pinned Web Audio capture devices: one labelled live row each, in place of the sensor row (live engines). */
  captureDevices?: string[];
}

const ON_ACCENT: CSSProperties = { color: "var(--accent)" };
const waveVariant = (m: MiniVizProps["mode"]): "bars" | "line" | "mirror" => (m === "line" || m === "mirror" ? m : "bars");

interface LiveProps {
  engine: Exclude<VizEngine, "mini">;
  vizMode: MiniVizProps["mode"];
  t: LiveTuning;
  className: string;
  label: string;
}

/** One live engine over a frame source; `active` overrides `waveformActive` (capture rows). */
function LiveEngine({ engine, vizMode, t, className, label, source, active }: LiveProps & { source: FrameSource<VisualFrame>; active?: boolean }) {
  if (engine === "bars")
    return (
      <BarVisualizer
        source={source}
        barCount={t.visualizerBarCount}
        align={t.visualizerAlign}
        mirrored={vizMode === "mirror"}
        minLevel={t.visualizerMinLevel}
        idle={t.visualizerIdle}
        loading={t.visualizerLoading}
        orientation={t.visualizerOrientation}
        aria-label={label}
        className={`min-w-0 flex-1 ${className}`}
        style={ON_ACCENT}
      />
    );
  return (
    <LiveWaveform
      source={source}
      mode={t.waveformMode}
      variant={waveVariant(vizMode)}
      barWidth={t.waveformBarWidth}
      barGap={t.waveformBarGap}
      barRadius={t.waveformBarRadius}
      minBarHeight={t.waveformMinBarHeight}
      lineWidth={t.waveformLineWidth}
      fadeEdges={t.waveformFadeEdges}
      fadeWidth={t.waveformFadeWidth}
      active={active ?? t.waveformActive}
      sensitivity={t.waveformSensitivity}
      aria-label={label}
      className={`min-w-0 flex-1 ${className}`}
      style={ON_ACCENT}
    />
  );
}

/** The sensor row: the level smoothed at 20 fps (fast attack, slow release) between the ~1 Hz pushes. */
function SensorRow({ level, shape, ...rest }: Omit<LiveProps, "label"> & { level: number; shape?: number[] }) {
  const source = useSensorVisualSource({ level, shape });
  return (
    <div className="flex w-full items-center">
      <LiveEngine {...rest} source={source} label="Live audio level" />
    </div>
  );
}

/** One pinned capture device: its own real-time Web Audio capture, labelled; a failed capture shows a note. */
function CaptureRow({ deviceId, ...rest }: Omit<LiveProps, "label"> & { deviceId: string }) {
  const { source, status, label, error } = useMediaVisualSource(deviceId);
  const name = label || deviceId;
  return (
    <div className="flex w-full items-center gap-2">
      <span className="w-24 shrink-0 truncate text-[10px] font-medium tracking-wide text-[color:var(--w-muted)]" title={name}>
        {name}
      </span>
      {status === "error" ? (
        <span className="min-w-0 flex-1 truncate text-[10px] text-[color:var(--w-faint)]" title={error}>
          {error ?? "capture unavailable"}
        </span>
      ) : (
        <LiveEngine {...rest} source={source} label={`Live level: ${name}`} active={status === "ready"} />
      )}
    </div>
  );
}

export function MediaProgress({ mode = "bar", pct, l, r, level = 0, vizMode = "bars", ramp, playing, sens, className = "h-6", barClassName, engine = "mini", tuning, shape, captureDevices }: MediaProgressProps) {
  if (mode === "visualizer") {
    if (engine === "mini") return <MiniViz l={l} r={r} level={level} mode={vizMode} ramp={ramp} playing={playing} sens={sens} className={className} />;
    const t = { ...LIVE_TUNING_DEFAULTS, ...tuning };
    if (captureDevices?.length)
      return (
        <div className="flex w-full flex-col gap-1.5">
          {captureDevices.map((id) => (
            <CaptureRow key={id} deviceId={id} engine={engine} vizMode={vizMode} t={t} className={className} />
          ))}
        </div>
      );
    return <SensorRow engine={engine} vizMode={vizMode} t={t} className={className} level={clamp(level) / 100} shape={shape} />;
  }
  const wave = mode === "wave";
  return <Bar value={pct} style={wave ? "wave" : undefined} className={barClassName ?? (wave ? "h-2.5" : "h-1")} />;
}
