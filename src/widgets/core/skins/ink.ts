// Skin · ink — Monochrome editorial: near-white accent, hairline meters, serif numerals, no fills.
// Fonts to load: Instrument Serif. Docs: docs/redesign/widgets/docs/skins/ink.md
import type { SkinPack } from "../types";

export const inkSkin: SkinPack = {
  name: "ink",
  description: "Monochrome editorial: near-white accent, hairline meters, serif numerals, no fills.",
  fonts: ["instrument-serif"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "outline", radius: 14, accent: "#f4f4f5", num: "'Instrument Serif',Georgia,serif", numWeight: 400, graph: "line", meter: "hair", header: "ink", ring: 0.35 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {},
};
