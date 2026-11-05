// L54: the `dark:` variant of index.css follows the card's `data-tone` as well as the page's `data-mode`, in CSS alone. The selector is read from the
// stylesheet (the variant is only emitted when a class uses it) and matched in Chromium, whose selector engine is the one that counts (happy-dom
// does not read a complex selector inside `:is()`).
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const body = /@custom-variant dark \((.*)\);/.exec(readFileSync("src/index.css", "utf8"))![1];
const selector = body.replace(/^&/, "*");

let browser: Awaited<ReturnType<typeof chromium.launch>>;
beforeAll(async () => {
  browser = await chromium.launch();
});
afterAll(async () => {
  await browser?.close();
});

/** Whether an element inside a card of this tone, and one outside any card, match the variant on a page of this mode. */
async function match(page: "dark" | "light", card: "dark" | "light" | "theme") {
  const p = await browser.newPage();
  try {
    await p.setContent(`<div data-mode="${page}"><div data-part="card" data-tone="${card}" ${card === "light" ? 'data-mode="light"' : ""}><i id="in"></i></div><i id="out"></i></div>`);
    return await p.evaluate((s) => ({ inCard: document.getElementById("in")!.matches(s), outsideCard: document.getElementById("out")!.matches(s) }), selector);
  } finally {
    await p.close();
  }
}

describe("the dark variant", () => {
  it("is dark inside a dark card whatever the page is: a light page did not give that before", async () => {
    expect((await match("light", "dark")).inCard).toBe(true);
    expect((await match("dark", "dark")).inCard).toBe(true);
  });
  it("keeps the page-mode rule: a light card opts out of a dark page, the theme's card and what is outside any card follow the page", async () => {
    expect((await match("dark", "light")).inCard).toBe(false);
    expect((await match("dark", "theme")).inCard).toBe(true);
    expect((await match("light", "theme")).inCard).toBe(false);
    expect((await match("dark", "dark")).outsideCard).toBe(true);
    expect((await match("light", "dark")).outsideCard).toBe(false);
  });
});
