# Vitals  `Vitals`

CPU, GPU, RAM and network side by side. Shows as a row in wide zones, a 2×2 grid in square ones and a stack in tall ones.

| | |
|---|---|
| File | `widgets/Vitals.jsx` |
| Category | System |
| Default / min span | 4×1 / 1×1 |
| Icon | `vital_signs` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
metrics (subset/order of ['cpu','gpu','ram','net','vram','fps'])
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`
- `plugins.InfoPanel.RTSS.rtss.fps`
- `plugins.InfoPanel.RTSS.rtss.resolution`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtRate` · `detect` · `Spark` · `useHistory` · `tone` · `TONES` · `hw`

