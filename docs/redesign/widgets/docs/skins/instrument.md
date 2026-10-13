# Skin · `instrument`

Instrument rack (Widget Sampler): shadcn-style tokens, IBM Plex Sans/Mono, condensed Archivo numerals (82% stretch), colour only for state.

```jsx
<CpuMonitor data={data} skin="instrument" />            // skin defaults
<CpuMonitor data={data} skin="instrument" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `instrument` |
| Corner radius | 10px |
| Forced accent | `#7D95FF` (overrides the `accent` prop) |
| UI font | `'IBM Plex Sans',system-ui,-apple-system,'Segoe UI',sans-serif` |
| Numeral font | `'Archivo','IBM Plex Sans',sans-serif` |
| Numeral weight / stretch | 700 / 82% |
| Numeral glow | no |
| Graph style | `area` |
| Meter style | `bar` |
| Ring thickness factor | ×1.1 |
| Header kind | `instrument` (15px/600 title, truncates; right slot only) (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`instrument`)
- Tailwind classes: `border`
- Inline style: `{"background":"#161A20","borderColor":"#29303A"}`

## Implementation notes
- Code: `core/skins/instrument.js` (`instrumentSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: IBM Plex Sans, Archivo (Google Fonts).
