import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, manifest, test, watchErrors } from "./fixtures";

// _docs/desktop/webview-performance.md, "Hot and cold": the visualiser keeps moving after the studio was hidden and
// its canvas remounted (Screens → Design), fed by the fake Data API's moving spectrum.

const zone = manifest.zones.viz[1];
/** How long the page is reported hidden: the time the visualiser's loop has to stall for the remount to matter. */
const HIDDEN_MS = 1500;

/** Whether the visualiser's canvas draws something different within 2 s. */
async function moves(page: Page): Promise<boolean> {
  const canvas = page.locator(`[data-zone-id="${zone}"] canvas`).first();
  const shot = () => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  const first = await shot();
  return expect.poll(shot, { timeout: 2000, intervals: [250] }).not.toBe(first).then(() => true, () => false);
}

/** Reports the page hidden, then visible again, the way the browser does for a minimized window. */
async function hideAndShow(page: Page): Promise<void> {
  await page.evaluate(async (hiddenMs) => {
    const set = (hidden: boolean) => {
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => (hidden ? "hidden" : "visible") });
      Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
      document.dispatchEvent(new Event("visibilitychange"));
    };
    set(true);
    await new Promise((r) => setTimeout(r, hiddenMs));
    set(false);
  }, HIDDEN_MS);
}

test("the visualiser moves after the studio was hidden and remounted", async ({ page, scratch }) => {
  const { errors } = watchErrors(page);
  // A returning browser (as in studio-basics): its local copy already names the fake Data API.
  const local = fs.readFileSync(path.join(scratch.dataDir, "config.json"), "utf8");
  await page.addInitScript((value) => localStorage.setItem("infopanel-dashboard:config:v1", value), local);
  await page.goto(`${scratch.base}/?studio=1&profile=${manifest.profiles.viz}`);
  await page.locator('[aria-label^="Edit "]').click();
  await page.locator(`[data-zone-id="${zone}"] canvas`).first().waitFor();
  await expect.poll(() => moves(page), { timeout: 10_000 }).toBe(true);

  await hideAndShow(page);
  await page.locator('[aria-label="Screens"]').click();
  await page.locator('[aria-label^="Edit "]').click();
  await page.locator(`[data-zone-id="${zone}"] canvas`).first().waitFor();
  await expect.poll(() => moves(page), { timeout: 10_000 }).toBe(true);
  expect(errors).toEqual([]);
});
