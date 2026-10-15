import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ColorSwatches, SWATCHES, colorName } from "./color-swatches";

describe("colorName", () => {
  it("names Auto, the swatches and a custom hex", () => {
    expect(colorName("")).toBe("Auto");
    expect(colorName("#5FA7FF")).toBe("Blue");
    expect(colorName("#123abc")).toBe("#123ABC");
  });
});

describe("ColorSwatches", () => {
  it("offers Auto, six hues, White and the custom picker, the current one pressed", () => {
    expect(SWATCHES.map((s) => s.name)).toEqual(["Auto", "Blue", "Violet", "Teal", "Green", "Amber", "Rose", "White"]);
    const out = renderToString(<ColorSwatches value="#53be70" label="Accent" onChange={() => {}} />);
    expect(out.match(/aria-pressed="true"/g)).toHaveLength(1);
    expect(out).toMatch(/aria-label="Green" aria-pressed="true"/);
    expect(out).toContain('type="color"');
  });
});
