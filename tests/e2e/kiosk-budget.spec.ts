import fs from "node:fs";
import { expect, manifest, test } from "./fixtures";

// The deterministic load budget (tools/perf/budgets.json): requests to the server while the heavy kiosk loads.
const budgets = JSON.parse(fs.readFileSync("tools/perf/budgets.json", "utf8")) as { kioskLoadRequests: number };

/** How long the page is watched after its zones appear: a request that comes later than this is not part of the load. */
const SETTLE_MS = 2000;

test("the heavy kiosk loads within its request budget", async ({ page, scratch }) => {
  const requests: string[] = [];
  page.on("request", (req) => {
    if (req.url().startsWith(scratch.base)) requests.push(req.url().slice(scratch.base.length));
  });
  await page.goto(`${scratch.base}/?kiosk=1&profile=${manifest.profiles.heavy}`);
  await expect(page.locator(manifest.kioskZoneSelector)).toHaveCount(manifest.zones.heavy.length);
  await page.waitForTimeout(SETTLE_MS);
  expect(requests.length, requests.join("\n")).toBeLessThanOrEqual(budgets.kioskLoadRequests);
  // The kiosk reports only the profile it shows: not the local copy's (the defaults) before the server's config.
  const control = requests.filter((r) => r.startsWith("/events/control"));
  expect(control).toEqual([`/events/control?profile=${manifest.profiles.heavy}`]);
});
