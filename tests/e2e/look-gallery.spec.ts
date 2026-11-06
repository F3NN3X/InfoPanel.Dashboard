import type { Page } from "@playwright/test";
import { expect, manifest, test, watchErrors } from "./fixtures";

// The Theme view (P5b, P7): pick a theme in Browse themes, change its accent with a knob, reset it to the Look, and make one
// widget's accent differ from its page in the Edit inspector. A pick stores the Look's id and no widget values (the Look
// layer, L40): the kiosk loads the sample Look's values and draws its card.

const TERM_ACCENT = "#8BE37A";
const VIOLET = "#ac8ff8";
const ROSE = "#f37986";

const { light } = manifest.profiles;
const [first, second] = manifest.zones.light;

/** A widget's card in the Look view's preview (the frame its badge sits in holds it). */
const previewCard = (page: Page, zone: string) =>
  page.getByRole("region", { name: "Preview" }).locator(`[data-preview-zone="${zone}"]`).locator("xpath=..").locator("[data-wp-tier]");
const accentOf = (card: ReturnType<typeof previewCard>) => card.evaluate((el) => getComputedStyle(el).getPropertyValue("--w-accent").trim().toLowerCase());
/** Browse themes: select a theme's card, Apply to the screen, then back to Customise where the preview and the quick changes are. */
const pick = async (page: Page, id: string) => {
  await page.getByRole("tab", { name: /Browse themes/ }).click();
  await page.locator(`[data-look-card="${id}"]`).click();
  await page.getByRole("complementary", { name: "Theme detail" }).getByRole("button", { name: /^Apply to/ }).click();
  await page.getByRole("tab", { name: "Customise" }).click();
};
const storedScreen = async (base: string) => {
  const config = await (await fetch(`${base}/api/config`)).json();
  return config.profiles.find((p: { id: string }) => p.id === light);
};

test("pick a Look, change its accent, reset it to the Look, and give one widget its own accent", async ({ page, scratch }) => {
  const { errors } = watchErrors(page);
  await page.goto(`${scratch.base}/?studio=1&profile=${light}`);
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const card = previewCard(page, first);

  // Pick: one click on the gallery card.
  await pick(page, "term");
  await expect(card).toHaveAttribute("data-mat", "look-term");
  await expect.poll(() => accentOf(card)).toBe(TERM_ACCENT.toLowerCase());
  await expect.poll(async () => (await storedScreen(scratch.base))?.widgetTheme?.values).toEqual({ lookId: "term" });

  // Accent knob: a swatch, and the knob says Custom.
  const knobs = page.getByRole("region", { name: "Quick changes" });
  const accent = knobs.getByRole("group", { name: "Accent" });
  await accent.getByRole("button", { name: "Violet" }).click();
  await expect.poll(() => accentOf(card)).toBe(VIOLET);
  await expect(accent.getByRole("button", { name: /^Set here, reset to/ })).toBeVisible();

  // Reset to the Look: its accent again, and the level stores only the Look.
  await accent.getByRole("button", { name: /^Set here, reset to/ }).click();
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => accentOf(card)).toBe(TERM_ACCENT.toLowerCase());
  await expect(accent.getByRole("button", { name: /^Set here, reset to/ })).toHaveCount(0);
  await expect.poll(async () => (await storedScreen(scratch.base))?.widgetTheme?.values).toEqual({ lookId: "term" });

  // One widget differs: its Style tab's Accent knob changes it alone.
  await page.getByRole("navigation", { name: "Studio views" }).getByRole("button", { name: /^Edit / }).click();
  await page.locator(`[data-zone-id="${first}"]`).click();
  await page.getByRole("tab", { name: /Style/ }).click();
  const widgetKnobs = page.getByRole("region", { name: "Quick changes" });
  await expect(widgetKnobs.getByRole("heading", { name: /^Theme: Term/ })).toBeVisible();
  await widgetKnobs.getByRole("group", { name: "Accent" }).getByRole("button", { name: "Rose" }).click();
  const canvasAccent = (zone: string) =>
    page.locator(`[data-zone-id="${zone}"] [data-wp-tier]`).first().evaluate((el) => getComputedStyle(el).getPropertyValue("--w-accent").trim().toLowerCase());
  await expect.poll(() => canvasAccent(first)).toBe(ROSE);
  expect(await canvasAccent(second)).toBe(TERM_ACCENT.toLowerCase());
  await expect(widgetKnobs.getByRole("group", { name: "Accent" }).getByRole("button", { name: /^Set here, reset to/ })).toBeVisible();

  // The kiosk loads the sample Look the screen names and draws its card.
  await expect.poll(async () => (await storedScreen(scratch.base))?.pages[0].placements.find((z: { id: string }) => z.id === first)?.settings?.accent).toBe(ROSE);
  await page.goto(`${scratch.base}/?kiosk=1&profile=${light}`);
  await expect(page.locator('[data-mat="look-term"]').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test("a Look pick keeps the screen's own accent and Undo puts the last Look back; Reset keeps focus; corners from the Look's", async ({ page, scratch }) => {
  const { errors } = watchErrors(page);
  await page.goto(`${scratch.base}/?studio=1&profile=${light}`);
  await page.getByRole("button", { name: "Theme", exact: true }).click();
  const card = previewCard(page, first);
  await pick(page, "term");
  await expect.poll(async () => (await storedScreen(scratch.base))?.widgetTheme?.values).toEqual({ lookId: "term" });
  const knobs = page.getByRole("region", { name: "Quick changes" });
  const accent = knobs.getByRole("group", { name: "Accent" });
  await accent.getByRole("button", { name: "Violet" }).click();
  await expect.poll(() => accentOf(card)).toBe(VIOLET);

  // Another Look keeps the accent the screen set; one Undo puts Term back.
  await pick(page, "paper");
  await expect(card).toHaveAttribute("data-mat", "look-paper");
  await expect.poll(() => accentOf(card)).toBe(VIOLET);
  await expect(accent.getByRole("button", { name: /^Set here, reset to/ })).toBeVisible();
  const toast = page.getByRole("status").filter({ has: page.getByRole("button", { name: "Undo" }) });
  await expect(toast).toContainText("Theme changed to Paper.");
  await toast.getByRole("button", { name: "Undo" }).click();
  await expect(card).toHaveAttribute("data-mat", "look-term");
  await expect.poll(async () => (await storedScreen(scratch.base))?.widgetTheme?.values).toEqual({ lookId: "term", accent: VIOLET });

  // Reset from the keyboard: focus stays in the Accent knob, not on the page.
  const reset = accent.getByRole("button", { name: /^Set here, reset to/ });
  await reset.focus();
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Reset", exact: true }).press("Enter");
  await expect(accent.getByRole("button", { name: /^Set here, reset to/ })).toHaveCount(0);
  await expect.poll(() => accent.evaluate((el) => el.contains(document.activeElement))).toBe(true);

  // One Corners control: px on the slider, the same px in the widget knob (and the screen's own radius, in rem).
  const corners = knobs.getByRole("slider", { name: "Corners" });
  await corners.fill("12");
  await expect.poll(async () => (await storedScreen(scratch.base))?.widgetTheme?.values?.radius).toBe("12");
  await expect.poll(async () => (await storedScreen(scratch.base))?.radius).toBe(0.75);
  expect(errors).toEqual([]);
});
