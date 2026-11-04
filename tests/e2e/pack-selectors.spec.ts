import fs from "node:fs";
import path from "node:path";
import { startScratch, type Scratch } from "../../tools/perf/scratch.mjs";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { parseCss, writeTokens, type Rule } from "../../src/looks/css-syntax";
import { expect, gaugeInk, test } from "./fixtures";

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
      // A pack that paints no bar (Neon Stripe, Swiss Mono, Holo) reads its headers on the card's own flat colour.
      if (bars === 0) {
        for (const header of document.querySelectorAll(`[data-wp-tier][data-look="${look}"][data-mat="look-${look}"] [data-part="header"]`)) {
          const card = header.closest("[data-wp-tier]") as HTMLElement;
          const face = rgba(getComputedStyle(card).getPropertyValue("--w-mat-export").trim());
          if (face[3] < 0.9) continue;
          bars++;
          const r = ratio(rgba(getComputedStyle(header).color), face);
          if (r < 4.5) bad.push(`header ${header.textContent?.slice(0, 20)} ${getComputedStyle(header).color} on ${getComputedStyle(card).getPropertyValue("--w-mat-export")} is ${r.toFixed(2)}:1`);
        }
      }
      return { bars, bad: [...new Set(bad)] };
    }, id);
    expect(report.bars).toBeGreaterThan(0);
    expect(report.bad).toEqual([]);
  });
}

// L79: every gauge that is lit without the pack's CSS is lit with it. The kiosk spec asks only that some ring, bar and meter on the screen has
// a value mark, which a pack that hides half of them would pass: here each gauge is compared with its own twin on the same page, the pack's
// `<style data-pack>` switched off (so the meter style and the cell rounding are the same on both sides).
const quiet = (style: object, extra = "") => `?widget-qa&eager=1&spans=1x1,2x2,4x4${extra}&settings=${encodeURIComponent(JSON.stringify(style))}`;

async function wornPage(page: import("@playwright/test").Page, style: object, id: string, extra = "") {
  await page.goto(`${qa.base}/${quiet(style, extra)}`);
  await page.waitForFunction(() => window.__qaMountAll);
  await page.evaluate(() => window.__qaMountAll?.());
  await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
  await expect(page.locator(`style[data-pack="${id}"]`)).toHaveCount(1);
}

/** The gauges `ref` lights and `now` does not. */
const hidden = (ref: { key: string; lit: boolean }[], now: { key: string; lit: boolean }[]) => {
  const at = new Map(now.map((g) => [g.key, g.lit]));
  return ref.filter((g) => g.lit && at.get(g.key) !== true).map((g) => g.key);
};

for (const id of Object.keys(PACK_STYLES)) {
  test(`every gauge lit without the ${id} pack's css is lit with it`, async ({ page }) => {
    // three spans of every widget, twice: slow under the suite's parallel workers
    test.slow();
    await wornPage(page, PACK_STYLES[id as keyof typeof PACK_STYLES], id);
    const worn = await page.evaluate(gaugeInk);
    await page.evaluate(() => document.querySelectorAll("style[data-pack]").forEach((el) => ((el as HTMLStyleElement).disabled = true)));
    const twin = await page.evaluate(gaugeInk);
    expect(twin.filter((g) => g.lit).length).toBeGreaterThan(10);
    expect(worn.map((g) => g.key)).toEqual(twin.map((g) => g.key));
    expect(hidden(twin, worn)).toEqual([]);
  });
}

test("the gauge-ink check catches a pack that hides some of its gauges and not all", async ({ page }) => {
  test.slow();
  await wornPage(page, PACK_STYLES.term, "term");
  const ref = await page.evaluate(gaugeInk);
  // what a bad pack could do: no ink on every other bar, meter and ring
  await page.addStyleTag({ content: '[data-part="bar"]:nth-of-type(odd) *, [data-part="meter"]:nth-of-type(odd) *, [data-part="ring"]:nth-of-type(odd) circle { background: none !important; stroke: none !important; }' });
  const now = await page.evaluate(gaugeInk);
  expect(now.some((g) => g.lit)).toBe(true);
  expect(hidden(ref, now).length).toBeGreaterThan(0);
});

// L79: the box-legend title sits on the frame's line (6 px in) whatever the card's zoom: the shell zooms the padded content of a card
// that is larger than the design size, and the legend is lifted inside that zoom.
test("the term pack's box legend sits on the frame line on a zoomed card", async ({ page }) => {
  test.slow();
  // Size % 150 zooms the padded content of every card (and the auto zoom of a larger box does the same)
  await wornPage(page, { ...PACK_STYLES.term, scale: 150 }, "term");
  await expect(page.locator('[data-wp-tier][data-look="term"] [data-part="legend"]').first()).toBeAttached({ timeout: 10_000 });
  const report = await page.evaluate(() => {
    const rows: { zoom: number; off: number }[] = [];
    for (const card of document.querySelectorAll('[data-wp-tier][data-look="term"]')) {
      const legend = card.querySelector('[data-part="legend"]');
      const frame = [...card.children].find((c) => c.className.includes("absolute") && getComputedStyle(c).borderTopWidth !== "0px");
      const padded = legend?.closest("header")?.parentElement;
      if (!legend || !frame || !padded) continue;
      const l = legend.getBoundingClientRect();
      const f = frame.getBoundingClientRect();
      // the frame's line is its top border, centred on its top edge plus half the border
      rows.push({ zoom: Number(getComputedStyle(padded).zoom), off: Math.abs(l.top + l.height / 2 - (f.top + parseFloat(getComputedStyle(frame).borderTopWidth) / 2)) });
    }
    return rows;
  });
  expect(report.length).toBeGreaterThan(5);
  expect(report.some((r) => r.zoom !== 1)).toBe(true);
  expect(report.filter((r) => r.off > 1.5)).toEqual([]);
});
