# Status Tracker  `StatusTracker`

A history of states with one block per reading: OK, 50–80%, above 80% / down, or no data. Hover a block to see its value.

| | |
|---|---|
| File | `widgets/StatusTracker.jsx` |
| Category | System |
| Default / min span | 4×2 / 2×1 |
| Icon | `view_week` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
tracks [{ label, key, kind: 'threshold' | 'status', warn, crit, up }], samples (default 60)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`
- `libre.total_memory_memory`
- `system.bridge.status`
- `system.bridge.time`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile` · `column`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `useSkin` · `numFont` · `hue` · `STATE` · `hw` · `Pill`

