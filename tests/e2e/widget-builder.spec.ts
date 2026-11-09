import { expect, manifest, test, watchErrors } from "./fixtures";

// Phase 5b: a recipe built in the Widgets page's builder, saved through /api/widgets as the user's own, added to a screen, and
// drawn by the kiosk. The fixture's screens are full, so the test adds an empty one first.

test("Build a recipe, save it, add it to a screen: the kiosk draws it", async ({ page, scratch }) => {
  const { errors } = watchErrors(page);
  const config = await (await fetch(`${scratch.base}/api/config`)).json();
  const desk = { ...config.profiles[0], id: "desk", name: "Desk", pages: [{ id: "main", name: "Main", placements: [] }] };
  const put = await fetch(`${scratch.base}/api/config`, { method: "POST", headers: { "Content-Type": "application/json", "x-dashboard-config": "1" }, body: JSON.stringify({ ...config, profiles: [desk, ...config.profiles] }) });
  expect(put.ok).toBe(true);

  await page.goto(`${scratch.base}/?studio=1&profile=desk`);
  await page.getByRole("navigation", { name: "Studio views" }).getByRole("button", { name: "Widgets", exact: true }).click();
  await page.getByRole("button", { name: "New widget" }).click();
  const name = page.getByLabel("Widget name");
  await name.fill("Test card");
  await name.press("Enter");
  await page.locator('[data-add-block="ring"]').click();
  await page.getByRole("button", { name: "Change the data" }).click();
  const [key] = manifest.sensorKeys;
  await page.getByLabel("Search data points").fill(key.split(".")[1]);
  await page.locator(`button[role="option"][title="${key}"]`).click();
  await expect(page.locator("[data-validation]")).toContainText("No code · 2 blocks");

  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved Test card").first()).toBeVisible();
  const stored = await (await fetch(`${scratch.base}/api/widgets/recipe.test-card/recipe.json`)).json();
  expect(stored.root.children[0]).toMatchObject({ type: "ring", bind: { sensor: key } });
  // the server records it as made in Studio (Yours), whichever browser asks
  expect(await (await fetch(`${scratch.base}/api/widgets`)).json()).toEqual([expect.objectContaining({ id: "recipe:test-card", origin: "studio" })]);

  // the sidebar's Widgets goes back to browse, where the saved recipe is a card; a double-click opens it again
  await page.getByRole("navigation", { name: "Studio views" }).getByRole("button", { name: "Widgets", exact: true }).click();
  await page.locator('[data-widget-card="recipe:test-card"]').dblclick();
  await page.getByRole("button", { name: "Add to a screen" }).click();
  await expect(page.getByText("Added Test card to Desk").first()).toBeVisible();
  await page.keyboard.press("Control+s");
  await expect
    .poll(async () => (await (await fetch(`${scratch.base}/api/config`)).json()).profiles.find((p: { id: string }) => p.id === "desk").pages[0].placements.map((z: { module: string }) => z.module), { timeout: 5000 })
    .toEqual(["recipe:test-card"]);

  await page.goto(`${scratch.base}/?profile=desk`);
  await expect(page.locator('[data-recipe="recipe:test-card"]')).toBeVisible();
  expect(errors).toEqual([]);
});
