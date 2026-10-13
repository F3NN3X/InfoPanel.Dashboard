# Thermals  `Thermals`

Every temperature in one list, hottest first, with a warning marker on each row.

| | |
|---|---|
| File | `widgets/Thermals.jsx` |
| Category | Hardware |
| Default / min span | 2×2 / 1×1 |
| Icon | `device_thermostat` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
sortBy 'hottest' | 'fixed', warn, crit (defaults per sensor), max (bar scale, default 100)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`

## Layout by size
- Tiers handled explicitly: `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `pretty` · `Bar` · `tone` · `TONES` · `useHistory` · `Spark` · `Empty` · `hw`

