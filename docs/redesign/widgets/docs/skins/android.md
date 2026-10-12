# Skin · `android`

Material You: tonal surface mixed from the accent, 28px corners, Roboto Flex, icon in tonal circle, squiggly wave progress.

```jsx
<CpuMonitor data={data} skin="android" />            // skin defaults
<CpuMonitor data={data} skin="android" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `material` |
| Corner radius | 28px |
| Forced accent | — uses the `accent` prop |
| UI font | `'Roboto Flex','Google Sans Flex',Roboto,system-ui,sans-serif` |
| Numeral font | `'Roboto Flex',Roboto,system-ui,sans-serif` |
| Numeral weight / stretch | 500 |
| Numeral glow | no |
| Graph style | `area` |
| Meter style | `wave` |
| Ring thickness factor | ×1.5 |
| Header kind | `android` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`material`)
- Tailwind classes: `—`
- Inline style: `{"background":"linear-gradient(color-mix(in oklab, var(--accent) 15%, #1b1b1f), color-mix(in oklab, var(--accent) 15%, #1b1b1f))"}`

## Implementation notes
- Code: `core/skins/android.js` (`androidSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: Roboto Flex (Google Fonts).
