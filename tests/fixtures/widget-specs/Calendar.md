# Calendar  `Calendar`

Today’s date plus a month grid, taken from the clock plugin.

| | |
|---|---|
| File | `widgets/Calendar.jsx` |
| Category | Info |
| Default / min span | 2×2 / 1×1 |
| Icon | `calendar_today` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
weekStart 0 (Sun) | 1 (Mon)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.clock-plugin.clock.*`

## Layout by size
- Tiers handled explicitly: `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num`

