// @vitest-environment happy-dom
// A theme card draws its mini widgets with the surface a widget would resolve, so a skin's own surface and the
// generic surfaces show their material, not a card fallback.
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppearancePreview } from "@/components/studio/appearance-preview";
import type { AppearancePreset } from "@/lib/appearance-presets";

const preset = (style: AppearancePreset["style"]): AppearancePreset => ({ id: "t", name: "T", description: "", theme: "dark" as never, radius: 0.5, style });
const tileOf = (style: AppearancePreset["style"]) => {
  const { container } = render(<AppearancePreview preset={preset(style)} />);
  return container.querySelector<HTMLElement>(".relative.flex.h-full > div")!;
};

describe("AppearancePreview surfaces", () => {
  it("draws a skin's own surface when the theme sets the skin and leaves the surface to auto", () => {
    const el = tileOf({ skin: "synth", surface: "auto" });
    expect(el.style.boxShadow).toContain("255,79,216");
    expect(el.className).toContain("border");
  });

  it("draws a generic surface by name", () => {
    expect(tileOf({ surface: "neon" }).style.background).toContain("#0a0a0d");
  });

  it("sets the colour --accent the materials mix with (the theme's --accent is an HSL triplet)", () => {
    expect(tileOf({ surface: "neon", accent: "#ff0000" }).style.getPropertyValue("--accent")).toBe("#ff0000");
    expect(tileOf({ skin: "cyber", surface: "auto" }).style.getPropertyValue("--accent")).toBe("#f5e642");
    expect(tileOf({ surface: "tinted" }).style.getPropertyValue("--accent")).toBe("hsl(var(--primary))");
    expect(tileOf({ skin: "ink", surface: "matte-light" }).style.getPropertyValue("--accent")).toBe("hsl(var(--primary))");
  });

  it("keeps the app's materials and their text tone", () => {
    expect(tileOf({ surface: "matte-light" }).style.getPropertyValue("--w-fg")).toBe("#18181b");
    expect(tileOf({ surface: "glass" }).style.getPropertyValue("--w-fg")).toBe("#f4f4f5");
  });
});
