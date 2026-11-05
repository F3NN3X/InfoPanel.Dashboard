import { expect, manifest, saveConfig, test, watchErrors } from "./fixtures";

// B1: a rule fires as a toast, is switched to the island in the studio and tested. The kiosk shows exactly one alert, in the
// island and marked Test, and History keeps the real one as Replaced.

test("a toast switched to the island and tested is one alert and a Replaced row", async ({ page, context, scratch }) => {
  const { errors } = watchErrors(page);
  const config = await (await fetch(`${scratch.base}/api/config`)).json();
  const key = manifest.sensorKeys.find((k) => k.endsWith("temp")) ?? manifest.sensorKeys[0];
  const rule = {
    id: "hot",
    name: "Always firing",
    enabled: true,
    severity: "critical",
    source: { kind: "sensor", conditions: [{ key, op: ">", value: -1000 }], forSeconds: 0 },
    cooldownSeconds: 0,
    outputs: { display: { style: "toast", seconds: 60 } },
  };
  const defaults = { style: "toast", position: "top-right", backdrop: "none", size: "m", seconds: 8 };
  expect((await saveConfig(scratch.base, { ...config, alerts: { enabled: true, rules: [rule], defaults } })).status).toBe(200);

  const kiosk = await context.newPage();
  await kiosk.goto(`${scratch.base}/?kiosk=1&profile=${manifest.profiles.heavy}`);
  await expect(kiosk.locator("[data-alert-id]")).toHaveCount(1);

  await page.goto(`${scratch.base}/?studio=1`);
  await page.getByRole("button", { name: /^Alerts & Island/ }).click();
  const how = page.getByRole("radiogroup", { name: "How it shows" });
  await how.getByRole("radio", { name: "Island" }).click();
  // The saved rule moves the alert already showing, before any test.
  await expect(kiosk.locator("[data-alert-id]")).toHaveCount(0);
  await expect(kiosk.getByText("Always firing")).toHaveCount(1);

  await page.getByRole("button", { name: "Send a test to displays" }).click();
  await expect(kiosk.getByText("Test · Always firing")).toHaveCount(1);
  await expect(kiosk.locator("[data-alert-id]")).toHaveCount(0);

  await page.getByRole("tab", { name: "History" }).click();
  const rows = page.getByRole("row");
  await expect(rows.filter({ hasText: "Replaced" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "Test" }).filter({ hasText: "Island" })).toHaveCount(1);
  expect(errors).toEqual([]);
});
