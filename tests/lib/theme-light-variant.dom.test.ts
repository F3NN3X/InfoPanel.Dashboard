// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// index.css's `lite:` variant and the MenuBar wash must reach a light card (or the theme card of a light page) and nothing
// else: a dark card on a light page keeps its dark styling (G1).
const css = readFileSync("src/index.css", "utf8");
const lite = /@custom-variant lite \(&:where\((.+)\)\);/.exec(css)?.[1];

function page(rootMode: string, cardAttrs: Record<string, string>, scopeMode?: string): HTMLElement {
  document.documentElement.setAttribute("data-mode", rootMode);
  // The studio canvas scopes the edited screen's theme on its page element, under a dark studio root.
  document.body.innerHTML = scopeMode ? `<div data-theme-scope data-mode=${scopeMode}><div id=card><span id=leaf></span></div></div>` : "<div id=card><span id=leaf></span></div>";
  const card = document.getElementById("card") as HTMLElement;
  for (const [k, v] of Object.entries(cardAttrs)) card.setAttribute(k, v);
  return document.getElementById("leaf") as HTMLElement;
}

describe("the lite: variant", () => {
  it("is declared", () => expect(lite).toBeTruthy());
  it.each([
    ["a light card", "dark", { "data-tone": "light", "data-mode": "light" }, true],
    ["a dark card on a light page", "light", { "data-tone": "dark" }, false],
    ["the theme card of a light page", "light", { "data-tone": "theme" }, true],
    ["the theme card of a dark page", "dark", { "data-tone": "theme" }, false],
  ])("%s", (_n, root, attrs, expected) => {
    expect(page(root, attrs).matches(lite as string)).toBe(expected);
  });

  it("follows the studio page scope: a theme card on a light screen is light, on a dark one not", () => {
    expect(page("dark", { "data-tone": "theme" }, "light").matches(lite as string)).toBe(true);
    expect(page("dark", { "data-tone": "theme" }, "dark").matches(lite as string)).toBe(false);
  });
});
