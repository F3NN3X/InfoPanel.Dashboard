# Skin · `ink`

Monochrome editorial: forces accent to near-white, hairline meters, serif numerals (Instrument Serif), no graph fills.

```jsx
<CpuMonitor data={data} skin="ink" />            // skin defaults
<CpuMonitor data={data} skin="ink" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `outline` |
| Corner radius | 14px |
| Forced accent | `#f4f4f5` (overrides the `accent` prop) |
| UI font | inherit (Geist in the app) |
| Numeral font | `'Instrument Serif',Georgia,serif` |
| Numeral weight / stretch | 400 |
| Numeral glow | no |
| Graph style | `line` |
| Meter style | `hair` |
| Ring thickness factor | ×0.35 |
| Header kind | `ink` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`outline`)
- Tailwind classes: `border border-white/15`
- Inline style: `{"background":"transparent"}`

## Implementation notes
- Code: `core/skins/ink.js` (`inkSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: Instrument Serif (Google Fonts).
