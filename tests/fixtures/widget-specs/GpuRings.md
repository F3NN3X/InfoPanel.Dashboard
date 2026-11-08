# GPU Rings  `GpuRings`

Stacked radial rings, used only for bounded percentages: VRAM on the outside, core load inside, temperature in the centre. A legend lists clocks, power and fans.

| | |
|---|---|
| File | `widgets/GpuRings.jsx` |
| Category | Hardware |
| Default / min span | 3×2 / 1×1 |
| Icon | `donut_large` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | own layout in every shape |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
outer 'vram' | 'load' | 'power', inner 'load' | 'vram' | 'fan', colors { outer, inner }
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`
- `plugins.InfoPanel.RTSS.rtss.gpu-name`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: —
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `pretty` · `useSkin` · `numFont` · `hue` · `STATE` · `hw`

