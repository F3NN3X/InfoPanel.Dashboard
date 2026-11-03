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


// With the look's Surface opacity below 1 the export colour is a faded color-mix(), which Chromium computes to oklab():
// the card must still export, at half alpha.
test("a faded tinted or material card still exports its colour", async ({ page }) => {
  await page.goto(`${qa.base}/?widget-qa&eager=1&gallery=SystemStatus&module=SystemStatus&spans=2x2`);
  await page.waitForSelector('figure[data-qa-gallery="Surfaces"] [data-wp-tier]');
  await page.evaluate(() => window.__qaMountAll?.());
  const faded = await page.evaluate(async () => {
    const out: Record<string, string | null> = {};
    for (const fig of document.querySelectorAll<HTMLElement>('figure[data-qa-gallery="Surfaces"]')) {
      const name = fig.querySelector("figcaption")?.textContent ?? "";
      if (name !== "tinted" && name !== "material") continue;
      const root = fig.querySelector<HTMLElement>("[data-wp-tier]");
      // What `fadeBackground` writes at Surface opacity 50.
      const half = (c: string) => `color-mix(in oklab, ${c} 50%, transparent)`;
      const base = name === "tinted" ? "color-mix(in srgb, var(--accent) 5%, #131316)" : "color-mix(in srgb, var(--accent) 15%, #1b1b1f)";
      root?.style.setProperty("--w-mat-bg", half(base));
      root?.style.setProperty("--w-mat-export", half(base));
      out[name] = (await window.__qaSurfaceOf?.(fig))?.color ?? null;
    }
    return out;
  });
  // The canvas holds a half-transparent colour premultiplied, so each channel reads back one above its opaque value.
  expect(faded).toEqual({ tinted: "#80161E1E", material: "#80203832" });
});

// The static `[data-wp-tier][data-mat]` rule in src/index.css paints every card from its --w-mat-* variables. happy-dom
// cannot cascade it, so only a real browser shows a broken rule (a lost shadow or blur).
test("the static material rule paints background, shadow and blur, and the blur fallback over a solid page", async ({ page }) => {
  await page.goto(`${qa.base}/?widget-qa&eager=1&gallery=SystemStatus&module=SystemStatus&spans=2x2`);
  await page.waitForSelector('figure[data-qa-gallery="Surfaces"] [data-wp-tier]');
  await page.evaluate(() => window.__qaMountAll?.());
  const painted = await page.evaluate(() => {
    const paint = (name: string) => {
      const fig = [...document.querySelectorAll<HTMLElement>('figure[data-qa-gallery="Surfaces"]')].find((f) => f.querySelector("figcaption")?.textContent === name);
      const root = fig?.querySelector<HTMLElement>("[data-wp-tier]");
      if (!fig || !root) throw new Error(name);
      return { fig, root, style: getComputedStyle(root) };
    };
    const vibrancy = paint("vibrancy").style;
    const brutal = paint("brutal").style;
    // A glass card with a blur (the look's Blur above 0), over a solid page background.
    const glass = paint("glass");
    glass.root.style.setProperty("--w-mat-blur", "blur(12px)");
    glass.root.style.setProperty("--w-mat-fallback", "linear-gradient(rgba(24, 24, 27, 0.9), rgba(24, 24, 27, 0.9))");
    glass.root.dataset.matBlur = "";
    const blurred = glass.style.backdropFilter;
    const bg = document.createElement("div");
    bg.dataset.pageBackground = "color";
    glass.fig.append(bg);
    return {
      vibrancy: { image: vibrancy.backgroundImage, blur: vibrancy.backdropFilter },
      brutal: { color: brutal.backgroundColor, image: brutal.backgroundImage, shadow: brutal.boxShadow },
      glass: { blurred, image: glass.style.backgroundImage, blur: glass.style.backdropFilter },
    };
  });
  expect(painted.vibrancy.image).toContain("linear-gradient");
  expect(painted.vibrancy.blur).toContain("blur(");
  expect(painted.brutal.shadow).not.toBe("none");
  expect(painted.brutal.color !== "rgba(0, 0, 0, 0)" || painted.brutal.image !== "none").toBe(true);
  expect(painted.glass.blurred).toContain("blur(12px)");
  expect(painted.glass.blur).toBe("none");
  expect(painted.glass.image).toContain("rgba(24, 24, 27, 0.9)");
});

