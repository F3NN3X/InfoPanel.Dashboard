/**
 * Springs for the island's shape, as CSS: a duration and a bounce (Motion's / SwiftUI's terms) become
 * a `linear()` easing sampled from the damped spring's step response, and the time it settles in.
 * Tuned values from L4 NotchBar (`src/design/motion.ts`): open 0.42 s / 0.24, close 0.32 s / 0.04,
 * morph 0.36 s / 0.14. Pure, so the tests can check the curve.
 */

export interface Spring {
  /** The perceived duration, s: one period of the undamped spring. */
  duration: number;
  /** 0 = no overshoot (critically damped), towards 1 = more. */
  bounce: number;
}

export const SPRINGS = {
  open: { duration: 0.42, bounce: 0.24 },
  close: { duration: 0.32, bounce: 0.04 },
  morph: { duration: 0.36, bounce: 0.14 },
} as const satisfies Record<string, Spring>;

export type SpringKind = keyof typeof SPRINGS;

/** The spring's position at `t` seconds, from 0 to rest at 1. */
export function springAt({ duration, bounce }: Spring, t: number): number {
  const w = (2 * Math.PI) / Math.max(duration, 0.01);
  const zeta = 1 - Math.min(Math.max(bounce, 0), 0.95);
  if (zeta >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

/** When the spring stays within `rest` of 1, s (capped at four durations). */
export function settleTime(spring: Spring, rest = 0.002): number {
  const end = spring.duration * 4;
  const step = end / 400;
  let last = 0;
  for (let t = 0; t <= end; t += step) if (Math.abs(springAt(spring, t) - 1) > rest) last = t + step;
  return Math.min(last, end);
}

/** The CSS easing and duration for a spring; `scale` stretches it (`?slow=N` while tuning). */
export function springCss(spring: Spring, scale = 1): { easing: string; ms: number } {
  const total = settleTime(spring);
  const points: string[] = [];
  const n = 40;
  for (let i = 0; i <= n; i++) {
    const v = i === n ? 1 : springAt(spring, (total * i) / n);
    points.push(String(Math.round(v * 1000) / 1000));
  }
  return { easing: `linear(${points.join(", ")})`, ms: Math.round(total * 1000 * scale) };
}

/** Which spring a change between two island modes takes: opening, closing or any other morph. */
export function springFor(from: string | null, to: string): SpringKind {
  if (to === "expanded" && from !== "expanded") return "open";
  if (from === "expanded" && to !== "expanded") return "close";
  return "morph";
}

/** `?slow=N` stretches every island animation N times (tuning on a kiosk); 1 without it. */
export function motionScale(search: string): number {
  const n = Number(new URLSearchParams(search).get("slow"));
  return Number.isFinite(n) && n >= 1 && n <= 20 ? n : 1;
}
