"use client";

import { useEffect, useRef } from "react";

import {
  createSensorVisualSource,
  type SensorVisualSource,
  type SensorVisualSourceOptions,
} from "@/lib/audio/sensor-visual-source";
import type { FrameSource, VisualFrame } from "@/lib/audio/types";

export interface UseSensorVisualSourceOptions
  extends SensorVisualSourceOptions {
  /** Current broadband level, 0..1 (a sensor's % value / 100). */
  level: number;
  /** The plugin's spectrum bands (0..1); null or absent = every band follows the level. */
  spectrum?: ArrayLike<number> | null;
  /**
   * When false no frames are pushed (the visualizer shows its idle state).
   * Default true.
   */
  enabled?: boolean;
}

/**
 * A stable `FrameSource<VisualFrame>` fed from a polled level, for the
 * audiocn live visualizers. The source instance lives for the component's
 * whole life; `level` / `spectrum` updates are pushed into it, so re-renders
 * never re-subscribe the painter.
 */
export function useSensorVisualSource(
  options: UseSensorVisualSourceOptions
): FrameSource<VisualFrame> {
  const { level, spectrum, enabled = true, ...tuning } = options;
  const instanceRef = useRef<SensorVisualSource | null>(null);
  if (instanceRef.current === null) {
    instanceRef.current = createSensorVisualSource(tuning);
  }
  const instance = instanceRef.current;

  useEffect(() => {
    if (enabled) {
      instance.setLevel(level);
    }
  }, [instance, level, enabled]);

  useEffect(() => {
    if (enabled) instance.setSpectrum(spectrum ?? null);
  }, [instance, spectrum, enabled]);

  useEffect(() => {
    return () => {
      instance.dispose();
    };
  }, [instance]);

  return instance.source;
}
