# Steam Library  `SteamLibrary`

Games owned, total and recent playtime, recent games and game news.

| | |
|---|---|
| File | `widgets/SteamLibrary.jsx` |
| Category | Gaming |
| Default / min span | 3×2 / 1×1 |
| Icon | `library_books` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
showNews (default: lg only)
```

## Data
Owns prefixes: `plugins.InfoPanel.SteamAPI.SteamAPI-Library.`, `plugins.InfoPanel.SteamAPI.SteamAPI-News.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Library.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-News.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `md` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `rows` · `has` · `Metric` · `Stat` · `Bar` · `Icon`

