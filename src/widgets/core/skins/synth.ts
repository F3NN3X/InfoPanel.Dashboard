// Skin · synth — Synthwave: dusk gradient + horizon grid, neon pink, Orbitron numerals with glow.
// Fonts to load: Orbitron, Geist. Docs: docs/redesign/widgets/docs/skins/synth.md
import type { SkinPack } from "../types";

export const synthSkin: SkinPack = {
  name: "synth",
  description: "Synthwave: dusk gradient + horizon grid, neon pink, Orbitron numerals with glow.",
  fonts: ["orbitron", "geist"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: "synth", radius: 14, accent: "#ff4fd8", font: "'Geist',system-ui,sans-serif", num: "'Orbitron',sans-serif", numWeight: 700, numWide: 1.4, numGlow: true, glow: true, graph: "line", meter: "segments", header: "synth", headerFill: "linear-gradient(to right, #ff4fd8, #38e8ff)" },
};
