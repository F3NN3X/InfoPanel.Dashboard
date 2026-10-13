# System Overview  `SystemOverview`

One panel for CPU, GPU and RAM, with optional VRAM and network. Each section has its own colour, ring, stats and smooth graph, and the CPU section adds a core heatmap that brightens with load. Shows as activity rings at 1×1.

| | |
|---|---|
| File | `widgets/SystemOverview.jsx` |
| Category | System |
| Default / min span | 5×2 / 1×1 |
| Icon | `dashboard` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | own layout in every shape |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
sections ['cpu','gpu','ram','vram','net'], colors { cpu, gpu, ram, … } | unifiedColor (use accent everywhere),
ring 'ring' | 'none', coreView 'heatmap' | 'bars' | 'off', heatRamp, details 'auto' | 'min' | 'full', warn, crit
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`
- `plugins.InfoPanel.RTSS.rtss.gpu-name`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile` · `column`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtRate` · `detect` · `pretty` · `Ring` · `Spark` · `Bar` · `heat` · `useHistory` · `tone` · `TONES` · `SkinCtx` · `SKINS` · `hw` · `Num`

## Demo configurations on the overview page
- **4×2**: `{"sections":["cpu","gpu","ram"]}`
- **2×2**: `{"sections":["cpu","gpu","ram","vram"]}`
