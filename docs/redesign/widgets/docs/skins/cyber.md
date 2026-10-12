# Skin · `cyber`

Cyberpunk: chamfered clip-path corners, signal-yellow accent, Chakra Petch, stepped graphs.

```jsx
<CpuMonitor data={data} skin="cyber" />            // skin defaults
<CpuMonitor data={data} skin="cyber" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `cyber` |
| Corner radius | 0px |
| Forced accent | `#f5e642` (overrides the `accent` prop) |
| UI font | `'Chakra Petch',system-ui,sans-serif` |
| Numeral font | `'Chakra Petch',system-ui,sans-serif` |
| Numeral weight / stretch | 600 |
| Numeral glow | no |
| Graph style | `step` |
| Meter style | `segments` |
| Ring thickness factor | ×0.6 |
| Header kind | `cyber` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`cyber`)
- Tailwind classes: `—`
- Inline style: `{"background":"linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, transparent) 0 10%, transparent 10%), linear-gradient(#0e0e0b, #0e0e0b)","clipPath":"polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 18px 100%, 0 calc(100% - 18px))","boxShadow":"inset 0 0 0 1px color-mix(in oklab, var(--accent) 55%, transparent)"}`

## Implementation notes
- Code: `core/skins/cyber.js` (`cyberSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Corners are cut with `clip-path`; the edge line is an inset box-shadow so it survives the clip.
- Font to load: Chakra Petch (Google Fonts).
