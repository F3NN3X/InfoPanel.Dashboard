# Core Heatmap  `CoreHeatmap`

Per-core heatmap: grid, honeycomb, radial or scrolling waterfall, in seven colour ramps.

| | |
|---|---|
| File | `widgets/CoreHeatmap.jsx` |
| Category | Hardware |
| Default / min span | 2×2 / 1×1 |
| Icon | `grid_on` (Material Symbols Rounded) |
| Rendering | Canvas 2D |
| Compact views | own layout in every shape |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
shape 'grid' | 'hex' | 'radial' | 'waterfall', ramp 'accent' | 'thermal' | 'viridis' | 'magma' | 'ice' | 'synth' | 'mono',
metric 'load' | 'clock' | 'power' | 'vid', showValues, history (waterfall columns, default 60)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`

## Layout by size
- Tiers handled explicitly: `xs`
- Shapes handled explicitly: —
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `heat` · `rampColor` · `accentOf` · `useHistory` · `hw`

## Demo configurations on the overview page
- **2×2**: `{"shape":"hex","ramp":"thermal"}`
- **4×2**: `{"shape":"waterfall","ramp":"viridis"}`
- **1×2**: `{"shape":"radial"}`
