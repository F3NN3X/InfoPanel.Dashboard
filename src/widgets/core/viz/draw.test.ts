import { describe, expect, it } from "vitest";
import { bandRects, barCount, historyTail, segmentCount, type BarGeometry } from "./draw";
import { stepPeaks } from "./engine";
import { DEFAULT_LOOK } from "./types";

const g = (o: Partial<BarGeometry> = {}): BarGeometry => ({ gap: 0.5, align: "end", orientation: "horizontal", minLevel: 0, minPx: 0, ...o });

describe("bandRects", () => {
  it("lays bars in equal slots with the gap, grown from the bottom", () => {
    expect(bandRects([1, 0.5], 100, 50, g())).toEqual([
      { x: 12.5, y: 0, w: 25, h: 50 },
      { x: 62.5, y: 25, w: 25, h: 25 },
    ]);
  });
  it("aligns to the start or the centre", () => {
    expect(bandRects([0.5], 10, 40, g({ align: "start" }))[0]).toMatchObject({ y: 0, h: 20 });
    expect(bandRects([0.5], 10, 40, g({ align: "center" }))[0]).toMatchObject({ y: 10, h: 20 });
  });
  it("lays a vertical column growing along the width", () => {
    expect(bandRects([1, 0.25], 80, 20, g({ orientation: "vertical" }))).toEqual([
      { x: 0, y: 2.5, w: 80, h: 5 },
      { x: 60, y: 12.5, w: 20, h: 5 },
    ]);
  });
  it("silence draws no bar above the resting level", () => {
    for (const r of bandRects([0, 0, 0], 90, 100, g({ minLevel: 0.08 }))) expect(r.h).toBeCloseTo(8, 6);
    for (const r of bandRects([0, 0], 90, 100, g())) expect(r.h).toBe(0);
    expect(bandRects([0], 10, 100, g({ minPx: 4 }))[0].h).toBe(4);
  });
});

describe("barCount", () => {
  it("uses the set count, else sizes to the canvas per style", () => {
    expect(barCount("bars", { ...DEFAULT_LOOK, count: 24 }, 300, 50)).toBe(24);
    expect(barCount("bars", DEFAULT_LOOK, 140, 50)).toBe(20);
    expect(barCount("bars", DEFAULT_LOOK, 20, 50)).toBe(8);
    expect(barCount("dots", DEFAULT_LOOK, 200, 50)).toBe(20);
    expect(barCount("scroll", DEFAULT_LOOK, 400, 50)).toBe(100);
  });
});

describe("segmentCount", () => {
  it("fits 3 px cells with a 1 px gap", () => {
    expect(segmentCount(0)).toBe(0);
    expect(segmentCount(3)).toBe(1);
    expect(segmentCount(7)).toBe(2);
    expect(segmentCount(40)).toBe(10);
  });
});

describe("historyTail", () => {
  it("reads the newest samples oldest first across the ring's wrap", () => {
    const buf = Float32Array.from([4, 5, 1, 2, 3]);
    expect(Array.from(historyTail({ buf, start: 2, length: 5 }, 3))).toEqual([3, 4, 5]);
    expect(Array.from(historyTail({ buf, start: 0, length: 2 }, 3))).toEqual([4, 5]);
  });
});

describe("stepPeaks", () => {
  it("jumps to the bar, holds, then falls by time", () => {
    const pk = new Float32Array(1);
    const hold = new Float64Array(1);
    stepPeaks(pk, hold, [0.8], 0, 16, false);
    stepPeaks(pk, hold, [0.2], 500, 16, false);
    expect(pk[0]).toBeCloseTo(0.8, 6);
    stepPeaks(pk, hold, [0.2], 700, 100, false);
    expect(pk[0]).toBeCloseTo(0.72, 6);
  });
  it("follows the bar with reduced motion (no fall animation)", () => {
    const pk = new Float32Array([0.9]);
    stepPeaks(pk, new Float64Array(1), [0.3], 0, 16, true);
    expect(pk[0]).toBeCloseTo(0.3, 6);
  });
});
