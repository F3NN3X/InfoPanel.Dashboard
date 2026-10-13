# Memory  `MemoryUsage`

Physical and virtual memory: load, used and available.

| | |
|---|---|
| File | `widgets/MemoryUsage.jsx` |
| Category | Hardware |
| Default / min span | 2×1 / 1×1 |
| Icon | `memory_alt` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
warn, crit
```

## Data
Owns prefixes: `libre.total_memory`, `libre.virtual_memory`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.total_memory`
- `libre.virtual_memory`
- `libre.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `Metric` · `Ring` · `Spark` · `Stat` · `Bar` · `useHistory` · `tone`

