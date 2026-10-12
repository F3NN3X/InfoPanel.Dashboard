// Skin · default — Studio default: Geist UI, uppercase micro-header with accent icon, solid card.
// Fonts to load: Geist, Geist Mono. Docs: docs/redesign/widgets/docs/skins/default.md
import type { SkinPack } from "../types";

export const defaultSkin: SkinPack = {
  name: "default",
  description: "Studio default: Geist UI, uppercase micro-header with accent icon, solid card.",
  fonts: ["geist", "geist-mono"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: {},
  // skin-native surfaces (registered into SURFACES)
  surfaces: {},
};
