# Menu Bar  `MenuBar`

An always-visible glance strip in the style of iStat Menus: each label sits over its value, with mini history bars. Click an item to open its detail panel.

| | |
|---|---|
| File | `widgets/MenuBar.jsx` |
| Category | System |
| Default / min span | 6×1 / 2×1 |
| Icon | `more_horiz` (Material Symbols Rounded) |
| Rendering | DOM + SVG · interactive |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
items (subset/order of ['cpu','gpu','temp','mem','down','up','nvme']), stacked (default auto), dropdown (default true)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `strip`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtRate` · `detect` · `Spark` · `useHistory` · `tone` · `TONES` · `useSkin` · `numFont` · `hue` · `STATE` · `hw`

