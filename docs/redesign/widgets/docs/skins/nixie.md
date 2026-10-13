# Skin · `nixie`

Nixie tube: smoked-glass surface, glowing orange Nixie One numerals.

```jsx
<CpuMonitor data={data} skin="nixie" />            // skin defaults
<CpuMonitor data={data} skin="nixie" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `nixie` |
| Corner radius | 12px |
| Forced accent | `#ff8a3d` (overrides the `accent` prop) |
| UI font | `'Geist',system-ui,sans-serif` |
| Numeral font | `'Nixie One',serif` |
| Numeral weight / stretch | 400 |
| Numeral glow | yes — `0 0 4px accent, 0 0 14px accent` |
| Graph style | `line` + drop-shadow glow |
| Meter style | `segments` |
| Ring thickness factor | ×0.5 |
| Header kind | `nixie` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`nixie`)
- Tailwind classes: `border border-black`
- Inline style: `{"background":"radial-gradient(120% 90% at 50% 0%, rgba(255,138,61,.10), transparent 60%), linear-gradient(180deg, #1a1210, #0c0907)","boxShadow":"inset 0 1px 0 rgba(255,255,255,.06), inset 0 -20px 40px -20px rgba(0,0,0,.9)"}`

## Implementation notes
- Code: `core/skins/nixie.js` (`nixieSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: Nixie One (Google Fonts).
