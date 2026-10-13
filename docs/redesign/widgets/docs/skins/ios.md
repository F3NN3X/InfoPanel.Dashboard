# Skin · `ios`

iOS 18 widget: solid #1c1c1e card, 24px corners, bold rounded numerals, Activity-ring thickness.

```jsx
<CpuMonitor data={data} skin="ios" />            // skin defaults
<CpuMonitor data={data} skin="ios" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `ios` |
| Corner radius | 24px |
| Forced accent | — uses the `accent` prop |
| UI font | `-apple-system,BlinkMacSystemFont,'SF Pro Text',system-ui,sans-serif` |
| Numeral font | `ui-rounded,'SF Pro Rounded',-apple-system,system-ui,sans-serif` |
| Numeral weight / stretch | 700 |
| Numeral glow | no |
| Graph style | `area` |
| Meter style | `pill` |
| Ring thickness factor | ×1.7 |
| Header kind | `ios` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`ios`)
- Tailwind classes: `—`
- Inline style: `{"background":"#1c1c1e","boxShadow":"0 1px 0 rgba(255,255,255,.04) inset, 0 18px 40px -18px rgba(0,0,0,.8)"}`

## Implementation notes
- Code: `core/skins/ios.js` (`iosSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
