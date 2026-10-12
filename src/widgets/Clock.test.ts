import { describe, expect, it } from "vitest";
import { timePx } from "./Clock";

describe("Clock timePx", () => {
  it("keeps the tier size in a roomy box", () => {
    expect(timePx("md", 600, 300, true, false, true)).toBe(72);
  });
  it("shrinks to the height left under the date line", () => {
    expect(timePx("md", 600, 90, false, false, true)).toBe(62);
  });
  it("shrinks to the width left by the seconds and AM/PM", () => {
    expect(timePx("lg", 300, 400, true, true, false)).toBe(Math.round((300 - 36 - 34) / 3.2));
  });
  it("uses the tier size before the first measurement", () => {
    expect(timePx("sm", 0, 0, true, true, true)).toBe(48);
  });
});
