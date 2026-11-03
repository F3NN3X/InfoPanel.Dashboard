import { describe, expect, it } from "vitest";
import { ISLAND_DEFAULTS } from "@/lib/island/config";
import { islandSkin, pageSkinOf } from "@/components/island/island-look";
import { wornSurface } from "@/components/island/island-page-skin";

describe("islandSkin", () => {
  it("draws a black island black with white text, as islands saved before the skin tint were", () => {
    const skin = islandSkin({ ...ISLAND_DEFAULTS, tint: "black" });
    expect(skin).toMatchObject({ background: "#000000", color: "#ffffff" });
    expect(skin.border).toBeUndefined();
  });

  it("follows the skin with the card colour over the page and the card's edge", () => {
    const skin = islandSkin({ ...ISLAND_DEFAULTS, tint: "skin" });
    expect(skin.background).toContain("hsl(var(--card))");
    expect(skin.background).toContain("92%");
    expect(skin.color).toBe("hsl(var(--card-foreground))");
    expect(skin.border).toBe("1px solid hsl(var(--border))");
  });

  it("wears the screen's surface as part of the skin, only with that placement", () => {
    const worn = wornSurface({ skin: "default", accent: "#ff8800" });
    expect(worn.accent).toBe("#ff8800");
    expect(islandSkin({ ...ISLAND_DEFAULTS, placement: "skin" }, worn).surface).toBe(worn);
    expect(islandSkin({ ...ISLAND_DEFAULTS, placement: "overlay" }, worn).surface).toBeUndefined();
    // the surface draws the edge unless one is asked for
    expect(islandSkin({ ...ISLAND_DEFAULTS, placement: "skin", tint: "skin" }, worn).border).toBeUndefined();
    expect(islandSkin({ ...ISLAND_DEFAULTS, placement: "skin", border: "accent" }, worn).border).toBe("1px solid hsl(var(--primary))");
  });

  it("takes the skin's own surface and accent when none is set, and an explicit one over it", () => {
    const own = wornSurface({ skin: "synth" });
    const explicit = wornSurface({ skin: "synth", surface: "outline", accent: "#112233" });
    expect(own.accent).not.toBe("#112233");
    expect(explicit.accent).toBe("#112233");
    expect(explicit.className).toContain("border-white/15");
  });
});

describe("pageSkinOf", () => {
  it("reads the skin, surface and accent a screen's widgets resolve, leaving auto unset", () => {
    expect(pageSkinOf({ profile: { values: { skin: "tui", surface: "auto", accent: "#abcdef" } } })).toEqual({ skin: "tui", surface: undefined, accent: "#abcdef" });
    expect(pageSkinOf(undefined)).toEqual({ skin: undefined, surface: undefined, accent: undefined });
  });
});
