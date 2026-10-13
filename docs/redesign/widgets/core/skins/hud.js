// Skin · hud — Sci-fi HUD: accent grid, corner brackets, tracked caps, stepped graphs, segment meters.
// Fonts to load: Geist Mono. Docs: widgets/docs/skins/hud.md
import { mix } from '../tokens';

export const hudSkin = {
  name: 'hud',
  description: "Sci-fi HUD: accent grid, corner brackets, tracked caps, stepped graphs, segment meters.",
  fonts: ["Geist Mono"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: 'hud', radius: 2, font: "'Geist Mono',ui-monospace,monospace", num: "'Geist Mono',monospace", numWeight: 400, graph: 'step', meter: 'segments', header: 'hud', ring: 0.45 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    hud: { c: '', s: { background: `repeating-linear-gradient(90deg, ${mix(8)} 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, ${mix(8)} 0 1px, transparent 1px 22px), radial-gradient(120% 100% at 50% 0%, ${mix(10)}, transparent 70%), #07090b`, boxShadow: `inset 0 0 0 1px ${mix(20)}` } },
  },
};
