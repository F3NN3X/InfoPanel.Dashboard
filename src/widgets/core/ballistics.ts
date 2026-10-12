// Meter ballistics for the audio widgets: a per-key integrator over the shared `lib/audio` one.
import { useRef } from "react";
import { createBallistics, resolveBallistics, type Ballistics, type BallisticsPreset } from "@/lib/audio/ballistics";
import { dbToGain, gainToDb } from "@/lib/audio/decibels";

export type { BallisticsPreset };

export interface Smoothed {
  /** Smoothed level, % of full scale. */
  v: number;
  /** Peak-hold level in %; undefined when the preset keeps no hold (VU, instant) or none is chosen. */
  hold?: number;
}

/** One integrator step on a % level (linear amplitude × 100). */
export function stepPct(b: Ballistics, pct: number, now: number, holds: boolean): Smoothed {
  const s = b.step(gainToDb(Math.max(0, pct) / 100), now);
  return { v: dbToGain(s.db) * 100, hold: holds ? dbToGain(s.holdDb) * 100 : undefined };
}

/**
 * Returns `(key, pct) => Smoothed`. Without a preset the level passes through as it arrived, so a
 * widget that is not asked for ballistics draws exactly the sensor value. The integrators live in a
 * ref and step on each render, as the peak-hold of the meter bridge always has.
 */
export function useMeterBallistics(preset: BallisticsPreset | undefined): (key: string, pct: number) => Smoothed {
  const state = useRef<{ preset?: BallisticsPreset; by: Map<string, Ballistics> }>({ by: new Map() });
  if (state.current.preset !== preset) state.current = { preset, by: new Map() };
  return (key, pct) => {
    if (!preset) return { v: pct };
    const { by } = state.current;
    let b = by.get(key);
    if (!b) by.set(key, (b = createBallistics(preset)));
    return stepPct(b, pct, Date.now(), resolveBallistics(preset).peakHoldMs > 0);
  };
}
