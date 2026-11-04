import fs from "node:fs";
import path from "node:path";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { expect, manifest, test, watchErrors } from "./fixtures";

// A built-in pack paints with CSS, layers and effects that could hide what a widget shows (ledger L71, spec Readability): this
// opens the kiosk with each pack worn and reads what the browser drew. The overlay stays under its alpha cap, nothing the
// pack draws is click-blocking, the text and the marks of every card are effectively visible (opacity down the tree at least
// 0.5, a colour that is not transparent) and every gauge has ink. A user pack gets the same check in P12's validator.
// Set P10_SHOTS=<folder> to also save one kiosk screenshot per pack there (docs/investigations/look-system/shots/p10-<id>.png).

const OVERLAY_ALPHA_MAX = 0.4;
const MIN_OPACITY = 0.5;
const light = manifest.profiles.light;

for (const id of Object.keys(PACK_STYLES)) {
  test(`the ${id} pack hides nothing: overlay alpha, effective opacity, text and gauge ink`, async ({ page, scratch }) => {
    const { errors } = watchErrors(page);
    const file = path.join(scratch.dataDir, "config.json");
    const stored = JSON.parse(fs.readFileSync(file, "utf8"));
    stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
    fs.writeFileSync(file, JSON.stringify(stored));
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`${scratch.base}/?kiosk=1&profile=${light}`);
    await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.light.length);
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
        const cards = [...document.querySelectorAll("[data-wp-tier]")];
        if (!cards.length) problems.push("no cards");
        for (const card of cards) {
          if (!card.textContent?.trim()) problems.push("a card has no text");
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
          // every gauge has ink: a painted shape or a background that shows
          for (const gauge of card.querySelectorAll('[data-part="ring"], [data-part="bar"], [data-part="meter"]')) {
            const painted = [gauge, ...gauge.querySelectorAll("*")].some((n) => {
              const cs = getComputedStyle(n);
              if (effective(n, card) < minOpacity || cs.visibility === "hidden") return false;
              const shape = n instanceof SVGElement && ((cs.stroke !== "none" && Number(cs.strokeWidth) > 0) || cs.fill !== "none");
              return shape || alphaOf(cs.backgroundColor) > 0 || cs.backgroundImage !== "none";
            });
            if (!painted) problems.push(`a ${gauge.getAttribute("data-part")} has no ink`);
          }
        }
        return { problems, cards: cards.length };
      },
      { alphaMax: OVERLAY_ALPHA_MAX, minOpacity: MIN_OPACITY },
    );
    expect(report.cards).toBeGreaterThan(0);
    expect(report.problems).toEqual([]);
    if (process.env.P10_SHOTS) {
      // the heavy screen shows the most widgets
      await page.goto(`${scratch.base}/?kiosk=1&profile=${manifest.profiles.heavy}`);
      await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: path.join(process.env.P10_SHOTS, `p10-${id}.png`) });
    }
    expect(errors).toEqual([]);
  });
}
