import { describe, expect, it } from "vitest";
import { clampBlur } from "@/lib/effects/blur";

describe("blur", () => {
  it("is zero (no blur) for anything that is not a positive number, else a whole radius up to 64", () => {
    expect([clampBlur(undefined), clampBlur("8"), clampBlur(NaN), clampBlur(0), clampBlur(0.2), clampBlur(-4)]).toEqual([0, 0, 0, 0, 0, 0]);
    expect([clampBlur(0.6), clampBlur(11.4), clampBlur(500)]).toEqual([1, 11, 64]);
  });
});
