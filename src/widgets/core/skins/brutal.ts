// Skin · brutal — Neo-brutalist: 2px white rule, hard accent offset inside the edge, square corners, Space Grotesk.
// Fonts to load: Space Grotesk. Docs: docs/redesign/widgets/docs/skins/brutal.md
import type { SkinPack } from "../types";

export const brutalSkin: SkinPack = {
  name: "brutal",
  description: "Neo-brutalist: 2px white rule, hard accent offset inside the edge, square corners, Space Grotesk.",
  fonts: ["space-grotesk"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "brutal", radius: 0, font: "'Space Grotesk',system-ui,sans-serif", num: "'Space Grotesk',system-ui,sans-serif", numWeight: 700, numWide: 1.1, graph: "bars", meter: "square", header: "brutal", ring: 1.6 },
};
