import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME } from "../../src/lib/theme.ts";

/** The `:root` block that follows the "Fallbacks before JS applies a theme preset" comment in index.css. */
function cssFallbacks(): Record<string, string> {
  const css = readFileSync(new URL("../../src/index.css", import.meta.url), "utf8");
  const block = /Fallbacks before JS applies a theme preset[^]*?:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

describe("the theme's first-paint fallbacks", () => {
  it("are DEFAULT_THEME's tokens in index.css, so the page doesn't flash before a theme applies", () => {
    const css = cssFallbacks();
    const tokens = Object.fromEntries(Object.keys(DEFAULT_THEME).map((k) => [k, css[k]]));
    expect(tokens).toEqual(DEFAULT_THEME);
  });
});
