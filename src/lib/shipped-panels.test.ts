import { describe, expect, it } from "vitest";
import { arcv2Profile, mergeConfig, sampleProfile } from "./layout";
import { normalizePanel } from "./panel-model";

/**
 * The panel editor moved into the inspector without touching the model: the
 * shipped profiles' panels must come out of the loader exactly as authored
 * (so the CSS hooks, ids, class names and widget CSS they render with hold).
 */
describe.each([
  ["sample", sampleProfile],
  ["arcv2", arcv2Profile],
])("%s profile panels", (_, make) => {
  const raw = make();
  const loaded = mergeConfig({ profiles: [raw] }).profiles.find((p) => p.id === raw.id)!;
  const rawPanels = raw.placements.filter((p) => p.panel);

  it("has panels to check", () => {
    expect(rawPanels.length).toBeGreaterThan(0);
  });

  // The loader only adds the implied `box.w: "fill"` of the full-row kinds (what they render with anyway).
  it("keeps every widget field as authored (ids, kinds, class names, CSS, boxes)", () => {
    const loadedPanels = loaded.placements.filter((p) => p.panel);
    loadedPanels.forEach((pl, i) => {
      expect(pl.panel!.widgets).toMatchObject(rawPanels[i].panel!.widgets);
      expect(pl.panel!.widgets.map((w) => w.id)).toEqual(rawPanels[i].panel!.widgets.map((w) => w.id));
    });
  });

  it("keeps the layout fields and is stable under another normalisation", () => {
    loaded.placements
      .filter((p) => p.panel)
      .forEach((pl, i) => {
        const src = rawPanels[i].panel!;
        for (const key of ["layout", "direction", "wrap", "gap", "padding", "justify", "align", "columns", "gridCols", "gridRows", "overlayAlign", "bottomGridCols", "scrim", "fit", "css"] as const) {
          if (src[key] !== undefined) expect(pl.panel![key]).toEqual(src[key]);
        }
        expect(normalizePanel(pl.panel!)).toEqual(pl.panel);
      });
  });
});
