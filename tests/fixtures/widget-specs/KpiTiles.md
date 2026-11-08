# KPI Tiles  `KpiTiles`

The four numbers you check first. Each tile shows the value, its change over recent readings, and a trend line with a live end dot.

| | |
|---|---|
| File | `widgets/KpiTiles.jsx` |
| Category | System |
| Default / min span | 6×1 / 1×1 |
| Icon | `query_stats` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
metrics (subset of ['cpu','gpu','ram','net','vram','power']), lookback (readings for delta, default 10)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `Spark` · `useHistory` · `useSkin` · `numFont` · `hue` · `STATE` · `hw`

