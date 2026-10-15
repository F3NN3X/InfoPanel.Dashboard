# Game News  `SteamNews`

The latest headlines for the current game and your library.

| | |
|---|---|
| File | `widgets/SteamNews.jsx` |
| Category | Gaming |
| Default / min span | 3×1 / 1×1 |
| Icon | `newspaper` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
lines (title line clamp, default 2)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-News.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Session.current-game`

## Layout by size
- Tiers handled explicitly: `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Dynamic Island
Setting `island` (**Send to island**, off by default, in the Steam news group). With it on, a kiosk's Dynamic Island opens for 6 s with the game and title of a post that was not in `library-news` before (the first new one per refresh). The rules are in `src/widgets/island/gaming.ts` (`steamNewsIsland`); see [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `get` · `rows` · `has`

