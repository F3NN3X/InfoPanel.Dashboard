// The LCD takes its look from the widget's surface (`lcdAppearanceFor`), never from the OS colour scheme: Tailwind v4 has
// no `dark` variant here, so a `dark:` class would follow `prefers-color-scheme` and draw a light screen on a dark widget.
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { LcdDisplay } from "@/components/ui/audiocn/lcd-display";
import { lcdAppearanceFor } from "@/widgets/core/mixer-views";

const classOf = (appearance: "auto" | "light" | "dark") =>
  renderToStaticMarkup(createElement(LcdDisplay, { appearance }, "x")).match(/class="([^"]*)"/)![1];

describe("LcdDisplay appearance", () => {
  it("draws the dark glass for a dark surface with the OS light, with no OS-driven variant on any appearance", () => {
    const dark = classOf(lcdAppearanceFor("auto", "dark"));
    expect(dark).toContain("[--lcd-display-glass:oklch(0.15_0.004_200)]");
    for (const a of ["auto", "light", "dark"] as const) expect(classOf(a)).not.toContain("dark:");
  });

  it("draws the light glass for a light surface", () => {
    expect(classOf(lcdAppearanceFor("auto", "light"))).not.toContain("[--lcd-display-glass:oklch(0.15_0.004_200)]");
  });
});
