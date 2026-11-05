// L54: the `dark:` variant of index.css follows the card's `data-tone` as well as the page's `data-mode`, in CSS alone. The selector is read from the
// stylesheet (the variant is only emitted when a class uses it) and matched in Chromium, whose selector engine is the one that counts (happy-dom
// does not read a complex selector inside `:is()`).
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const body = /@custom-variant dark \((.*)\);/.exec(readFileSync("src/index.css", "utf8"))![1];
const selector = body.replace(/^&/, "*");

/** Whether an element inside a card of this tone, and one outside any card, match the variant on a page of this mode. */
async function match(p: Page, page: "dark" | "light", card: "dark" | "light" | "theme") {
  await p.setContent(`<div data-mode="${page}"><div data-part="card" data-tone="${card}" ${card === "light" ? 'data-mode="light"' : ""}><i id="in"></i></div><i id="out"></i></div>`);
  return await p.evaluate((s) => ({ inCard: document.getElementById("in")!.matches(s), outsideCard: document.getElementById("out")!.matches(s) }), selector);
}

test.describe("the dark variant", () => {
  test("is dark inside a dark card whatever the page is: a light page did not give that before", async ({ page }) => {
    expect((await match(page, "light", "dark")).inCard).toBe(true);
    expect((await match(page, "dark", "dark")).inCard).toBe(true);
  });
  test("keeps the page-mode rule: a light card opts out of a dark page, the theme's card and what is outside any card follow the page", async ({ page }) => {
    expect((await match(page, "dark", "light")).inCard).toBe(false);
    expect((await match(page, "dark", "theme")).inCard).toBe(true);
    expect((await match(page, "light", "theme")).inCard).toBe(false);
    expect((await match(page, "dark", "dark")).outsideCard).toBe(true);
    expect((await match(page, "light", "dark")).outsideCard).toBe(false);
  });
});
