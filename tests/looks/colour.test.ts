// The colour reader a pack's contrast is judged on (L-8): an alpha is laid over the colour it is drawn on, whatever syntax that colour has.
import { describe, expect, it } from "vitest";
import { flatOver, parseColour } from "@/looks/colour";

describe("flatOver", () => {
  it("lays an alpha over a short hex, an rgb() or an hsl() colour underneath, as it does over #rrggbb", () => {
    const want = flatOver("rgba(0, 0, 0, 0.9)", "#ffffff");
    expect(want).toBe("#191919");
    expect(flatOver("rgba(0, 0, 0, 0.9)", "#fff")).toBe(want);
    expect(flatOver("rgba(0, 0, 0, 0.9)", "rgb(255, 255, 255)")).toBe(want);
    expect(flatOver("rgba(0, 0, 0, 0.9)", "hsl(0 0% 100%)")).toBe(want);
  });

  it("returns the value unchanged where the colour underneath cannot be read", () => {
    expect(flatOver("rgba(0, 0, 0, 0.9)", "var(--x)")).toBe("rgba(0, 0, 0, 0.9)");
    expect(flatOver("rgba(0, 0, 0, 0.9)", "")).toBe("rgba(0, 0, 0, 0.9)");
  });

  it("does not need the colour underneath for an opaque colour", () => {
    expect(flatOver("rgb(1, 2, 3)", "var(--x)")).toBe("#010203");
    expect(flatOver("#abcdef", "nonsense")).toBe("#abcdef");
  });
});

describe("parseColour", () => {
  it("refuses an hsl() hue with a unit other than deg, rather than reading it as degrees", () => {
    expect(parseColour("hsl(0.5turn 50% 40%)")).toBeUndefined();
    expect(parseColour("hsl(3.14rad 50% 40%)")).toBeUndefined();
    expect(parseColour("hsl(100grad 50% 40%)")).toBeUndefined();
    expect(parseColour("hsl(120deg 50% 40%)")?.hex).toBe(parseColour("hsl(120 50% 40%)")?.hex);
  });
});
