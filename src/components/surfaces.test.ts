import { describe, expect, it } from "vitest";
import { makeSurface, makeSurfacePalette, surfaceColors, surfaceTokens } from "./surfaces";
import {
  CARD_SETTINGS,
  chromeOf,
  PANEL_SETTINGS,
  STANDARD_DEFAULTS,
  STANDARD_SETTINGS,
} from "@/modules/standard-settings";
import { surfaceBox } from "./widget-style";

describe("makeSurface", () => {
  it("builds the theme surface from the theme tokens", () => {
    expect(makeSurface("theme", null)).toEqual({
      background: "hsl(var(--card) / 0.85)",
      fg: "var(--wp-fg, hsl(var(--card-foreground)))",
      muted: "var(--wp-muted, hsl(var(--muted-foreground)))",
      track: "hsl(var(--muted))",
      fill: "hsl(var(--primary))",
      ring: "hsl(var(--border))",
    });
  });

  it("ignores a tint on the theme surface", () => {
    const tint = { vibrant: [200, 0, 0], light: [250, 200, 200], dark: [60, 0, 0] } as const;
    expect(makeSurface("theme", [200, 0, 0])).toEqual(makeSurface("theme", null));
    expect(makeSurfacePalette("theme", { ...tint } as never)).toEqual(makeSurface("theme", null));
  });

  it("keeps the fixed palettes", () => {
    expect(makeSurface("matte-dark", null).background).toBe("rgb(24, 24, 27)");
    expect(makeSurface("glass", null).fill).toBe("rgb(52, 211, 153)");
  });

  it("fades the theme surface with the opacity option", () => {
    const box = surfaceBox(makeSurface("theme", null), chromeOf({ ...STANDARD_DEFAULTS, surfaceOpacity: 40 }));
    expect(box.background).toBe("hsl(var(--card) / 0.34)");
  });
});

describe("surfaceColors", () => {
  it("draws the widget surfaces and falls back to the theme card", () => {
    expect(surfaceColors("matte-light")).toEqual(makeSurface("matte-light", null));
    expect(surfaceColors("theme")).toEqual(makeSurface("theme", null));
    expect(surfaceColors("bordered")).toEqual(makeSurface("theme", null));
    expect(surfaceColors(undefined)).toEqual(makeSurface("theme", null));
  });
});

describe("the surface settings", () => {
  it("offer the theme surface everywhere and default the plain cards to it", () => {
    const surface = STANDARD_SETTINGS.find((s) => s.key === "surface")!;
    expect(surface.options?.map((o) => o.value)).toContain("theme");
    expect(PANEL_SETTINGS.find((s) => s.key === "surface")?.options?.map((o) => o.value)).toContain("theme");
    const card = CARD_SETTINGS.find((s) => s.key === "surface")!;
    expect(card.default).toBe("theme");
    const keys = CARD_SETTINGS.map((s) => s.key);
    for (const key of ["accent", "borderWidth", "glow", "surfaceOpacity", "blur", "textColor", "customCss"])
      expect(keys).toContain(key);
  });
});

describe("surfaceTokens", () => {
  it("sets the text tokens of a fixed-palette surface", () => {
    expect(surfaceTokens("matte-light", undefined)).toEqual({
      "--secondary": "240 5% 88%",
      "--muted": "240 5% 88%",
      "--foreground": "240 6% 10%",
      "--card-foreground": "240 6% 10%",
      "--muted-foreground": "240 6% 10% / 0.6",
    });
    expect(surfaceTokens("theme", undefined)).toEqual({});
    expect(surfaceTokens("bordered", undefined)).toEqual({});
  });

  it("leaves the user's text colors alone", () => {
    const chips = { "--secondary": "240 3.7% 15.9%", "--muted": "240 3.7% 15.9%" };
    expect(surfaceTokens("glass", { textColor: "#ff0000", mutedColor: "" })).toEqual({
      ...chips,
      "--muted-foreground": "0 0% 98% / 0.6",
    });
    expect(surfaceTokens("matte-dark", { textColor: "#ff0000", mutedColor: "#00ff00" })).toEqual(chips);
  });
});
