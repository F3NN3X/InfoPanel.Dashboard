// Skin · cyber — Cyberpunk: chamfered corners, signal yellow, Chakra Petch, stepped graphs.
// Fonts to load: Chakra Petch. Docs: widgets/docs/skins/cyber.md
import { mix } from '../tokens';

export const cyberSkin = {
  name: 'cyber',
  description: "Cyberpunk: chamfered corners, signal yellow, Chakra Petch, stepped graphs.",
  fonts: ["Chakra Petch"],
  // tokens read by <Widget>, primitives and views via useSkin()
  skin: { surface: 'cyber', radius: 0, accent: '#f5e642', font: "'Chakra Petch',system-ui,sans-serif", num: "'Chakra Petch',system-ui,sans-serif", numWeight: 600, graph: 'step', meter: 'segments', header: 'cyber', ring: 0.6 },
  // skin-native surfaces (registered into SURFACES)
  surfaces: {
    cyber: { c: '', s: { background: `linear-gradient(135deg, ${mix(18)} 0 10%, transparent 10%), linear-gradient(#0e0e0b, #0e0e0b)`, clipPath: 'polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))', boxShadow: `inset 0 0 0 1px ${mix(55)}` } },
  },
};
