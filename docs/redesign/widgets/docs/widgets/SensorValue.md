# Sensor  `SensorValue`

Bind any single data point and show it as a value, gauge, bar or sparkline with thresholds.

| | |
|---|---|
| File | `widgets/SensorValue.jsx` |
| Category | Generic |
| Default / min span | 1×1 / 1×1 |
| Icon | `sensors` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
sensor (data key), label, display 'value' | 'gauge' | 'bar' | 'spark', min, max, warn, crit, decimals, unit (override)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- any key passed in props

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Metric` · `Ring` · `Spark` · `Bar` · `useHistory` · `tone`

## Demo configurations on the overview page
- **1×1**: `{"sensor":"libre.nvidia_geforce_rtx_5090_gpu_core","label":"GPU temp","display":"gauge","max":100,"warn":70,"crit":85}`
- **2×1**: `{"sensor":"system.cpu.load","label":"CPU load","display":"gauge","warn":75,"crit":90}`
- **3×1**: `{"sensor":"libre.ethernet_download_speed","label":"Ethernet ↓","display":"spark"}`
- **1×2**: `{"sensor":"libre.kingston_sfyrd2000g_temperature__2","label":"NVMe","display":"bar","max":90,"warn":70}`
- **2×2**: `{"sensor":"libre.kingston_sfyrd2000g_temperature__2","label":"NVMe temp","display":"bar","max":90,"warn":70}`
- **4×2**: `{"sensor":"libre.ethernet_download_speed","label":"Ethernet ↓","display":"spark"}`
