# FPS Monitor  `FpsMonitor`

RTSS frame rate, 1% low, frame-time graph, min/avg/max, display and API.

| | |
|---|---|
| File | `widgets/FpsMonitor.jsx` |
| Category | Gaming |
| Default / min span | 3×2 / 1×1 |
| Icon | `speed` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
target (fps target line, default = refresh rate)
```

## Data
Owns prefixes: `plugins.InfoPanel.RTSS.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.RTSS.*`
- `plugins.InfoPanel.RTSS.rtss.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Metric` · `Spark` · `Stat` · `Chip` · `useHistory` · `Icon`

