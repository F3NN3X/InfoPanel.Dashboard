import { startScratch, type Scratch } from "../../tools/perf/scratch.mjs";
import { expect, test } from "./fixtures";

// The InfoPanel export's card colour for every material, as Chromium resolves it (happy-dom cannot resolve var() or
// color-mix(), so tests/lib/infopanel/native/surface-of.dom.test.ts only pins the code path). The QA page's Surfaces
// gallery draws SystemStatus once per material; `__qaSurfaceOf` runs the export's `surfaceOf` on each frame. A gradient
// or pattern card exports its material's flat colour (`--w-mat-export`); only the see-through outline and flat export
// no card (ledger L2, docs/look-system/progress.md).

let qa: Scratch;
test.beforeAll(async () => {
  qa = await startScratch({ env: { DASHBOARD_DEBUG: "1" } });
});
test.afterAll(() => qa.stop());

test("every material exports a card colour, except the see-through ones", async ({ page }) => {
  await page.goto(`${qa.base}/?widget-qa&eager=1&gallery=SystemStatus&module=SystemStatus&spans=2x2`);
  await page.waitForSelector('figure[data-qa-gallery="Surfaces"] [data-wp-tier]');
  await page.evaluate(() => window.__qaMountAll?.());
  const table = await page.evaluate(async () => {
    const out: Record<string, string | null> = {};
    for (const fig of document.querySelectorAll<HTMLElement>('figure[data-qa-gallery="Surfaces"]')) {
      const name = fig.querySelector("figcaption")?.textContent ?? "";
      out[name] = (await window.__qaSurfaceOf?.(fig))?.color ?? null;
    }
    return out;
  });
  // The accent-tinted ones (tinted, material) are at the QA page's default accent; theme is the default theme's card at 85 %.
  expect(table).toEqual({
    solid: "#FF141418",
    outline: null,
    flat: null,
    tinted: "#FF151D1D",
    aurora: "#FF0F0F13",
    neon: "#FF0A0A0D",
    holo: "#FF121215",
    mesh: "#FF121215",
    carbon: "#FF151518",
    inset: "#FF0E0E11",
    studio: "#0DFFFFFF",
    terminal: "#FF060807",
    tui: "#FF0B0B0D",
    vibrancy: "#E6323237",
    mica: "#FF202023",
    hud: "#FF07090B",
    ios: "#FF1C1C1E",
    material: "#FF1F3731",
    synth: "#FF2B0C3D",
    brutal: "#FF121212",
    cyber: "#FF0E0E0B",
    nixie: "#FF150E0B",
    instrument: "#FF161A20",
    glass: "#E618181B",
    "matte-light": "#FFF4F4F5",
    "matte-dark": "#FF18181B",
    theme: "#D909090B",
  });
});
