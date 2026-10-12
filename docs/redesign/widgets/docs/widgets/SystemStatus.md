# System Status  `SystemStatus`

CPU + RAM load and Data API health.

| | |
|---|---|
| File | `widgets/SystemStatus.jsx` |
| Category | System |
| Default / min span | 2×1 / 1×1 |
| Icon | `monitor_heart` (Material Symbols Rounded) |
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
Owns prefixes: `system.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `system.*`
- `system.cpu.load`
- `system.ram.load`
- `system.ram.free`
- `system.bridge.status`
- `system.bridge.time`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `md`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `Metric` · `BarRow` · `Ring` · `Spark` · `Dot` · `useHistory` · `tone`

