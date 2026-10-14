import { createElement as h } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CardEffects, SurfacePicker, shownSurface } from "./surface-picker";

describe("shownSurface", () => {
  it("shows Auto for an unset surface under a chosen skin, glass without one", () => {
    expect(shownSurface(undefined, "hud")).toBe("auto");
    expect(shownSurface("auto", undefined)).toBe("auto");
    expect(shownSurface(undefined, "auto")).toBe("glass");
    expect(shownSurface("neon", "hud")).toBe("neon");
  });
});

describe("SurfacePicker", () => {
  it("offers Auto, the four materials and the generic cards, the shown one pressed", () => {
    const html = renderToString(h(SurfacePicker, { surface: "carbon", skin: "hud", onPick: () => {} }));
    for (const label of ["Auto", "Glass", "Matte (light)", "Theme", "Neon", "Carbon"]) expect(html).toContain(label);
    expect(html).toMatch(/aria-label="Surface Carbon" aria-pressed="true"/);
  });
});

describe("CardEffects", () => {
  it("shows full opacity and blur Off when the scope sets neither", () => {
    const html = renderToString(h(CardEffects, { opacity: undefined, blur: undefined, onOpacity: () => {}, onBlur: () => {} }));
    expect(html).toContain('value="100"');
    expect(html).toContain("Off");
  });
});
