# Skin · `synth`

Synthwave: dusk gradient + horizon grid, neon pink accent, Orbitron numerals with glow, glowing lines.

```jsx
<CpuMonitor data={data} skin="synth" />            // skin defaults
<CpuMonitor data={data} skin="synth" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `synth` |
| Corner radius | 14px |
| Forced accent | `#ff4fd8` (overrides the `accent` prop) |
| UI font | `'Geist',system-ui,sans-serif` |
| Numeral font | `'Orbitron',sans-serif` |
| Numeral weight / stretch | 700 |
| Numeral glow | yes — `0 0 4px accent, 0 0 14px accent` |
| Graph style | `line` + drop-shadow glow |
| Meter style | `segments` |
| Ring thickness factor | ×1 |
| Header kind | `synth` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`synth`)
- Tailwind classes: `border`
- Inline style: `{"background":"linear-gradient(to top, rgba(255,79,216,.22) 0 1px, transparent 1px) 0 100%/100% 14px repeat-y, linear-gradient(90deg, rgba(56,232,255,.10) 0 1px, transparent 1px) 0 0/22px 100%, linear-gradient(180deg, #12062a 0%, #2a0b3d 62%, #45104a 100%)","borderColor":"rgba(255,79,216,.35)","boxShadow":"0 0 24px -8px rgba(255,79,216,.55)"}`

## Implementation notes
- Code: `core/skins/synth.js` (`synthSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: Orbitron (Google Fonts).
