// Skin · tui — btop-style terminal: inset box border with ┐title┌, mono, braille graphs, green→red block meters.
// Fonts to load: JetBrains Mono. Docs: docs/redesign/widgets/docs/skins/tui.md
import type { SkinPack } from "../types";

export const tuiSkin: SkinPack = {
  name: "tui",
  description: "btop-style terminal: inset box border with ┐title┌, mono, braille graphs, green→red block meters.",
  fonts: ["jetbrains-mono"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "tui", radius: 6, font: "'JetBrains Mono','Geist Mono',ui-monospace,monospace", num: "'JetBrains Mono','Geist Mono',monospace", graph: "braille", meter: "blocks", header: "tui", ring: 0.8 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    tui: { c: "", s: { background: "#0b0b0d" } },
  },
};
