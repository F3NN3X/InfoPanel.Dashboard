# Service Health  `ServiceHealth`

Status board for every data source: Data API, LibreHW, RTSS, Wave Link, Spotify, Steam, weather and network.

| | |
|---|---|
| File | `widgets/ServiceHealth.jsx` |
| Category | System |
| Default / min span | 2×2 / 1×1 |
| Icon | `health_and_safety` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
—
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `system.bridge.status`
- `system.bridge.time`
- `plugins.InfoPanel.RTSS.rtss.fps`
- `plugins.wavelink-plugin.wavelink.status`
- `plugins.spotify-plugin.spotify.auth-state`
- `plugins.spotify-plugin.spotify.current-track`
- `plugins.media-plugin.media.session-state`
- `plugins.media-plugin.media.current-track`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.player-name`
- `plugins.InfoPanel.SteamAPI.SteamAPI-Profile.online-status`
- `plugins.weather-plugin.weather.weather`
- `plugins.network-info-plugin.public-ip.ipv4`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `has` · `Dot` · `Pill`

