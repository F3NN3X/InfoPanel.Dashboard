// Smoothing for live graphs (the `smoothing` look key), ported from the widget sampler's
// smoothing.ts: draw one interval behind the feed and glide from the previous reading to the
// newest, on a clock measured from real arrivals so network jitter does not stutter.
import { useEffect, useRef } from "react";

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Tracks when samples arrive and reports how far we are toward the next one (0 → 1). The interval
 * adapts to the measured arrivals; progress holds at 1 while a sample is late, so a graph stops at
 * the last reading instead of guessing ahead.
 */
export class FeedClock {
  private last = 0;
  private dt: number;

  constructor(initialIntervalMs = 1000, private readonly adapt = 0.3) {
    this.dt = initialIntervalMs;
  }

  arrive(now = performance.now()): void {
    if (this.last) this.dt = lerp(this.dt, now - this.last, this.adapt);
    this.last = now;
  }

  progress(now = performance.now()): number {
    if (!this.last) return 1;
    return Math.min(1, Math.max(0, (now - this.last) / this.dt));
  }

  get intervalMs(): number {
    return this.dt;
  }
}

/** A chart point in a 0–100 wide space: [x, value]. */
export type ScrollPoint = [x: number, value: number];

/**
 * Points for a scrolling chart: the newest sample slides in from the right edge as `t` goes 0 → 1.
 * `visible` samples span the width; points left of 0 are clipped by the caller.
 */
export function scrollPoints(history: readonly number[], visible: number, t: number): ScrollPoint[] {
  const n = history.length;
  if (n === 0) return [];
  if (n === 1) return [[0, history[0]], [100, history[0]]];
  const p = Math.max(0, n - 2 + t); // fractional sample index on the right edge
  const dx = 100 / Math.max(1, visible - 1);
  const fl = Math.floor(p);
  const pts: ScrollPoint[] = [];
  for (let j = Math.max(0, fl - visible); j <= fl; j++) pts.push([100 - (p - j) * dx, history[j]]);
  const fr = p - fl;
  if (fr > 1e-6 && fl + 1 < n) pts.push([100, lerp(history[fl], history[fl + 1], fr)]);
  return pts;
}

/** Eases an axis range toward its target so the whole line never jumps when the scale changes. */
export class RangeEaser {
  private lo: number | null = null;
  private hi = 0;

  constructor(private readonly tauMs = 300) {}

  next(target: readonly [number, number], dtMs: number): [number, number] {
    if (this.lo === null) {
      this.lo = target[0];
      this.hi = target[1];
    } else {
      const a = 1 - Math.exp(-dtMs / this.tauMs);
      this.lo = lerp(this.lo, target[0], a);
      this.hi = lerp(this.hi, target[1], a);
    }
    return [this.lo, this.hi];
  }
}

/** Runs `cb` every animation frame while `active`; write to DOM refs there, never set state. */
export function useAnimationFrame(cb: (now: number, dtMs: number) => void, active = true): void {
  const cbRef = useRef(cb);
  cbRef.current = cb;
  useEffect(() => {
    if (!active) return;
    let id = 0;
    let last = performance.now();
    const loop = (now: number) => {
      cbRef.current(now, Math.min(100, now - last));
      last = now;
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(id);
  }, [active]);
}

/** A FeedClock that registers an arrival whenever `token` changes (a history array, once per sample). */
export function useFeedClock(token: unknown): FeedClock {
  const ref = useRef<FeedClock | null>(null);
  if (!ref.current) ref.current = new FeedClock();
  useEffect(() => {
    ref.current!.arrive();
  }, [token]);
  return ref.current;
}
