import { describe, expect, it } from "vitest";
import { weekOf } from "./Calendar";
import { numPx } from "./Uptime";

describe("Calendar weekOf", () => {
  it("gives the Monday-to-Sunday week holding the date, across a month end", () => {
    const days = weekOf(new Date(2026, 9, 31), 1);
    expect(days.map((d) => d.getDate())).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(days[0].getDay()).toBe(1);
  });

  it("starts on Sunday when asked", () => {
    expect(weekOf(new Date(2026, 9, 14), 0).map((d) => d.getDay())).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });
});

describe("Uptime numPx", () => {
  it("keeps the tier's size where it fits", () => {
    expect(numPx("lg", 900, 300, 4, 16)).toBe(72);
    expect(numPx("sm", 400, 120, 3, 16)).toBe(30);
  });

  it("shrinks so four groups fit a narrow box", () => {
    const fs = numPx("md", 230, 200, 4, 16);
    expect(fs).toBeLessThan(48);
    expect(4 * fs * 1.4 + 3 * (12 + 16)).toBeLessThanOrEqual(230);
  });

  it("leaves room for the unit line in a short box, and keeps the tier size unmeasured", () => {
    expect(numPx("md", 600, 50, 4, 16)).toBe(26);
    expect(numPx("md", 0, 0, 4, 16)).toBe(48);
  });
});
