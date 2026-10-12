import { describe, expect, it } from "vitest";
import { fitFontPx } from "./fit-font";

describe("fitFontPx", () => {
  it("shrinks with more characters and clamps to the range", () => {
    expect(fitFontPx(100, 2, 13, 24)).toBe(24);
    expect(fitFontPx(50, 6, 13, 24)).toBe(13);
    expect(fitFontPx(60, 4, 13, 24)).toBe(24);
    expect(fitFontPx(50, 5, 13, 24)).toBe(16);
  });
  it("takes wider glyphs", () => {
    expect(fitFontPx(60, 4, 10, 40, 0.72)).toBeLessThan(fitFontPx(60, 4, 10, 40));
  });
});
