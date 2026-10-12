# Skin · `tui`

btop-style terminal: inset box border with ┐title┌ set into the line, mono everywhere, braille graphs, green→red block meters.

```jsx
<CpuMonitor data={data} skin="tui" />            // skin defaults
<CpuMonitor data={data} skin="tui" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `tui` |
| Corner radius | 6px |
| Forced accent | — uses the `accent` prop |
| UI font | `'JetBrains Mono','Geist Mono',ui-monospace,monospace` |
| Numeral font | `'JetBrains Mono','Geist Mono',monospace` |
| Numeral weight / stretch | 600 (Tailwind font-semibold) |
| Numeral glow | no |
| Graph style | `braille` |
| Meter style | `blocks` |
| Ring thickness factor | ×0.8 |
| Header kind | `tui` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`tui`)
- Tailwind classes: `—`
- Inline style: `{"background":"#0b0b0d"}`

## Implementation notes
- Code: `core/skins/tui.js` (`tuiSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- The inset border is a pointer-events-none overlay at inset 5px; the title sits on it with the surface colour behind (`#0b0b0d`).
- Font to load: JetBrains Mono, Geist Mono (Google Fonts).
