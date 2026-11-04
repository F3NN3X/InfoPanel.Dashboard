// Skin · hud — Sci-fi HUD: accent grid, corner brackets, tracked caps, stepped graphs, segment meters.
// Fonts to load: Geist Mono. Docs: docs/redesign/widgets/docs/skins/hud.md
import type { SkinPack } from "../types";

export const hudSkin: SkinPack = {
  name: "hud",
  description: "Sci-fi HUD: accent grid, corner brackets, tracked caps, stepped graphs, segment meters.",
  fonts: ["geist-mono"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "hud", radius: 2, font: "'Geist Mono',ui-monospace,monospace", num: "'Geist Mono',monospace", numWeight: 400, graph: "step", meter: "segments", header: "hud", frame: "corners", ring: 0.45, cap: "butt", cellSquare: true },
};
