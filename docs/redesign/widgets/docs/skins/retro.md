# Skin · `retro`

CRT terminal: VT323 pixel type one size up, scanlines, bar graphs, block meters.

```jsx
<CpuMonitor data={data} skin="retro" />            // skin defaults
<CpuMonitor data={data} skin="retro" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `terminal` |
| Corner radius | 6px |
| Forced accent | — uses the `accent` prop |
| UI font | `'VT323',monospace` |
| Numeral font | `'VT323',monospace` |
| Numeral weight / stretch | 400 · one size step larger |
| Numeral glow | no |
| Graph style | `bars` |
| Meter style | `blocks` |
| Ring thickness factor | ×1.2 |
| Header kind | `retro` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`terminal`)
- Tailwind classes: `border font-mono`
- Inline style: `{"background":"repeating-linear-gradient(0deg, rgba(255,255,255,.03) 0 1px, transparent 1px 3px), #060807","borderColor":"color-mix(in oklab, var(--accent) 30%, transparent)","textShadow":"0 0 8px color-mix(in oklab, var(--accent) 45%, transparent)"}`

## Implementation notes
- Code: `core/skins/retro.js` (`retroSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- Font to load: VT323 (Google Fonts).
