# SSD Health  `StorageHealth`

SMART life, temperature, read/write rate, activity, TBW, spare and power-on hours.

| | |
|---|---|
| File | `widgets/StorageHealth.jsx` |
| Category | Storage |
| Default / min span | 3×2 / 1×1 |
| Icon | `health_metrics` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
disk (sensor slug, e.g. "kingston_sfyrd2000g"); default = first detected
```

## Data
Owns prefixes: `libre.kingston_`, `libre.wdc_`, `libre.samsung_`, `libre.crucial_`, `libre.wd_`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.kingston_`
- `libre.wdc_`
- `libre.samsung_`
- `libre.crucial_`
- `libre.wd_`
- `libre.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtGB` · `fmtRate` · `detect` · `pretty` · `Metric` · `Ring` · `Spark` · `Stat` · `Bar` · `useHistory` · `tone` · `Empty`

## Demo configurations on the overview page
- **2×2**: `{"disk":"wdc_wds100t2b0a_00sm50"}`
