// Skin · nixie — Nixie tube: smoked glass, glowing orange Nixie One numerals.
// Fonts to load: Nixie One, Geist. Docs: docs/redesign/widgets/docs/skins/nixie.md
import type { SkinPack } from "../types";

export const nixieSkin: SkinPack = {
  name: "nixie",
  description: "Nixie tube: smoked glass, glowing orange Nixie One numerals.",
  fonts: ["nixie-one", "geist"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "nixie", radius: 12, accent: "#ff8a3d", font: "'Geist',system-ui,sans-serif", num: "'Nixie One',system-ui,sans-serif", numWeight: 400, numGlow: true, numStroke: "0.04em", glow: true, graph: "line", meter: "segments", header: "nixie", ring: 0.5 },
};
