import type { SensorValue } from "@/hooks/useSensors";
import type { Widget } from "@/lib/layout";

export function formatNum(v: number, decimals?: number): string {
  const d = decimals ?? 0;
  return d > 0 ? v.toFixed(d) : String(Math.round(v));
}

/** Display text + unit for a widget's bound sensor. */
export function widgetValue(
  s: SensorValue | undefined,
  w: Pick<Widget, "decimals" | "unit">
): { text: string; unit?: string } {
  if (s?.value !== undefined) {
    return {
      text: formatNum(s.value, w.decimals),
      unit: w.unit || s.unit || undefined,
    };
  }
  if (s?.text && s.text.trim() !== "-") return { text: s.text };
  return { text: "—" };
}

/** 0–100 percent for a bar/gauge fill. */
export function widgetPercent(s: SensorValue | undefined, w: Widget): number {
  if (s?.value === undefined) return 0;
  let pct: number;
  if (w.max && w.max > 0) pct = (s.value / w.max) * 100;
  else pct = s.value; // assume the value is already 0..100
  if (w.inverted) pct = 100 - pct;
  return Math.max(0, Math.min(100, pct));
}
