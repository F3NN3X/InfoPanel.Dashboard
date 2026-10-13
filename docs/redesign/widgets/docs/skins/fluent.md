# Skin · `fluent`

Windows 11: Mica surface, 8px corners, Segoe UI Variable, line graphs.

```jsx
<CpuMonitor data={data} skin="fluent" />            // skin defaults
<CpuMonitor data={data} skin="fluent" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `mica` |
| Corner radius | 8px |
| Forced accent | — uses the `accent` prop |
| UI font | `'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif` |
| Numeral font | `'Segoe UI Variable Display','Segoe UI',system-ui,sans-serif` |
| Numeral weight / stretch | 600 |
| Numeral glow | no |
| Graph style | `line` |
| Meter style | `bar` |
| Ring thickness factor | ×1 |
| Header kind | `fluent` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`mica`)
- Tailwind classes: `border border-white/[0.07]`
- Inline style: `{"background":"radial-gradient(140% 120% at 0% 0%, color-mix(in oklab, var(--accent) 11%, transparent), transparent 60%), #202023","boxShadow":"inset 0 1px 0 rgba(255,255,255,.05)"}`

## Implementation notes
- Code: `core/skins/fluent.js` (`fluentSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
