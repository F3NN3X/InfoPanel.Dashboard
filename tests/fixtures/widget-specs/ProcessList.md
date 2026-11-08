# Processes  `ProcessList`

Top processes by CPU or memory plus process, thread and handle counts.

| | |
|---|---|
| File | `widgets/ProcessList.jsx` |
| Category | System |
| Default / min span | 2×2 / 1×1 |
| Icon | `list_alt` (Material Symbols Rounded) |
| Rendering | DOM + SVG · interactive |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
sort 'cpu' | 'utility' | 'memory', rows (max rows, auto-fits height by default)
```

## Data
Owns prefixes: `plugins.system-info-plugin.processes.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.system-info-plugin.processes.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtMB` · `rows` · `Metric` · `Stat` · `Bar` · `Chip` · `Segmented`

## Demo configurations on the overview page
- **4×2**: `{"sort":"memory"}`
