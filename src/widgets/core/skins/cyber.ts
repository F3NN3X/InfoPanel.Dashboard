// Skin · cyber — Cyberpunk: chamfered corners, signal yellow, Chakra Petch, stepped graphs.
// Fonts to load: Chakra Petch. Docs: docs/redesign/widgets/docs/skins/cyber.md
import type { SkinPack } from "../types";

export const cyberSkin: SkinPack = {
  name: "cyber",
  description: "Cyberpunk: chamfered corners, signal yellow, Chakra Petch, stepped graphs.",
  fonts: ["chakra-petch"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "cyber", radius: 0, accent: "#f5e642", font: "'Chakra Petch',system-ui,sans-serif", num: "'Chakra Petch',system-ui,sans-serif", numWeight: 600, graph: "step", meter: "segments", header: "cyber", ring: 0.6 },
};
