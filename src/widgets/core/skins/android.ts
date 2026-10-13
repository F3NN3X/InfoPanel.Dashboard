// Skin · android — Material You: tonal surface from accent, 28px radius, Roboto Flex, squiggly progress.
// Fonts to load: Roboto Flex. Docs: docs/redesign/widgets/docs/skins/android.md
import { mix } from "../tokens";
import type { SkinPack } from "../types";

export const androidSkin: SkinPack = {
  name: "android",
  description: "Material You: tonal surface from accent, 28px radius, Roboto Flex, squiggly progress.",
  fonts: ["roboto-flex"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "material", radius: 28, font: "'Roboto Flex','Google Sans Flex',Roboto,system-ui,sans-serif", num: "'Roboto Flex',Roboto,system-ui,sans-serif", numWeight: 500, graph: "area", meter: "wave", header: "android", ring: 1.5 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    material: { c: "", s: { background: `linear-gradient(${mix(15, "#1b1b1f")}, ${mix(15, "#1b1b1f")})` } },
  },
};
