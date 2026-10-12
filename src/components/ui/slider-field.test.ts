import { describe, expect, it } from "vitest";
import { snapToRange } from "./slider-field";

describe("snapToRange", () => {
  it("clamps into the range", () => {
    expect(snapToRange(-5, 0, 100, 1)).toBe(0);
    expect(snapToRange(250, 0, 100, 1)).toBe(100);
  });

  it("snaps to the step grid from min", () => {
    expect(snapToRange(13, 0, 100, 5)).toBe(15);
    expect(snapToRange(7, 2, 100, 5)).toBe(7);
    expect(snapToRange(9, 2, 100, 5)).toBe(7);
  });

  it("trims float noise on fractional steps", () => {
    expect(snapToRange(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
  });

  it("falls back to min for NaN", () => {
    expect(snapToRange(NaN, 10, 20, 1)).toBe(10);
  });
});
