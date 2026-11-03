import { startScratch, type Scratch } from "../../../tools/perf/scratch.mjs";
import { expect, test } from "@playwright/test";
import { SAMPLE_PRESET_GROUPS } from "../../../src/lib/screen-templates/sample-presets";

// The sample themes (docs/look-system/03-theme-packs-spec.md) on the Widget QA page: one sheet per theme, the mockups' six
// widgets at 2x2 and 4x2 with the theme's card, accent, text colours and font over its page colour, as
// tests/visual/look/baselines/samples-<theme>.png. Windows only and outside CI, like classic.spec.ts; refresh with
// `npx playwright test --project=look-visual --update-snapshots` after `npm run build`, and say why.
const MODULES = "Clock,CpuMonitor,GpuMonitor,NetworkThroughput,MemoryUsage,DriveSpace";
const SPANS = "2x2,4x2";
const CELL = "cell=72&gap=6";

let qa: Scratch;
test.beforeAll(async () => {
  qa = await startScratch({ env: { DASHBOARD_DEBUG: "1" } });
});
test.afterAll(() => qa.stop());

for (const { presets } of SAMPLE_PRESET_GROUPS) {
  const preset = presets[0];
  const id = String(preset.style.surface).slice(5);
  test(`the six mockup widgets on ${preset.name}`, async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-01-15T12:00:00Z"));
    await page.setViewportSize({ width: 1000, height: 1000 });
    const settings = encodeURIComponent(JSON.stringify(preset.style));
    await page.goto(`${qa.base}/?widget-qa&module=${MODULES}&spans=${SPANS}&${CELL}&eager=1&settings=${settings}`);
    const bg = preset.background?.type === "gradient" ? `linear-gradient(${preset.background.gradient!.angle}deg, ${preset.background.gradient!.from}, ${preset.background.gradient!.to})` : (preset.background?.color ?? "#0b0b0f");
    await page.waitForFunction(() => window.__qaMountAll);
    await page.evaluate(() => window.__qaMountAll?.());
    // One sheet: each widget's 2x2 and 4x2 frames, two widgets a row, over the theme's page colour.
    await page.evaluate(
      ([modules, page]) => {
        const sheet = document.createElement("div");
        sheet.id = "sheet";
        sheet.style.cssText = `display:grid;grid-template-columns:repeat(4,max-content);gap:12px 14px;padding:14px;width:max-content;background:${page}`;
        for (const id of modules) for (const fig of [...document.querySelectorAll(`section[id="${id}"] [data-qa-span]`)].slice(0, 2)) sheet.append(fig);
        document.querySelector("main")?.replaceChildren(sheet);
      },
      [MODULES.split(","), bg] as const,
    );
    expect(await page.locator(`#sheet [data-wp-tier][data-mat="look-${id}"]`).count()).toBe(12);
    await expect.soft(page.locator("#sheet"), id).toHaveScreenshot(`samples-${id}.png`);
  });
}
