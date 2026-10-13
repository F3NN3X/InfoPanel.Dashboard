# OSD Strip  `OsdStrip`

An in-game overlay strip like RTSS or Afterburner: cells in a fixed order with monospace digits, and colour only when a value drops.

| | |
|---|---|
| File | `widgets/OsdStrip.jsx` |
| Category | Gaming |
| Default / min span | 6×1 / 2×1 |
| Icon | `videogame_asset` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
cells (subset/order of ['fps','low','ft','gpu','cpu','vram','display']), target (fps, default = refresh rate)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.RTSS.rtss.*`
- `libre.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `strip`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `has` · `useSkin` · `numFont` · `hue` · `STATE` · `hw`

