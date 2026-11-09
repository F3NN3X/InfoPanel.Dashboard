import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test, watchErrors } from "./fixtures";

// Phase 6b, the load path of a code widget over a real server: the example (tests/fixtures/widgets/ext.test.example, signed with a
// TEST-ONLY key) loads and draws in the kiosk once its key is trusted; the same package with its bundle changed on disk is refused
// and its widget.js is never asked for; the Widgets page's "Third-party code widgets" switch hides it and stops the load. The key is
// trusted by writing the store the Settings window's command writes (the app's IPC is not reachable from a browser).

const FIXTURES = path.join("tests", "fixtures", "widgets");
const ID = "ext:test.example";
const KEY = "ext.test.example";

/** The bundle requests a page makes from now on. */
function bundleRequests(page: Page): string[] {
  const seen: string[] = [];
  page.on("request", (r) => {
    if (/\/api\/widgets\/[^/]+\/widget\.js/.test(r.url())) seen.push(r.url());
  });
  return seen;
}

test("A signed code widget loads; a tampered one and a switched-off one import nothing", async ({ page, scratch }) => {
  const { errors } = watchErrors(page);
  const keyLine = fs.readFileSync(path.join(FIXTURES, "TEST-ONLY-example.pub"), "utf8").split("\n")[1];
  fs.writeFileSync(path.join(scratch.dataDir, "widget-keys.json"), JSON.stringify({ format: 1, keys: [{ name: "Test publisher", key: keyLine, added: 0, publishers: ["test"] }], removed: [] }));
  const dir = path.join(scratch.dataDir, "widgets", KEY);
  fs.mkdirSync(dir, { recursive: true });
  for (const f of ["manifest.json", "widget.js"]) fs.copyFileSync(path.join(FIXTURES, KEY, f), path.join(dir, f));
  const config = await (await fetch(`${scratch.base}/api/config`)).json();
  const desk = { ...config.profiles[0], id: "desk", name: "Desk", pages: [{ id: "main", name: "Main", placements: [{ id: "z1", module: ID, colStart: 1, rowStart: 1, colSpan: 3, rowSpan: 3, visible: true }] }] };
  const put = await fetch(`${scratch.base}/api/config`, { method: "POST", headers: { "Content-Type": "application/json", "x-dashboard-config": "1" }, body: JSON.stringify({ ...config, profiles: [desk, ...config.profiles] }) });
  expect(put.ok).toBe(true);

  // signed by a trusted key: imported once, by the hash its manifest lists, and drawn
  let asked = bundleRequests(page);
  await page.goto(`${scratch.base}/?profile=desk`);
  await expect(page.locator("[data-example-widget]")).toBeVisible();
  const hash = JSON.parse(fs.readFileSync(path.join(dir, "manifest.json"), "utf8")).files[0].sha256;
  expect(asked).toEqual([`${scratch.base}/api/widgets/${KEY}/widget.js?sha256=${hash}`]);

  // tampered on disk: refused by the server's check, and the page never asks for the bundle
  const good = fs.readFileSync(path.join(dir, "widget.js"));
  fs.writeFileSync(path.join(dir, "widget.js"), Buffer.concat([good, Buffer.from("\nfetch('https://example.invalid');\n")]));
  const tampered = await page.context().newPage();
  asked = bundleRequests(tampered);
  await tampered.goto(`${scratch.base}/?profile=desk`);
  await expect(tampered.getByText("Widget not available")).toBeVisible();
  // a folder whose files are not its manifest's is not a package to the server: not listed, nothing served
  await expect(tampered.getByText(/its files are not the ones its manifest lists/)).toBeVisible();
  expect(asked).toEqual([]);
  await tampered.close();
  fs.writeFileSync(path.join(dir, "widget.js"), good);

  // the Widgets page lists it as not reviewed; its switch turns every code widget off on the server
  await page.goto(`${scratch.base}/?studio=1&profile=desk`);
  // the Studio opens on Screens, whose thumbnails draw late under load: open Desk's canvas itself
  await page.getByRole("button", { name: "Open Desk" }).click();
  await expect(page.locator("[data-example-widget]"), "the studio's canvas draws it too").toBeVisible();
  await page.getByRole("navigation", { name: "Studio views" }).getByRole("button", { name: "Widgets", exact: true }).click();
  const card = page.locator(`[data-widget-card="${ID}"]`);
  await expect(card).toContainText("Not reviewed");
  await page.getByRole("switch", { name: "Third-party code widgets" }).click();
  await expect(card).toHaveCount(0);
  expect(await (await fetch(`${scratch.base}/api/widgets/code`)).json()).toMatchObject({ on: false });

  // the studio's canvas, opened again: the zone draws the not-available card and the bundle is not asked for
  const studio = await page.context().newPage();
  asked = bundleRequests(studio);
  await studio.goto(`${scratch.base}/?studio=1&profile=desk`);
  await studio.getByRole("button", { name: "Open Desk" }).click();
  await expect(studio.getByText("Third-party code widgets are switched off")).toBeVisible();
  await expect(studio.locator("[data-example-widget]")).toHaveCount(0);
  expect(asked).toEqual([]);
  await studio.close();

  const off = await page.context().newPage();
  asked = bundleRequests(off);
  await off.goto(`${scratch.base}/?profile=desk`);
  await expect(off.getByText("Third-party code widgets are switched off")).toBeVisible();
  expect(asked).toEqual([]);
  await off.close();
  expect(errors).toEqual([]);
});
