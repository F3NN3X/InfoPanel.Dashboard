// Skin · ios — iOS 18 widget: solid card, bold rounded numerals, Activity-ring thickness.
// Fonts to load: system fonts only. Docs: _docs/redesign/widgets/docs/skins/ios.md
import type { SkinPack } from "../types";

export const iosSkin: SkinPack = {
  name: "ios",
  description: "iOS 18 widget: solid card, bold rounded numerals, Activity-ring thickness.",
  fonts: [],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "ios", radius: 24, font: "-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif", num: "ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif", numWeight: 700, graph: "area", meter: "pill", header: "ios", ring: 1.7 },
};
