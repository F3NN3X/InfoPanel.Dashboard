# Frame Pacing  `FramePacing`

A frame-time graph with budget lines for your refresh rate and for 60 Hz. Average FPS hides stutter; frame-time spikes show it.

| | |
|---|---|
| File | `widgets/FramePacing.jsx` |
| Category | Gaming |
| Default / min span | 4×2 / 2×1 |
| Icon | `timeline` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
budgets (Hz list, default [refresh, 60]), window (samples, default 120)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.RTSS.rtss.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile` · `column`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `useHistory` · `Spark` · `useSkin` · `numFont` · `hue` · `STATE` · `Num`

