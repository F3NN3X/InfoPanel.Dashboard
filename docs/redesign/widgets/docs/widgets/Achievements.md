# Achievements  `Achievements`

Completion ring for the current game, unlocked/total and the latest unlock.

| | |
|---|---|
| File | `widgets/Achievements.jsx` |
| Category | Gaming |
| Default / min span | 2×1 / 1×1 |
| Icon | `trophy` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
—
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game`

## Layout by size
- Tiers handled explicitly: `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Ring` · `Img` · `Icon` · `useSkin` · `numFont` · `hue` · `STATE`

