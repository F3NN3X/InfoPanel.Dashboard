import { snapToRange } from "@/components/ui/slider-field";

/** A trailing "(%)", "(px)" or "(rem)" of a label, moved out of it (the value box shows the unit). */
export function splitUnit(label: string): { label: string; unit?: string } {
  const m = /^(.*\S)\s*\((%|px|rem)\)$/.exec(label);
  return m ? { label: m[1], unit: m[2] } : { label };
}

/** A value with its unit as the value box shows it: `100%`, `12 px`, `0.5 rem`. */
export function formatWithUnit(value: number, unit?: string): string {
  if (!unit) return String(value);
  return unit === "%" ? `${value}%` : `${value} ${unit}`;
}

/** What typed text commits as: clamped and snapped; null when it is not a number (the box reverts). */
export function parseBoxValue(text: string, min: number, max: number, step: number): number | null {
  const n = parseFloat(text.replace(",", "."));
  return Number.isFinite(n) ? snapToRange(n, min, max, step) : null;
}
