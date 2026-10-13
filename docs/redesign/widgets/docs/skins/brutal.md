# Skin · `brutal`

Neo-brutalist: 2px white rule, hard 5px offset accent shadow, square corners, Space Grotesk, inverted label header.

```jsx
<CpuMonitor data={data} skin="brutal" />            // skin defaults
<CpuMonitor data={data} skin="brutal" surface="glass" graph="line" meter="segments" />   // overrides
```

| Token | Value |
|---|---|
| Surface (when `surface="auto"`) | `brutal` |
| Corner radius | 0px |
| Forced accent | — uses the `accent` prop |
| UI font | `'Space Grotesk',system-ui,sans-serif` |
| Numeral font | `'Space Grotesk',system-ui,sans-serif` |
| Numeral weight / stretch | 700 |
| Numeral glow | no |
| Graph style | `bars` |
| Meter style | `square` |
| Ring thickness factor | ×1.6 |
| Header kind | `brutal` (see `SkinHeader` in core/views.jsx) |

## Surface tokens (`brutal`)
- Tailwind classes: `border-2`
- Inline style: `{"background":"#121212","borderColor":"#f4f4f5","boxShadow":"5px 5px 0 0 var(--accent)","width":"calc(100% - 6px)","height":"calc(100% - 6px)"}`

## Implementation notes
- Code: `core/skins/brutal.js` (`brutalSkin` pack), registered in `core/theme.js → SKIN_PACKS`; read through `useSkin()` (React context provided by `<Widget>`).
- Primitives that react to it: `Metric`, `Num`, `Bar` (meter), `Ring` (thickness / caps), `Spark` (graph mode, glow), `CompactView` / `StudioView` numerals, `SkinHeader`.
- The offset shadow needs 6px of room: the shell shrinks to `calc(100% - 6px)`.
- Font to load: Space Grotesk (Google Fonts).
