import fs from "node:fs";
import path from "node:path";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { expect, manifest, test } from "./fixtures";

// L72 (P11, Holo): the kiosk writes a zone's id (`data-zone-id`) only for a page whose pack draws connectors, and then the stage draws an
// elbow from the page's largest zone to each other zone. Every other page keeps the markup it had (no `data-zone-id`, no connector layer).

const heavy = manifest.profiles.heavy;

async function openKiosk(page: import("@playwright/test").Page, scratch: { dataDir: string; base: string }, id: string) {
  const file = path.join(scratch.dataDir, "config.json");
  const stored = JSON.parse(fs.readFileSync(file, "utf8"));
  stored.profiles = stored.profiles.map((p: object) => ({ ...p, widgetTheme: { values: PACK_STYLES[id as keyof typeof PACK_STYLES] } }));
  fs.writeFileSync(file, JSON.stringify(stored));
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`${scratch.base}/?kiosk=1&profile=${heavy}`);
  await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
  await expect(page.locator(`[data-pack-layer][data-look="${id}"]`).first()).toBeAttached({ timeout: 10_000 });
}

test("Holo's kiosk page writes the zone ids and draws a connector from the largest zone to every other", async ({ page, scratch }) => {
  await openKiosk(page, scratch, "holo");
  const zones = manifest.zones.heavy.length;
  await expect(page.locator("[data-zone-id]")).toHaveCount(zones);
  // the elbows and their end dots: one path and one dot per spoke
  await expect(page.locator("[data-pack-connectors] path")).toHaveCount(zones - 1);
  await expect(page.locator("[data-pack-connectors] circle")).toHaveCount(zones - 1);
  const report = await page.evaluate(() => {
    const svg = document.querySelector("[data-pack-connectors]") as SVGSVGElement;
    const origin = svg.getBoundingClientRect();
    const boxes = [...document.querySelectorAll("[data-zone-id]")].map((el) => el.getBoundingClientRect());
    // every spoke starts and ends on a zone edge: its end points are on the border of a zone's rect (1 px)
    const near = (x: number, y: number) => boxes.some((r) => x >= r.left - 1 && x <= r.right + 1 && y >= r.top - 1 && y <= r.bottom + 1);
    const ends = [...svg.querySelectorAll("circle")].map((c) => near(origin.left + Number(c.getAttribute("cx")), origin.top + Number(c.getAttribute("cy"))));
    return { ends, size: [origin.width, origin.height], pointerEvents: getComputedStyle(svg).pointerEvents, hidden: svg.getAttribute("aria-hidden") };
  });
  expect(report.ends.every(Boolean)).toBe(true);
  // the layer covers the page (an svg with only `inset-0` keeps its 300 x 150 default and clips every line outside it)
  expect(report.size).toEqual([1280, 720]);
  expect(report.pointerEvents).toBe("none");
  expect(report.hidden).toBe("true");
});

for (const id of ["term", "swiss-mono", "overdrive", "neon-stripe"]) {
  test(`a page that wears ${id} keeps the kiosk markup it had: no zone ids, no connector layer`, async ({ page, scratch }) => {
    await openKiosk(page, scratch, id);
    await expect(page.locator("[data-zone-id]")).toHaveCount(0);
    await expect(page.locator("[data-pack-connectors]")).toHaveCount(0);
  });
}
