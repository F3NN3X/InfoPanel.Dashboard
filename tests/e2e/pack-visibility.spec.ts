import fs from "node:fs";
import path from "node:path";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { expect, manifest, settled, test, watchErrors } from "./fixtures";

// A built-in pack paints with CSS, layers and effects that could hide what a widget shows (ledger L71, spec Readability): this
// opens the kiosk with each pack worn and reads what the browser drew. The overlay stays under its alpha cap, nothing the
// pack draws is click-blocking, the text and the marks of every card are effectively visible (opacity down the tree at least
// 0.5, a colour that is not transparent) and every gauge's value mark is painted, unlike its track and with contrast against the card (a ring's arc, a bar's lit cells). Wearing a pack makes no request to a font host (D23). A user pack gets the same check in P12's validator.
// Set PACK_SHOTS=<folder> (and PACK_SHOTS_PREFIX, default p10) to also save one kiosk screenshot per pack there (docs/investigations/look-system/shots/<prefix>-<id>.png).

const OVERLAY_ALPHA_MAX = 0.4;
const MIN_OPACITY = 0.5;
// the heavy screen shows the most widgets: every gauge kind is on it
const heavy = manifest.profiles.heavy;

for (const id of Object.keys(PACK_STYLES)) {
  test(`the ${id} pack hides nothing and loads no font host: overlay alpha, effective opacity, text, value marks`, async ({ page, scratch }) => {
    const { errors } = watchErrors(page);
    const requests: string[] = [];
    // a font or a stylesheet from another origin is a font host, whichever it is; the bundled faces are the app's own origin
    page.on("request", (req) => (["font", "stylesheet"].includes(req.resourceType()) || /fonts\.(googleapis|gstatic)\.com/.test(req.url())) && new URL(req.url()).origin !== new URL(page.url()).origin && requests.push(req.url()));
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    // a shot keeps the zones clear of the island pill ("Reserve space"), so no header sits under it (L89)
    const reserve = !!process.env.PACK_SHOTS;
    stored.profiles = stored.profiles.map((p: { island?: object }) => ({ ...p, ...(reserve && p.island ? { island: { ...p.island, reserve: true } } : null), widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
    // the pack loaded: its Look's mark is on the cards and its stage layers are drawn
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    await expect(page.locator(`[data-pack-layer][data-look="${id}"]`).first()).toBeAttached();
    await settled(page, manifest.kioskZoneSelector);

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
                // a gradient stroke (`ring-fill`): every stop of the gradient it names is drawn, and each shows against the card
                const gradient = /^url\(["']?#([^"')]+)/.exec(cs.stroke);
                if (gradient) {
                  const stops = [...(arc.closest("svg")?.querySelectorAll(`#${CSS.escape(gradient[1])} stop`) ?? [])].map((stop) => getComputedStyle(stop));
                  marks.gradient = (marks.gradient ?? 0) + 1;
                  if (stops.length < 2) problems.push("a ring's gradient has fewer than two stops");
                  for (const stop of stops) if (rgba(stop.stopColor)[3] === 0 || Number(stop.stopOpacity) < minOpacity) problems.push("a ring's gradient has a stop that is not drawn");
                  else if (ratio(rgba(stop.stopColor), cardBg(card)) < 1.3) problems.push(`a ring's gradient stop ${stop.stopColor} has no contrast with the card`);
                  if (!(parseFloat(cs.strokeWidth) > 0) || effective(arc, card) * Number(cs.strokeOpacity) < minOpacity) problems.push("a ring's gradient arc is not drawn");
                  continue;
                }
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
        return { problems, cards: cards.length, gradients: marks.gradient ?? 0 };
      },
      { alphaMax: OVERLAY_ALPHA_MAX, minOpacity: MIN_OPACITY },
    );
    expect(report.cards).toBeGreaterThan(0);
    // the packs whose rings carry a gradient (`ring-fill`) draw it, and the check above read its stops
    if (id === "night-glow" || id === "black-and-gold") expect(report.gradients).toBeGreaterThan(0);
    expect(report.problems).toEqual([]);
    // D23: a worn pack asks no font host for its type (it is bundled). The app's own Geist stack (Google Fonts, worn with Classic too) is the one family a
    // font host may be asked for; a request for any other family, or from any other host, fails.
    const families = (u: string) => new URL(u).searchParams.getAll("family").map((f) => f.split(":")[0].replace(/\+/g, " "));
    expect(requests.filter((u) => !(new URL(u).hostname === "fonts.gstatic.com" || (new URL(u).hostname === "fonts.googleapis.com" && families(u).every((f) => f === "Geist" || f === "Geist Mono"))))).toEqual([]);
    if (process.env.PACK_SHOTS) {
      await settled(page, manifest.kioskZoneSelector);
      await page.screenshot({ path: path.join(process.env.PACK_SHOTS, `${process.env.PACK_SHOTS_PREFIX ?? "p10"}-${id}.png`) });
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
    await settled(page, manifest.kioskZoneSelector);
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
    await settled(page, manifest.kioskZoneSelector);
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

// Overdrive's chamfer clips two corners of every card. At Compact density (padding 4) the cut, as the browser resolves it, must stay
// out of the content box: a point `pad` in from both edges of a corner is clipped when the cut is over twice the padding (P11a review M5).
test("the overdrive chamfer stays inside the padding of every card at Compact density", async ({ page, scratch }) => {
  const file = path.join(scratch.dataDir, "config.json");
  const stored = JSON.parse(fs.readFileSync(file, "utf8"));
  stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: { ...PACK_STYLES.overdrive, padding: "4", gap: "4" } } }));
  fs.writeFileSync(file, JSON.stringify(stored));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
  await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
  await expect(page.locator('[data-wp-tier][data-look="overdrive"]').first()).toBeAttached({ timeout: 10_000 });
  await settled(page, manifest.kioskZoneSelector);
  const cuts = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("[data-look]")]
      .map((el) => getComputedStyle(el).clipPath)
      .filter((c) => c !== "none")
      .map((c) => Number(/100% (\d+(?:\.\d+)?)px/.exec(c)?.[1] ?? Number.NaN)),
  );
  expect(cuts.length).toBeGreaterThan(0);
  for (const cut of cuts) expect(cut).toBeLessThanOrEqual(2 * 4);
});

// P11b (Liquid Glass, the first Look with a real blur on by default): at most 8 backdrop layers a page (section 9.3), counted over every
// element that draws one. The island and the alert layer take one each, so a card blurs in the first 6 zones; a card in the seventh zone or
// later fills to its fallback alpha (0.90); the blurs inside a card (GlassPill, the info plates) are off. The studio canvas follows the kiosk.
const BACKDROP_LIMIT = 8;
const CARD_ZONES = 6;
async function sixteenZones(scratch: { dataDir: string }, style: Record<string, unknown>) {
  const file = path.join(scratch.dataDir, "config.json");
  const stored = JSON.parse(fs.readFileSync(file, "utf8"));
  const more = (p: { pages: { placements: { id: string; module: string }[] }[] }) =>
    Array.from({ length: 8 }, (_, i) => ({ ...p.pages[0].placements.find((z) => z.module === "CoreHeatmap"), id: `more-${i}`, colStart: 1 + i, rowStart: 1, colSpan: 1, rowSpan: 1 }));
  stored.profiles = stored.profiles.map((p: { pages: { placements: object[] }[] }) => ({
    ...p,
    widgetTheme: { values: style },
    pages: p.pages.map((pg, n) => (n === 0 ? { ...pg, placements: [...pg.placements, ...more(p as never)] } : pg)),
  }));
  fs.writeFileSync(file, JSON.stringify(stored));
}
/** Every element on the page with a backdrop filter, and each card with its zone's place. */
const readBackdrops = (page: import("@playwright/test").Page, zones: string) =>
  page.evaluate((zoneSel) => {
    const layers = [...document.querySelectorAll<HTMLElement>("*")].filter((e) => {
      const cs = getComputedStyle(e);
      return (cs.backdropFilter && cs.backdropFilter !== "none") || (cs.getPropertyValue("-webkit-backdrop-filter") && cs.getPropertyValue("-webkit-backdrop-filter") !== "none");
    }).length;
    const cards = [...document.querySelectorAll(zoneSel)].flatMap((zone, i) =>
      [...zone.querySelectorAll<HTMLElement>("[data-wp-tier][data-mat-blur]")].map((c) => {
        const cs = getComputedStyle(c);
        return { zone: i + 1, blurred: cs.backdropFilter !== "none", alphas: [...cs.backgroundImage.matchAll(/rgba\([^)]*?([\d.]+)\)/g)].map((m) => Number(m[1])) };
      }),
    );
    return { layers, cards };
  }, zones);

for (const id of ["liquid-glass", "night-glow"]) {
  test(`a page of sixteen ${id} zones draws at most ${BACKDROP_LIMIT} backdrop layers: cards blur in the first ${CARD_ZONES} zones only`, async ({ page, scratch }) => {
    await sixteenZones(scratch, PACK_STYLES[id]);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length + 8);
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    await settled(page, manifest.kioskZoneSelector);
    const { layers, cards } = await readBackdrops(page, "[data-page-grid] > *");
    expect(layers).toBeLessThanOrEqual(BACKDROP_LIMIT);
    const blurred = cards.filter((c) => c.blurred);
    expect(blurred.length).toBeGreaterThan(0);
    expect(blurred.map((c) => c.zone).every((z) => z <= CARD_ZONES)).toBe(true);
    expect(blurred.length).toBe(cards.filter((c) => c.zone <= CARD_ZONES).length);
    const rest = cards.filter((c) => c.zone > CARD_ZONES);
    expect(rest.length).toBeGreaterThan(0);
    expect(rest.filter((c) => c.blurred)).toEqual([]);
    for (const c of rest) expect(Math.min(...c.alphas)).toBeGreaterThanOrEqual(0.9);
  });
}

// A pack whose cards do not blur is untouched by the limit: it has no blurred card to limit, and the rule draws nothing on it.
test("a page of sixteen Term zones has no backdrop layer, so the limit changes nothing", async ({ page, scratch }) => {
  await sixteenZones(scratch, PACK_STYLES.term);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
  await expect(page.locator('[data-wp-tier][data-look="term"]').first()).toBeAttached({ timeout: 10_000 });
  await settled(page, manifest.kioskZoneSelector);
  const { layers, cards } = await readBackdrops(page, "[data-page-grid] > *");
  expect(cards).toEqual([]);
  expect(layers).toBeLessThanOrEqual(1);
});

test("the studio canvas holds a page of sixteen Liquid Glass zones to the same limit", async ({ page, scratch }) => {
  await sixteenZones(scratch, PACK_STYLES["liquid-glass"]);
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto(`${scratch.base}/?studio=1&profile=${heavy}`);
  await page.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.locator("[data-studio-page] [data-wp-tier][data-look=\"liquid-glass\"]").first()).toBeAttached({ timeout: 15_000 });
  await expect.poll(() => page.locator("[data-studio-page] [data-zone-id]").count()).toBeGreaterThan(CARD_ZONES + 2);
  const { cards } = await readBackdrops(page, "[data-studio-page] [data-zone-id]");
  const blurred = cards.filter((c) => c.blurred);
  expect(blurred.length).toBeGreaterThan(0);
  expect(blurred.length).toBeLessThanOrEqual(CARD_ZONES);
  expect(cards.filter((c) => c.zone > CARD_ZONES && c.blurred)).toEqual([]);
});

// The same page in lite mode, and with a card whose blur is off: a worn pack's blurred card has no backdrop filter at all (the cap is 0 and the
// filter is `none`, not `blur(0)`, which keeps a backdrop layer) and fills to the fallback alpha (0.90), so its text keeps the contrast the blur was to give.
test("Liquid Glass in lite mode draws no backdrop filter and fills its card to the fallback alpha", async ({ page, scratch }) => {
  const file = path.join(scratch.dataDir, "config.json");
  const stored = JSON.parse(fs.readFileSync(file, "utf8"));
  stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: PACK_STYLES["liquid-glass"] } }));
  fs.writeFileSync(file, JSON.stringify(stored));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
  await expect(page.locator('[data-wp-tier][data-look="liquid-glass"]').first()).toBeAttached({ timeout: 10_000 });
  await settled(page, manifest.kioskZoneSelector);
  const read = () =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("[data-wp-tier][data-mat-blur]")].map((c) => {
        const cs = getComputedStyle(c);
        return { filter: cs.backdropFilter, alphas: [...cs.backgroundImage.matchAll(/rgba\([^)]*?([\d.]+)\)/g)].map((m) => Number(m[1])) };
      }),
    );
  const live = await read();
  expect(live.length).toBeGreaterThan(0);
  expect(live.every((c) => c.filter !== "none")).toBe(true);
  await page.evaluate(() => document.documentElement.setAttribute("data-lite-motion", ""));
  const lite = await read();
  expect(lite.length).toBe(live.length);
  expect(lite.filter((c) => c.filter !== "none")).toEqual([]);
  for (const c of lite) expect(Math.min(...c.alphas)).toBeGreaterThanOrEqual(0.9);
});

// L25: the island's pill and the alert cards wear the worn pack's colours, not black and the app's dark card: Paper's pill is its light surface
// with dark text. The alert layer is built in the page (the cards need a live alert), so this checks the stylesheet's rule against the real cascade.
for (const [id, surface] of [["paper", "rgb(255, 255, 255)"], ["night-glow", "rgb(14, 18, 48)"]] as const) {
  test(`the ${id} pack dresses the island pill and the alert cards in its own colours`, async ({ page, scratch }) => {
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: { island?: object }) => ({ ...p, island: p.island && { ...p.island, tint: "black", opacity: 100, placement: "overlay" }, widgetTheme: { values: PACK_STYLES[id] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
    await expect(page.locator(`[data-wp-tier][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
    await settled(page, manifest.kioskZoneSelector);
    const read = await page.evaluate(async () => {
      const pill = document.querySelector<HTMLElement>("[data-island]");
      const styled = [pill, ...(pill?.querySelectorAll<HTMLElement>("*") ?? [])].find((e) => e && getComputedStyle(e).backgroundColor !== "rgba(0, 0, 0, 0)");
      const cs = styled && getComputedStyle(styled);
      const layer = document.createElement("div");
      layer.setAttribute("data-alert-layer", "");
      layer.setAttribute("data-pack-chrome", "");
      layer.style.cssText = "--pack-chrome-fill:#112233;--pack-chrome-ink:#ddeeff;--pack-chrome-edge:#445566";
      layer.innerHTML = '<div data-part="alert" class="bg-card text-card-foreground"><div class="text-muted-foreground">x</div></div>';
      document.body.append(layer);
      const card = getComputedStyle(layer.querySelector('[data-part="alert"]')!);
      const muted = getComputedStyle(layer.querySelector(".text-muted-foreground")!);
      const out = { pill: cs && { background: cs.backgroundColor, color: cs.color }, alert: { background: card.backgroundColor, color: card.color, muted: muted.color } };
      layer.remove();
      return out;
    });
    expect(read.pill?.background).toBe(surface);
    expect(read.pill?.color).not.toBe(read.pill?.background);
    expect(read.alert.background).toBe("rgb(17, 34, 51)");
    expect(read.alert.color).toBe("rgb(221, 238, 255)");
    expect(read.alert.muted).not.toBe(read.alert.color);
  });
}
