// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { applyTheme, DEFAULT_THEME, THEME_PRESETS } from "@/lib/theme";

describe("applyTheme (D3)", () => {
  it("writes the theme's mode as data-mode on the page", () => {
    applyTheme(THEME_PRESETS.find((p) => p.name === "paper")!.tokens);
    expect(document.documentElement.dataset.mode).toBe("light");
    applyTheme(DEFAULT_THEME);
    expect(document.documentElement.dataset.mode).toBe("dark");
  });
});
