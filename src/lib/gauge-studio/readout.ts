/** The editor stage's text for a gauge at `p` (0..1 of its range): the value and both ends, in the gauge's own unit and decimals. */
import { DEFAULT_SCALE } from "@/lib/infopanel/gauges/parts";
import type { VectorGauge } from "@/lib/infopanel/gauges/vector";

export interface Readout {
  min: number;
  max: number;
  value: number;
  unit: string;
  /** "67.5 °C" */
  text: string;
  /** "0 °C" */
  low: string;
  /** "100 °C" */
  high: string;
}

export function readout(g: VectorGauge, p: number): Readout {
  const { min, max, unit, decimals } = g.scale ?? DEFAULT_SCALE;
  const value = min + Math.min(1, Math.max(0, p)) * (max - min);
  // Auto keeps one decimal where there is one to show ("67.5", "70").
  const show = (v: number) => {
    const text = decimals === null ? String(Math.round(v * 10) / 10) : v.toFixed(decimals);
    return unit ? `${text} ${unit}` : text;
  };
  return { min, max, value, unit, text: show(value), low: show(min), high: show(max) };
}
