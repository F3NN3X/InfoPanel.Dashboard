// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { surfaceOf } from "../../../../src/lib/infopanel/native/surface-of.ts";
import { MATERIALS, materialVars, resolveMaterial } from "../../../../src/looks/materials.ts";

/** A zone whose widget root is drawn as the shell draws it: its material variables, painted as index.css's [data-mat] rule does. */
function zoneOf(name: string): HTMLElement {
  const el = document.createElement("div");
  const root = document.createElement("div");
  root.dataset.wpTier = "md";
  const mat = resolveMaterial(MATERIALS[name]);
  for (const [k, v] of Object.entries(materialVars(mat))) root.style.setProperty(k.startsWith("--") ? k : k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`), String(v));
  root.style.background = String(mat.box.background);
  el.append(root);
  document.body.append(el);
  return el;
}

// Pins what the converter path exports per surface, so a change shows up as a diff here. Since P3b a gradient or pattern
// card exports its material's flat colour (`--w-mat-export`); only the see-through outline and flat export no card.
// This is happy-dom's reading: it cannot resolve every var() or color-mix(), so materials whose colour needs one may stay
// null here. tests/e2e/material-export.spec.ts checks Chromium's colours for all 27.
describe("surfaceOf over every registered surface", () => {
  it("covers all 27 surfaces", () => {
    expect(Object.keys(MATERIALS)).toHaveLength(27);
  });

  it("is the export table", () => {
    const table = Object.fromEntries(Object.keys(MATERIALS).map((n) => [n, surfaceOf(zoneOf(n))]));
    expect(table).toMatchInlineSnapshot(`
      {
        "aurora": {
          "color": "#FF0F0F13",
          "radius": 0,
        },
        "brutal": {
          "color": "#FF121212",
          "radius": 0,
        },
        "carbon": {
          "color": "#FF151518",
          "radius": 0,
        },
        "cyber": {
          "color": "#FF0E0E0B",
          "radius": 0,
        },
        "flat": null,
        "glass": {
          "color": "#E618181B",
          "radius": 0,
        },
        "holo": {
          "color": "#FF121215",
          "radius": 0,
        },
        "hud": {
          "color": "#FF07090B",
          "radius": 0,
        },
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
        "mesh": {
          "color": "#FF121215",
          "radius": 0,
        },
        "mica": {
          "color": "#FF202023",
          "radius": 0,
        },
        "neon": {
          "color": "#FF0A0A0D",
          "radius": 0,
        },
        "nixie": {
          "color": "#FF150E0B",
          "radius": 0,
        },
        "outline": null,
        "solid": {
          "color": "#FF141418",
          "radius": 0,
        },
        "studio": {
          "color": "#0DFFFFFF",
          "radius": 0,
        },
        "synth": {
          "color": "#FF2B0C3D",
          "radius": 0,
        },
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
        "vibrancy": {
          "color": "#E6323237",
          "radius": 0,
        },
      }
    `);
  });
});
