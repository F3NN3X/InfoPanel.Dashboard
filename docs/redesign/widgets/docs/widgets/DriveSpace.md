# Drive Space  `DriveSpace`

Used and free space per volume, with label, type and file system.

| | |
|---|---|
| File | `widgets/DriveSpace.jsx` |
| Category | Storage |
| Default / min span | 2×2 / 1×1 |
| Icon | `hard_drive` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
drive ('c', 'd', …) to pin one volume; omit to list all
```

## Data
Owns prefixes: `plugins.drive-info-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.drive-info-plugin.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtMB` · `Metric` · `Bar` · `BarRow` · `Ring` · `tone` · `Pill`

## Demo configurations on the overview page
- **2×2**: `{"drive":"c"}`
