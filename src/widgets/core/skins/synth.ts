// Skin · synth — Synthwave: dusk gradient + horizon grid, neon pink, Orbitron numerals with glow.
// Fonts to load: Orbitron, Geist. Docs: docs/redesign/widgets/docs/skins/synth.md
import type { SkinPack } from "../types";

export const synthSkin: SkinPack = {
  name: "synth",
  description: "Synthwave: dusk gradient + horizon grid, neon pink, Orbitron numerals with glow.",
  fonts: ["orbitron", "geist"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "synth", radius: 14, accent: "#ff4fd8", font: "'Geist',system-ui,sans-serif", num: "'Orbitron',sans-serif", numWeight: 700, numWide: 1.4, numGlow: true, glow: true, graph: "line", meter: "segments", header: "synth" },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    synth: { c: "border", s: { background: "linear-gradient(to top, rgba(255,79,216,.22) 0 1px, transparent 1px) 0 100%/100% 14px repeat-y, linear-gradient(90deg, rgba(56,232,255,.10) 0 1px, transparent 1px) 0 0/22px 100%, linear-gradient(180deg, #12062a 0%, #2a0b3d 62%, #45104a 100%)", borderColor: "rgba(255,79,216,.35)", boxShadow: "0 0 24px -8px rgba(255,79,216,.55)" } },
  },
};
