import fs from "node:fs";
import path from "node:path";
import { startScratch, type Scratch } from "../../tools/perf/scratch.mjs";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { parseCss, writeTokens, type Rule } from "../../src/looks/css-syntax";
import { expect, test } from "./fixtures";

// A pack.css rule that matches nothing paints nothing (the P10 review's M4: the dark header and chip bars were written and never drawn).
// Every selector of every pack rule must match an element on the Widget QA page wearing the pack, so a dead selector fails here.

let qa: Scratch;
test.beforeAll(async () => {
  qa = await startScratch({ env: { DASHBOARD_DEBUG: "1" } });
});
test.afterAll(() => qa.stop());

/** The style rules' selectors (a comma list is split), without the states and pseudo-elements a page at rest does not show. */
function selectorsOf(css: string): string[] {
  const out: string[] = [];
  const walk = (rules: Rule[]) => {
    for (const r of rules) {
      if (!r.at) out.push(...writeTokens(r.prelude).split(",").map((s) => s.trim()));
      else if (r.at !== "keyframes" && r.at !== "font-face" && r.rules) walk(r.rules);
    }
  };
  walk(parseCss(css, []));
  return out.map((s) => s.replace(/::?(hover|focus|focus-visible|active|before|after|placeholder|first-line)\b/g, "")).filter(Boolean);
}

for (const id of Object.keys(PACK_STYLES)) {
  test(`every selector of the ${id} pack's css matches an element wearing the pack`, async ({ page }) => {
    const css = fs.readFileSync(path.join("src/looks/packs", id, "pack.css"), "utf8");
    const selectors = selectorsOf(css);
    expect(selectors.length).toBeGreaterThan(0);
    await page.goto(`${qa.base}/?widget-qa&eager=1&spans=2x2,4x4&settings=${encodeURIComponent(JSON.stringify(PACK_STYLES[id as keyof typeof PACK_STYLES]))}`);
    await page.waitForFunction(() => window.__qaMountAll);
    await page.evaluate(() => window.__qaMountAll?.());
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    const dead = await page.evaluate(
      ({ look, list }) => {
        const root = `[data-look="${look}"]`;
        return list.filter((sel) => (sel === ":scope" ? !document.querySelector(root) : !document.querySelector(`${root} ${sel.replace(/^:scope\s*/, "")}`)));
      },
      { look: id, list: selectors },
    );
    expect(dead).toEqual([]);
  });
}

// The header and chip bars the packs paint (M4): what sits on a bar reads on it, 4.5:1 for text and 3:1 for icons.
for (const id of Object.keys(PACK_STYLES)) {
  test(`what sits on the ${id} pack's header and chip bars reads on them`, async ({ page }) => {
    await page.goto(`${qa.base}/?widget-qa&eager=1&spans=2x2,4x4&settings=${encodeURIComponent(JSON.stringify(PACK_STYLES[id as keyof typeof PACK_STYLES]))}`);
    await page.waitForFunction(() => window.__qaMountAll);
    await page.evaluate(() => window.__qaMountAll?.());
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    const report = await page.evaluate((look) => {
      const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
      const rgba = (c: string) => {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillStyle = "#000";
        ctx.fillStyle = c;
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        return [d[0], d[1], d[2], d[3] / 255];
      };
      const f = (v: number) => (v / 255 <= 0.03928 ? v / 3294.6 : ((v / 255 + 0.055) / 1.055) ** 2.4);
      const lum = (c: number[]) => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
      const ratio = (a: number[], b: number[]) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      const bad: string[] = [];
      let bars = 0;
      for (const bar of document.querySelectorAll(`[data-look="${look}"] [data-part="chip"], [data-look="${look}"] [data-part="tab"], [data-look="${look}"] [data-part="legend"]`)) {
        // a widget that sets its own surface (the Stream Deck's) is not wearing the pack's card, and its text colours do not follow it
        if (bar.closest("[data-wp-tier]")?.getAttribute("data-mat") !== `look-${look}`) continue;
        const bg = rgba(getComputedStyle(bar).backgroundColor);
        if (bg[3] < 0.9) continue;
        bars++;
        for (const el of [bar, ...bar.querySelectorAll("*")]) {
          const cs = getComputedStyle(el);
          if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) < 0.5) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim());
          const icon = el instanceof SVGElement && el.tagName.toLowerCase() === "svg";
          if (!own && !icon) continue;
          const r = ratio(rgba(cs.color), bg);
          if (r < (icon ? 3 : 4.5)) bad.push(`${el.outerHTML.slice(0, 200)} ${icon ? "icon" : "text"} ${cs.color} on ${getComputedStyle(bar).backgroundColor} is ${r.toFixed(2)}:1 (${bar.getAttribute("data-part")})`);
        }
      }
      return { bars, bad: [...new Set(bad)] };
    }, id);
    expect(report.bars).toBeGreaterThan(0);
    expect(report.bad).toEqual([]);
  });
}
