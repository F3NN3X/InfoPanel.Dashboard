# GPU Monitor  `GpuMonitor`

Load, core and hotspot temps, power, VRAM, clocks, fans and D3D engines.

| | |
|---|---|
| File | `widgets/GpuMonitor.jsx` |
| Category | Hardware |
| Default / min span | 3×2 / 1×1 |
| Icon | `developer_board` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
gpu (sensor slug)
warnTemp, critTemp
```

## Data
Owns prefixes: `libre.nvidia_`, `libre.amd_radeon`, `libre.intel_arc`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.nvidia_`
- `libre.amd_radeon`
- `libre.intel_arc`
- `libre.*`
- `plugins.InfoPanel.RTSS.rtss.gpu-name`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `md` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `pretty` · `Metric` · `Ring` · `Spark` · `Stat` · `BarRow` · `Bar` · `useHistory` · `tone` · `Empty` · `Icon` · `hw`

