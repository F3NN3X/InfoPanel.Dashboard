import fs from "node:fs";
import path from "node:path";
import { PACK_STYLES } from "../../tools/qa/pack-styles.mjs";
import { expect, manifest, test } from "./fixtures";

// L72 (P11, Holo): the kiosk writes a zone's id (`data-zone-id`) only for a page whose pack draws connectors, and then the stage draws an
// elbow from the largest widget zone to each other zone. Every other page keeps the markup it had (no `data-zone-id`, no connector layer).

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
  const spokes = zones - 2;
  await expect(page.locator("[data-zone-id]")).toHaveCount(zones);
  // the elbows and their end dots: one path and one dot per spoke; the page's InfoPanel items layer is a surface, not a zone to join
  await expect(page.locator("[data-pack-connectors] path")).toHaveCount(spokes);
  await expect(page.locator("[data-pack-connectors] circle")).toHaveCount(spokes);
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

test("Holo's connectors follow a zone that moves without resizing, on scroll and when an element mounts", async ({ page, scratch }) => {
  await openKiosk(page, scratch, "holo");
  await expect(page.locator("[data-pack-connectors] circle")).toHaveCount(manifest.zones.heavy.length - 2);
  const ends = () => page.evaluate(() => [...document.querySelectorAll("[data-pack-connectors] circle")].map((c) => `${c.getAttribute("cx")},${c.getAttribute("cy")}`));
  const before = await ends();
  // every zone shifts 40 px down (no resize), and the page scrolls: the lines are measured again
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("[data-zone-id]")) el.style.transform = "translate(30px, 40px)";
    document.dispatchEvent(new Event("scroll"));
  });
  await expect.poll(ends).not.toEqual(before);
  const scrolled = await ends();
  // a node mounting (a late zone, a lazy widget) measures again too
  await page.evaluate(() => {
    for (const el of document.querySelectorAll<HTMLElement>("[data-zone-id]")) el.style.transform = "translate(60px, 80px)";
    document.body.appendChild(document.createElement("i"));
  });
  await expect.poll(ends).not.toEqual(scrolled);
});

for (const id of ["term", "swiss-mono", "overdrive", "neon-stripe"]) {
  test(`a page that wears ${id} keeps the kiosk markup it had: no zone ids, no connector layer`, async ({ page, scratch }) => {
    await openKiosk(page, scratch, id);
    await expect(page.locator("[data-zone-id]")).toHaveCount(0);
    await expect(page.locator("[data-pack-connectors]")).toHaveCount(0);
  });
}
