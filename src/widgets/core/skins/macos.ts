// Skin · macos — macOS Sonoma widget: vibrancy, 22px radius, accent title, rounded numerals, thick rings.
// Fonts to load: system fonts only. Docs: docs/redesign/widgets/docs/skins/macos.md
import type { SkinPack } from "../types";

export const macosSkin: SkinPack = {
  name: "macos",
  description: "macOS Sonoma widget: vibrancy, 22px radius, accent title, rounded numerals, thick rings.",
  fonts: [],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "vibrancy", radius: 22, font: "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif", num: "ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif", graph: "area", meter: "pill", header: "macos", ring: 1.45 },
};
