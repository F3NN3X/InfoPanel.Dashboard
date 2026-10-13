// Skin · fluent — Windows 11: Mica surface, 8px radius, Segoe UI Variable, line graphs.
// Fonts to load: system fonts only. Docs: docs/redesign/widgets/docs/skins/fluent.md
import { mix } from "../tokens";
import type { SkinPack } from "../types";

export const fluentSkin: SkinPack = {
  name: "fluent",
  description: "Windows 11: Mica surface, 8px radius, Segoe UI Variable, line graphs.",
  fonts: [],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "mica", radius: 8, font: "'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif", num: "'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif", numWeight: 600, graph: "line", meter: "bar", header: "fluent" },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    mica: { c: "border border-white/[0.07]", s: { background: `radial-gradient(140% 120% at 0% 0%, ${mix(11)}, transparent 60%), #202023`, boxShadow: "inset 0 1px 0 rgba(255,255,255,.05)" } },
  },
};
