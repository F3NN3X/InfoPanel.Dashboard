# Playtime Share  `PlaytimeShare`

How the last two weeks of play split between games, as one bar with a segment per game sized by its share.

| | |
|---|---|
| File | `widgets/PlaytimeShare.jsx` |
| Category | Gaming |
| Default / min span | 3×2 / 1×1 |
| Icon | `stacked_bar_chart` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
colors (array)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Library.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `rows` · `useSkin` · `numFont` · `hue` · `STATE` · `Num`

