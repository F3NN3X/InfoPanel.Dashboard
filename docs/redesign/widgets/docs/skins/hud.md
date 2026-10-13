# Skin · `hud`

Sci-fi HUD: accent grid, corner brackets, tracked caps, stepped graphs, segment meters, butt-capped rings.

```jsx
<CpuMonitor data={data} skin="hud" />            // skin defaults
<CpuMonitor data={data} skin="hud" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `hud` |
| Corner radius | 2px |
| Forced accent | — uses the `accent` prop |
| UI font | `'Geist Mono',ui-monospace,monospace` |
| Numeral font | `'Geist Mono',monospace` |
| Numeral weight / stretch | 400 |
| Numeral glow | no |
| Graph style | `step` |
| Meter style | `segments` |
| Ring thickness factor | ×0.45 |
| Header kind | `hud` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`hud`)
- Tailwind classes: `—`
- Inline style: `{"background":"repeating-linear-gradient(90deg, color-mix(in oklab, var(--accent) 8%, transparent) 0 1px, transparent 1px 22px), repeating-linear-gradient(0deg, color-mix(in oklab, var(--accent) 8%, transparent) 0 1px, transparent 1px 22px), radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, var(--accent) 10%, transparent), transparent 70%), #07090b","boxShadow":"inset 0 0 0 1px color-mix(in oklab, var(--accent) 20%, transparent)"}`

## Implementation notes
- Code: `core/skins/hud.js` (`hudSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Corner brackets are four 10px absolutely-positioned spans with accent borders.
- Font to load: Geist Mono (Google Fonts).
