// Skin · fluent — Windows 11: Mica surface, 8px radius, Segoe UI Variable, line graphs.
// Fonts to load: system fonts only. Docs: _docs/redesign/widgets/docs/skins/fluent.md
import type { SkinPack } from "../types";

export const fluentSkin: SkinPack = {
  name: "fluent",
  description: "Windows 11: Mica surface, 8px radius, Segoe UI Variable, line graphs.",
  fonts: [],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "mica", radius: 8, font: "'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif", num: "'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif", numWeight: 600, graph: "line", meter: "bar", header: "fluent" },
};
