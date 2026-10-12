# CPU Monitor  `CpuMonitor`

Total and per-core load as bars or a heatmap. Also shows clocks, Tctl, package power, VID, VRM and CPU fan.

| | |
|---|---|
| File | `widgets/CpuMonitor.jsx` |
| Category | Hardware |
| Default / min span | 3×2 / 1×1 |
| Icon | `memory` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
cpu, coreView 'bars' | 'heatmap' | 'off', coreMetric 'load' | 'clock', heatRamp 'accent' | 'thermal', warn, crit
```

## Data
Owns prefixes: `libre.amd_`, `libre.intel_`, `libre.embedded_controller`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.amd_`
- `libre.intel_`
- `libre.embedded_controller`
- `libre.*`
- `libre.embedded_controller_vrm`
- `libre.embedded_controller_cpu_optional_fan`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `md` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `pretty` · `has` · `Metric` · `Ring` · `Spark` · `Stat` · `Bar` · `useHistory` · `tone` · `Empty` · `heat` · `hw`

## Demo configurations on the overview page
- **2×2**: `{"coreView":"heatmap"}`
- **4×2**: `{"coreView":"heatmap","heatRamp":"thermal"}`
