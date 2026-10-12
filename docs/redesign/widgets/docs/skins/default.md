# Skin · `default`

Studio default. Geist UI, uppercase micro-header with accent icon, solid card.

```jsx
<CpuMonitor data={data} skin="default" />            // skin defaults
<CpuMonitor data={data} skin="default" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `solid` |
| Corner radius | 16px (shell default) — follows the `radius` prop |
| Forced accent | — uses the `accent` prop |
| UI font | inherit (Geist in the app) |
| Numeral font | inherit |
| Numeral weight / stretch | 600 (Tailwind font-semibold) |
| Numeral glow | no |
| Graph style | `area` |
| Meter style | `bar` |
| Ring thickness factor | ×1 |
| Header kind | `default` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`solid`)
- Tailwind classes: `border border-white/[0.06]`
- Inline style: `{"background":"#141418"}`

## Implementation notes
- Code: `core/skins/default.js` (`defaultSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
