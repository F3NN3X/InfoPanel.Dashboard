// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { surfaceOf } from "../../../../src/lib/infopanel/native/convert-view.ts";
import { MATERIALS } from "../../../../src/looks/materials.ts";

/** A zone whose widget root is drawn with the surface's own inline style. */
function zoneOf(name: string): HTMLElement {
  const el = document.createElement("div");
  const root = document.createElement("div");
  root.dataset.wpTier = "md";
  for (const [k, v] of Object.entries(MATERIALS[name].s)) (root.style as unknown as Record<string, unknown>)[k] = v;
  el.append(root);
  document.body.append(el);
  return el;
}

// Pins what the converter path exports per surface today, so a change shows up as a diff here.
// The `null` rows (gradient, pattern and transparent surfaces export as no card) are flipped on purpose in P3b.
// This is happy-dom's reading: it also leaves the var()/color-mix surfaces (glass, theme, ...) null, so 17 rows are null here
// where Chromium measured 12 (docs/investigations/look-system.md section 5). It pins the code path, not Chromium's colours.
describe("surfaceOf over every registered surface", () => {
  it("covers all 27 surfaces", () => {
    expect(Object.keys(MATERIALS)).toHaveLength(27);
  });

  it("is today's table", () => {
    const table = Object.fromEntries(Object.keys(MATERIALS).map((n) => [n, surfaceOf(zoneOf(n))]));
    expect(table).toMatchInlineSnapshot(`
      {
        "aurora": null,
        "brutal": {
          "color": "#FF121212",
          "radius": 0,
        },
        "carbon": null,
        "cyber": null,
        "flat": null,
        "glass": null,
        "holo": null,
        "hud": null,
        "inset": {
          "color": "#FF0E0E11",
          "radius": 0,
        },
        "instrument": {
          "color": "#FF161A20",
          "radius": 0,
        },
        "ios": {
          "color": "#FF1C1C1E",
          "radius": 0,
        },
        "material": null,
        "matte-dark": {
          "color": "#FF18181B",
          "radius": 0,
        },
        "matte-light": {
          "color": "#FFF4F4F5",
          "radius": 0,
        },
        "mesh": null,
        "mica": null,
        "neon": {
          "color": "#FF0A0A0D",
          "radius": 0,
        },
        "nixie": null,
        "outline": null,
        "solid": {
          "color": "#FF141418",
          "radius": 0,
        },
        "studio": null,
        "synth": null,
        "terminal": {
          "color": "#FF060807",
          "radius": 0,
        },
        "theme": null,
        "tinted": null,
        "tui": {
          "color": "#FF0B0B0D",
          "radius": 0,
        },
        "vibrancy": null,
      }
    `);
  });
});
