// Generic surfaces (card materials) usable with any skin. Skin-native surfaces live in core/skins/<skin>.js.
// Each entry: c = Tailwind classes, s = inline style. Accent-tinted ones use mix() so they follow --accent.
import { mix } from './tokens';

export const BASE_SURFACES = {
  solid: { c: 'border border-white/[0.06]', s: { background: '#141418' } },
  glass: { c: 'backdrop-blur-xl border border-white/10', s: { background: 'linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.03))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08)' } },
  outline: { c: 'border border-white/15', s: { background: 'transparent' } },
  flat: { c: '', s: { background: 'transparent' } },
  tinted: { c: 'border', s: { background: `linear-gradient(155deg, ${mix(22, '#141418')}, #121215 65%)`, borderColor: mix(28) } },
  aurora: { c: 'border border-white/[0.07]', s: { background: `radial-gradient(120% 90% at 0% 0%, ${mix(38)}, transparent 55%), radial-gradient(90% 80% at 100% 100%, color-mix(in oklab, #a78bfa 26%, transparent), transparent 60%), #0f0f13` } },
  neon: { c: 'border', s: { background: '#0a0a0d', borderColor: mix(80), boxShadow: `0 0 22px -6px ${mix(70)}, inset 0 0 22px -12px ${mix(80)}` } },
  holo: { c: 'border border-transparent', s: { background: 'linear-gradient(#121215,#121215) padding-box, conic-gradient(from 210deg, var(--accent), #a78bfa, #f472b6, #fbbf24, var(--accent)) border-box' } },
  mesh: { c: 'border border-white/[0.06]', s: { background: 'radial-gradient(rgba(255,255,255,.075) 1px, transparent 1.2px) 0 0/12px 12px, #121215' } },
  carbon: { c: 'border border-white/[0.06]', s: { background: 'repeating-linear-gradient(45deg, #17171b 0 5px, #121215 5px 10px)' } },
  inset: { c: '', s: { background: '#0e0e11', boxShadow: 'inset 0 2px 8px rgba(0,0,0,.7), inset 0 -1px 0 rgba(255,255,255,.05), 0 1px 0 rgba(255,255,255,.04)' } },
  studio: { c: 'border', s: { background: 'linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.022))', borderColor: 'rgba(255,255,255,.08)' } },
  terminal: { c: 'border font-mono', s: { background: 'repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), #060807', borderColor: mix(30), textShadow: `0 0 8px ${mix(45)}` } },
};
