import fs from "node:fs";
import path from "node:path";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { expect, manifest, test, watchErrors } from "./fixtures";

// A built-in pack paints with CSS, layers and effects that could hide what a widget shows (ledger L71, spec Readability): this
// opens the kiosk with each pack worn and reads what the browser drew. The overlay stays under its alpha cap, nothing the
// pack draws is click-blocking, the text and the marks of every card are effectively visible (opacity down the tree at least
// 0.5, a colour that is not transparent) and every gauge's value mark is painted, unlike its track and with contrast against the card (a ring's arc, a bar's lit cells). Wearing a pack makes no request to a font host (D23). A user pack gets the same check in P12's validator.
// Set P10_SHOTS=<folder> to also save one kiosk screenshot per pack there (docs/investigations/look-system/shots/p10-<id>.png).

const OVERLAY_ALPHA_MAX = 0.4;
const MIN_OPACITY = 0.5;
// the heavy screen shows the most widgets: every gauge kind is on it
const heavy = manifest.profiles.heavy;

for (const id of Object.keys(PACK_STYLES)) {
  test(`the ${id} pack hides nothing and loads no font host: overlay alpha, effective opacity, text, value marks`, async ({ page, scratch }) => {
    const { errors } = watchErrors(page);
    const requests: string[] = [];
    page.on("request", (req) => requests.push(req.url()));
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
    // the pack loaded: its Look's mark is on the cards and its stage layers are drawn
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    await expect(page.locator(`[data-pack-layer][data-look="${id}"]`).first()).toBeAttached();
    await page.waitForTimeout(1500);

    const report = await page.evaluate(
      ({ alphaMax, minOpacity }) => {
        const problems: string[] = [];
        const effective = (el: Element, stopAt: Element | null) => {
          let o = 1;
          for (let n: Element | null = el; n && n !== stopAt?.parentElement; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
          return o;
        };
        const alphaOf = (c: string) => (c.startsWith("rgba") ? Number(c.split(",")[3].replace(")", "")) : c === "transparent" ? 0 : 1);
        // the stage: layers and effects never take a click and the overlays stay under the cap
        for (const el of document.querySelectorAll("[data-pack-layer], [data-pack-effect]")) {
          const cs = getComputedStyle(el);
          if (cs.pointerEvents !== "none") problems.push(`${el.getAttribute("data-pack-effect") ?? "layer"} takes pointer events`);
          if (el.hasAttribute("data-pack-effect") && Number(cs.opacity) > alphaMax) problems.push(`effect ${el.getAttribute("data-pack-effect")} opacity ${cs.opacity} is over ${alphaMax}`);
          if (el.getAttribute("data-pack-layer") === "overlay" && alphaOf(cs.backgroundColor) > alphaMax) problems.push(`overlay background alpha ${cs.backgroundColor}`);
        }
        // a colour string of any syntax as [r, g, b, a]: the canvas parses color-mix and the rest
        const ctx = document.createElement("canvas").getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
        const rgba = (c: string): number[] => {
          ctx.clearRect(0, 0, 1, 1);
          ctx.fillStyle = "#000";
          ctx.fillStyle = c;
          ctx.fillRect(0, 0, 1, 1);
          const d = ctx.getImageData(0, 0, 1, 1).data;
          return [d[0], d[1], d[2], d[3] / 255];
        };
        const lum = ([r, g, b]: number[]) => {
          const f = (v: number) => (v / 255 <= 0.03928 ? v / 3294.6 : ((v / 255 + 0.055) / 1.055) ** 2.4);
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
        };
        const ratio = (x: number[], y: number[]) => (Math.max(lum(x), lum(y)) + 0.05) / (Math.min(lum(x), lum(y)) + 0.05);
        // the card's face: the nearest opaque background up the tree
        const cardBg = (card: Element) => {
          for (let n: Element | null = card; n; n = n.parentElement) {
            const c = rgba(getComputedStyle(n).backgroundColor);
            if (c[3] > 0.9) return c;
          }
          return [0, 0, 0, 1];
        };
        const probe = document.createElement("i");
        probe.style.background = "var(--w-track)";
        const marks: Record<string, number> = {};
        const cards = [...document.querySelectorAll("[data-wp-tier]")];
        if (!cards.length) problems.push("no cards");
        else if (!cards.some((c) => c.textContent?.trim())) problems.push("no card has text");
        for (const card of cards) {
          card.appendChild(probe);
          const track = rgba(getComputedStyle(probe).backgroundColor);
          probe.remove();
          const walker = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
          for (let t = walker.nextNode(); t; t = walker.nextNode()) {
            if (!t.textContent?.trim() || !t.parentElement) continue;
            const el = t.parentElement;
            const cs = getComputedStyle(el);
            if (cs.visibility === "hidden" || cs.display === "none") continue;
            const gradientText = cs.webkitTextFillColor === "rgba(0, 0, 0, 0)" && cs.backgroundClip === "text" && cs.backgroundImage !== "none";
            if (alphaOf(cs.webkitTextFillColor || cs.color) === 0 && !gradientText) problems.push(`text "${t.textContent.trim().slice(0, 20)}" has a transparent fill`);
            const o = effective(el, card);
            if (o < minOpacity) problems.push(`text "${t.textContent.trim().slice(0, 20)}" is at opacity ${o.toFixed(2)}`);
          }
          // every gauge has a value mark you can see: a ring's value arc, a bar's or meter's lit cells
          for (const gauge of card.querySelectorAll('[data-part="ring"], [data-part="bar"], [data-part="meter"]')) {
            const part = gauge.getAttribute("data-part");
            if (part === "ring") {
              for (const arc of gauge.querySelectorAll("circle[data-wp-ring]")) {
                marks.ring = (marks.ring ?? 0) + 1;
                const cs = getComputedStyle(arc);
                const track = arc.previousElementSibling ? getComputedStyle(arc.previousElementSibling) : null;
                const [r, g, b, a] = rgba(cs.stroke);
                if (cs.stroke === "none" || a === 0) problems.push("a ring's value arc has no stroke");
                else if (!(parseFloat(cs.strokeWidth) > 0)) problems.push("a ring's value arc has no stroke width");
                else if (effective(arc, card) * Number(cs.strokeOpacity) < minOpacity) problems.push("a ring's value arc is faint");
                else if (track && cs.stroke === track.stroke) problems.push("a ring's value arc is drawn in its track colour");
                else if (ratio([r, g, b], cardBg(card)) < 1.3) problems.push(`a ring's value arc ${cs.stroke} has no contrast with the card`);
              }
              continue;
            }
            // the lit cells and the fill: painted descendants that are not the track colour
            const lit = [...gauge.querySelectorAll("*")].filter((n) => {
              const cs = getComputedStyle(n);
              return (rgba(cs.backgroundColor)[3] > 0 && rgba(cs.backgroundColor).join() !== track.join()) || cs.backgroundImage !== "none";
            });
            const bg = cardBg(card);
            for (const n of lit) {
              const cs = getComputedStyle(n);
              if (effective(n, card) < minOpacity || cs.visibility === "hidden") problems.push(`a ${part}'s value mark is hidden`);
              else if (cs.backgroundImage === "none" && ratio(rgba(cs.backgroundColor), bg) < 1.3) problems.push(`a ${part}'s value mark ${cs.backgroundColor} has no contrast with the card`);
            }
            marks[part as string] = (marks[part as string] ?? 0) + lit.length;
          }
        }
        // a value of 0 lights nothing, so a bar may be empty, but across the screen every gauge kind that is drawn has a value mark
        for (const part of ["ring", "bar", "meter"]) if (cards.some((c) => c.querySelector(`[data-part="${part}"]`)) && !marks[part]) problems.push(`no ${part} on the screen has a lit value mark`);
        return { problems, cards: cards.length };
      },
      { alphaMax: OVERLAY_ALPHA_MAX, minOpacity: MIN_OPACITY },
    );
    expect(report.cards).toBeGreaterThan(0);
    expect(report.problems).toEqual([]);
    // D23: a worn pack asks no font host for its type (it is bundled); the page's own Geist (the app default, worn with Classic too) is not the pack's
    expect(requests.filter((u) => /fonts\.(googleapis|gstatic)\.com/.test(u) && !/family=Geist|\/geist/i.test(u))).toEqual([]);
    if (process.env.P10_SHOTS) {
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(process.env.P10_SHOTS, `p10-${id}.png`) });
    }
    expect(errors).toEqual([]);
  });
}

// M3 of the P10 review: with "Reserve space" on, the zones stay clear of the island on the pack's own edge (Term's is the bottom).
for (const id of Object.keys(PACK_STYLES)) {
  test(`the ${id} pack's island edge keeps the zones clear when space is reserved`, async ({ page, scratch }) => {
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: { island?: object }) => ({ ...p, island: p.island && { ...p.island, reserve: true }, widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    const island = page.locator("[data-island]").first();
    await expect(island).toBeVisible();
    await page.waitForTimeout(800);
    const ib = (await island.boundingBox()) as { y: number; height: number };
    const zones = await page.locator(manifest.kioskZoneSelector).evaluateAll((els) => els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0 && r.height > 0).map((r) => ({ top: r.top, bottom: r.bottom })));
    const bottom = id === "term";
    const overlapping = zones.filter((z) => (bottom ? z.bottom > ib.y + 1 : z.top < ib.y + ib.height - 1));
    expect(overlapping).toEqual([]);
  });
}

// L69: layers per page. The compositor's own count needs a browser trace, so this counts what makes a layer by its CSS reasons (will-change on
// transform, opacity or filter; backdrop-filter; fixed position; 3D transform; canvas and video; a running animation) on the heavy screen.
// The pack stays under its budget in tools/perf/budgets.json (`layersPerPage`: this count at the build that set it, plus 25 %).
const budgets = JSON.parse(fs.readFileSync("tools/perf/budgets.json", "utf8")).packs ?? JSON.parse(fs.readFileSync("tools/perf/budgets.json", "utf8"));
for (const id of Object.keys(PACK_STYLES)) {
  test(`the ${id} pack stays inside its layers-per-page budget`, async ({ page, scratch }) => {
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
    await expect(page.locator(`[data-pack-layer][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    await page.waitForTimeout(2500);
    const layers = await page.evaluate(() => {
      const animating = new Set(document.getAnimations().flatMap((a) => (a.effect instanceof KeyframeEffect && a.effect.target ? [a.effect.target] : [])));
      let n = 0;
      for (const el of document.querySelectorAll("body *")) {
        const cs = getComputedStyle(el);
        const reason = /transform|opacity|filter/.test(cs.willChange) || (cs.backdropFilter && cs.backdropFilter !== "none") || cs.position === "fixed" || /matrix3d|perspective/.test(cs.transform) || el.tagName === "CANVAS" || el.tagName === "VIDEO" || animating.has(el);
        if (reason) n++;
      }
      return n;
    });
    expect(layers).toBeGreaterThan(0);
    expect(layers).toBeLessThanOrEqual(budgets[id].layersPerPage);
  });
}
