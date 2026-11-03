// The 4x4 summary over the detail (ServiceHealth, StatusTracker, Thermals, SteamNews): the answer at 48px on the left, what
// it counts and a line of context on the right, then a hairline. The list or lanes below get `h - SUMMARY_H`.
import type { ReactNode } from "react";
import type { Tone } from "./types";
import { Metric } from "./primitives";

/** The band's height with the gap under it, px: a widget budgets its detail in `h - SUMMARY_H`. */
export const SUMMARY_H = 72;

export interface SummaryHeroProps {
  value: string | number;
  unit?: string;
  /** What the number counts. */
  label: ReactNode;
  /** One line of context: what is wrong, or that nothing is. */
  sub?: ReactNode;
  t?: Tone;
  d?: number;
}

export function SummaryHero({ value, unit, label, sub, t = "ok", d = 0 }: SummaryHeroProps) {
  return (
    <div className="flex shrink-0 items-center gap-4 border-b border-[color:var(--w-faint)]/40 pb-3" style={{ height: SUMMARY_H - 12 }}>
      <Metric value={value} unit={unit} d={d} px={48} t={t} hero={false} className="shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-body font-medium text-[color:var(--w-fg)]">{label}</span>
        {sub && <span className="truncate text-caption text-[color:var(--w-muted)]">{sub}</span>}
      </div>
    </div>
  );
}
