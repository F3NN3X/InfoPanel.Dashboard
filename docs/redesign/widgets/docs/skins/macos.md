# Skin · `macos`

macOS Sonoma widget: vibrancy blur, 22px corners, accent-coloured title, rounded numerals, thick rings.

```jsx
<CpuMonitor data={data} skin="macos" />            // skin defaults
<CpuMonitor data={data} skin="macos" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `vibrancy` |
| Corner radius | 22px |
| Forced accent | — uses the `accent` prop |
| UI font | `-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',system-ui,sans-serif` |
| Numeral font | `ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif` |
| Numeral weight / stretch | 600 (Tailwind font-semibold) |
| Numeral glow | no |
| Graph style | `area` |
| Meter style | `pill` |
| Ring thickness factor | ×1.45 |
| Header kind | `macos` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`vibrancy`)
- Tailwind classes: `backdrop-blur-2xl border border-white/[0.08]`
- Inline style: `{"background":"linear-gradient(180deg, rgba(62,62,68,.66), rgba(38,38,42,.66))","boxShadow":"0 12px 30px -12px rgba(0,0,0,.7), inset 0 1px 0 rgba(255,255,255,.1)"}`

## Implementation notes
- Code: `core/skins/macos.js` (`macosSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
