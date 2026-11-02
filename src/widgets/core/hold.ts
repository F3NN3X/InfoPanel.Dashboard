/** Thickness of the peak-hold tick, px. */
export const HOLD_PX = 2;

/** The peak-hold position as a share of the run (0 to 100), clamped to the scale; the tick's own thickness is left out of the run by the mark. */
export const holdPct = (at: number): number => (Number.isFinite(at) ? Math.min(100, Math.max(0, at)) : 0);
