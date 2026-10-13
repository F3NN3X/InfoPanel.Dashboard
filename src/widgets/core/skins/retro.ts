// Skin · retro — CRT terminal: VT323 pixel type, scanlines, bar graphs, block meters.
// Fonts to load: VT323. Docs: docs/redesign/widgets/docs/skins/retro.md
import type { SkinPack } from "../types";

export const retroSkin: SkinPack = {
  name: "retro",
  description: "CRT terminal: VT323 pixel type, scanlines, bar graphs, block meters.",
  fonts: ["vt323"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "terminal", radius: 6, font: "'VT323',monospace", num: "'VT323',monospace", numWeight: 400, numUp: true, graph: "bars", meter: "blocks", header: "retro", ring: 1.2 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {},
};
