# Sensor Group  `SensorGroup`

Bind any list of data points, shown as rows or a tile grid, each with an optional bar and thresholds.

| | |
|---|---|
| File | `widgets/SensorGroup.jsx` |
| Category | Generic |
| Default / min span | 2×2 / 1×1 |
| Icon | `view_list` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
sensors [{ key, label, max?, warn?, crit?, decimals? }], layout 'auto' | 'rows' | 'grid', bars (default true)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `system.cpu.load`
- `libre.nvidia_geforce_rtx_5090_gpu_core_load`
- `system.ram.load`
- `libre.nvidia_geforce_rtx_5090_gpu_core`
- `libre.kingston_sfyrd2000g_temperature__2`
- `plugins.volume-plugin.default.volume`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Bar` · `tone` · `TONES`

