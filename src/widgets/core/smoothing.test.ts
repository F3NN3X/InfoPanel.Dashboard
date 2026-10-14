import { describe, expect, it } from "vitest";
import { FeedClock, RangeEaser, scrollPoints } from "./smoothing";

describe("scrollPoints", () => {
  const h = [10, 20, 30, 40];

  it("lays the history across the width once the newest sample has slid in", () => {
    const pts = scrollPoints(h, h.length - 1, 1);
    expect(pts.at(-1)).toEqual([100, 40]);
    expect(pts[0][0]).toBeLessThan(0); // the oldest sits just off the left edge
  });

  it("starts a new sample off-screen and covers the left edge (no gap)", () => {
    const pts = scrollPoints(h, h.length - 1, 0);
    expect(pts.at(-1)).toEqual([100, 30]);
    expect(pts[0][0]).toBeCloseTo(0);
  });

  it("interpolates the right edge between the last two samples", () => {
    expect(scrollPoints(h, h.length - 1, 0.5).at(-1)).toEqual([100, 35]);
  });

  it("draws one sample flat across", () => {
    expect(scrollPoints([5], 3, 0)).toEqual([[0, 5], [100, 5]]);
  });
});

describe("FeedClock", () => {
  it("reports progress toward the next sample and holds at 1 while it is late", () => {
    const c = new FeedClock(1000);
    expect(c.progress(0)).toBe(1);
    c.arrive(1000);
    expect(c.progress(1500)).toBeCloseTo(0.5);
    expect(c.progress(5000)).toBe(1);
  });

  it("adapts the interval to the measured arrivals", () => {
    const c = new FeedClock(1000, 0.5);
    c.arrive(1000);
    c.arrive(1500);
    expect(c.intervalMs).toBe(750);
  });
});

describe("RangeEaser", () => {
  it("starts on the target and then eases toward a new one", () => {
    const e = new RangeEaser(300);
    expect(e.next([0, 100], 16)).toEqual([0, 100]);
    const [lo, hi] = e.next([0, 200], 300);
    expect(hi).toBeGreaterThan(100);
    expect(hi).toBeLessThan(200);
    expect(lo).toBe(0);
  });
});
