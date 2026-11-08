# Steam Profile  `SteamProfile`

Avatar, persona, status, level and friends online or in-game, with recent activity.

| | |
|---|---|
| File | `widgets/SteamProfile.jsx` |
| Category | Gaming |
| Default / min span | 2×2 / 1×1 |
| Icon | `account_circle` (Material Symbols Rounded) |
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
Owns prefixes: `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.`, `plugins.InfoPanel.SteamAPI.SteamAPI-Social.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Social.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `rows` · `has` · `Img` · `Dot` · `Stat` · `Chip`

