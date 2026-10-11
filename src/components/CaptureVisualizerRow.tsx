"use client";

import { BarVisualizer } from "@/components/ui/bar-visualizer";
import { LiveWaveform } from "@/components/ui/live-waveform";
import { useMediaVisualSource } from "@/hooks/use-media-visual-source";
import type { BarIdle } from "@/lib/audio/bar-levels";
import type { Orientation } from "@/lib/audio/types";
import { cn } from "@/lib/utils";

export interface CaptureVisualizerRowProps {
  /** The capture device to render (a stable `enumerateDevices()` id). */
  deviceId: string;
  /** Show a LiveWaveform; `visualizer` takes precedence when both are on. */
  waveform?: boolean;
  visualizer?: boolean;
  waveformVariant?: "bars" | "line" | "mirror";
  waveformMode?: "scrolling" | "static";
  waveformBarWidth?: number;
  waveformBarGap?: number;
  waveformBarRadius?: number;
  waveformMinBarHeight?: number;
  waveformLineWidth?: number;
  waveformFadeEdges?: boolean;
  waveformFadeWidth?: number;
  waveformSensitivity?: number;
  visualizerBarCount?: number;
  visualizerAlign?: "center" | "start" | "end";
  visualizerMirrored?: boolean;
  visualizerMinLevel?: number;
  visualizerIdle?: BarIdle;
  visualizerLoading?: boolean;
  visualizerOrientation?: Orientation;
  className?: string;
}

/**
 * One pinned capture device as a labeled live visualizer row. Each row owns
 * its own Web Audio capture (`useMediaVisualSource`), so a widget can pin any
 * number of devices and render them stacked — real-time, independent of the
 * Data API's sensor refresh. The device label shows to the left of the
 * visualizer; a device that fails to capture shows a small error note.
 */
export function CaptureVisualizerRow({
  deviceId,
  visualizer = false,
  waveformVariant = "bars",
  waveformMode = "scrolling",
  waveformBarWidth = 3,
  waveformBarGap = 1,
  waveformBarRadius = 1.5,
  waveformMinBarHeight = 4,
  waveformLineWidth = 1.5,
  waveformFadeEdges = true,
  waveformFadeWidth = 24,
  waveformSensitivity = 1,
  visualizerBarCount = 24,
  visualizerAlign = "center",
  visualizerMirrored = false,
  visualizerMinLevel = 0.08,
  visualizerIdle = "static",
  visualizerLoading = false,
  visualizerOrientation = "horizontal",
  className,
}: CaptureVisualizerRowProps) {
  const { source, status, label, error } = useMediaVisualSource(deviceId);
  const ready = status === "ready";
  const name = label || deviceId;

  // Mirror the widget's precedence: the bar visualizer wins when both are on
  // (this row only mounts while a visualizer view is active, so the else
  // branch is the waveform case).
  const useBars = visualizer;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-2 text-(--waveform, currentColor)",
        className
      )}
    >
      <span
        className="w-24 shrink-0 truncate text-[10px] font-medium tracking-wide text-muted-foreground"
        title={name}
      >
        {name}
      </span>
      {status === "error" ? (
        <span
          className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground/70"
          title={error}
        >
          {error ?? "capture unavailable"}
        </span>
      ) : useBars ? (
        <BarVisualizer
          source={source}
          barCount={visualizerBarCount}
          align={visualizerAlign}
          mirrored={visualizerMirrored}
          minLevel={visualizerMinLevel}
          idle={visualizerIdle}
          loading={visualizerLoading}
          orientation={visualizerOrientation}
          aria-label={`Live level: ${name}`}
          className="h-8 min-w-0 flex-1"
        />
      ) : (
        <LiveWaveform
          source={source}
          mode={waveformMode}
          variant={waveformVariant}
          barWidth={waveformBarWidth}
          barGap={waveformBarGap}
          barRadius={waveformBarRadius}
          minBarHeight={waveformMinBarHeight}
          lineWidth={waveformLineWidth}
          fadeEdges={waveformFadeEdges}
          fadeWidth={waveformFadeWidth}
          active={ready}
          sensitivity={waveformSensitivity}
          aria-label={`Live level: ${name}`}
          className="h-8 min-w-0 flex-1"
        />
      )}
    </div>
  );
}
