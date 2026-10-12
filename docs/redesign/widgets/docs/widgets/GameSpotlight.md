# Game Spotlight  `GameSpotlight`

Now playing for games: the Steam hero banner with slow Ken Burns motion, game logo, poster and icon, plus session, playtime, FPS, achievements and friends. The combo layout overlays the current music track.

| | |
|---|---|
| File | `widgets/GameSpotlight.jsx` |
| Category | Gaming |
| Default / min span | 4×2 / 1×1 |
| Icon | `stadia_controller` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
layout 'hero' | 'poster' | 'logo' | 'ticker' | 'combo', motion (default true), scrim 0-1, music source 'media' | 'spotify',
progress 'wave' | 'visualizer' (combo music card), vizMode
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Session.*`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Achievements.*`
- `plugins.InfoPanel.RTSS.rtss.fps`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Social.friends-ingame`
- `plugins.spotify-plugin.spotify`
- `plugins.media-plugin.media`
- `plugins.audio-level-meter.default-audio.left-channel`
- `plugins.audio-level-meter.default-audio.right-channel`
- `plugins.audio-level-meter.default-audio.audio-level`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile` · `strip` · `column`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Img` · `Icon` · `Bar` · `Ring` · `Dot` · `MiniViz` · `KenBurns` · `Logo`

## Demo configurations on the overview page
- **2×2**: `{"layout":"poster"}`
