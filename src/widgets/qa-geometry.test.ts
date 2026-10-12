import { describe, expect, it } from "vitest";
import { exceeds, overlaps } from "./qa-geometry";

const box = { left: 0, top: 0, right: 100, bottom: 50 };

describe("exceeds", () => {
  it("is zero inside the box and within tolerance", () => {
    expect(exceeds({ left: 0, top: 0, right: 100, bottom: 50 }, box)).toEqual({ dx: 0, dy: 0 });
    expect(exceeds({ left: -1, top: 0, right: 101, bottom: 51 }, box)).toEqual({ dx: 0, dy: 0 });
  });
  it("reports the worst overshoot per axis", () => {
    expect(exceeds({ left: 0, top: 0, right: 112.5, bottom: 50 }, box)).toEqual({ dx: 12.5, dy: 0 });
    expect(exceeds({ left: 2, top: -3, right: 90, bottom: 60 }, box)).toEqual({ dx: 0, dy: 10 });
    expect(exceeds({ left: -6, top: 0, right: 90, bottom: 40 }, box)).toEqual({ dx: 6, dy: 0 });
  });
});

describe("overlaps", () => {
  const a = { left: 0, top: 0, right: 10, bottom: 10 };
  it("returns the intersection area", () => {
    expect(overlaps(a, { left: 5, top: 5, right: 20, bottom: 20 })).toBe(25);
  });
  it("is zero for disjoint, touching or sliver overlaps", () => {
    expect(overlaps(a, { left: 20, top: 0, right: 30, bottom: 10 })).toBe(0);
    expect(overlaps(a, { left: 10, top: 0, right: 20, bottom: 10 })).toBe(0);
    expect(overlaps(a, { left: 9, top: 9, right: 20, bottom: 20 })).toBe(0);
  });
});
