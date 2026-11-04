import { describe, expect, it } from "vitest";
import { makeSurfacePalette } from "@/looks/materials";
import { tintedCardVars } from "@/widgets/NowPlaying/art-tint";

const tint = { vibrant: [200, 60, 80], light: [240, 200, 210], dark: [40, 10, 20] } as never;

describe("tintedCardVars", () => {
  it("sets the card's material variables, never an inline background that would beat the blur fallback over a solid page", () => {
    const glass = tintedCardVars("glass", { blur: 12 }, makeSurfacePalette("glass", tint)) as Record<string, string>;
    expect(glass.background).toBeUndefined();
    expect(glass["--w-mat-bg"]).toBeTruthy();
    // a glass card the Look blurs keeps a fallback fill in the tinted colour
    expect(glass["--w-mat-fallback"]).toBeTruthy();
  });
  it("tints a matte card with no blur fallback", () => {
    const matte = tintedCardVars("matte-light", undefined, makeSurfacePalette("matte-light", tint)) as Record<string, string>;
    expect(matte["--w-mat-bg"]).toMatch(/^rgba?\(/);
    expect(matte["--w-mat-fallback"]).toBeUndefined();
  });
});
