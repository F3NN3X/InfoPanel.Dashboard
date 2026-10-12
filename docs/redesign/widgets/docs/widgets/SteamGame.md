# Current Game  `SteamGame`

Hero art, session time, playtime, average session and achievement progress.

| | |
|---|---|
| File | `widgets/SteamGame.jsx` |
| Category | Gaming |
| Default / min span | 4×2 / 2×1 |
| Icon | `stadia_controller` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
art 'banner' | 'grid' | 'none', scrim (0-1)
```

## Data
Owns prefixes: `plugins.InfoPanel.SteamAPI.SteamAPI-Session.`, `plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.`, `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.current_game_banner_url`, `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.game_`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Session.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.current_game_banner_url`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.game_`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Img` · `Bar` · `Stat` · `Chip` · `Icon`

