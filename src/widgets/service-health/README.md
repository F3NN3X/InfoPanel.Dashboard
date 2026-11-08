# Service Health

Status of every data source.

## What it shows

One status board for every data source: the Data API, LibreHardwareMonitor, RTSS, Wave Link, Spotify, media, Steam,
weather and the network, each with a status dot. Two views: List, and Pills (every source as a status pill). Small zones
get a summary card and a dense view of their own.

## Data it needs

One reading per source, to tell whether it answers: `system.bridge.status` and `system.bridge.time`, `libre.*`,
`plugins.InfoPanel.RTSS.rtss.fps`, `plugins.wavelink-plugin.wavelink.status`, `plugins.spotify-plugin.spotify.auth-state`
and `current-track`, `plugins.media-plugin.media.session-state` and `current-track`,
`plugins.InfoPanel.SteamAPI.SteamAPI-Profile.player-name` and `online-status`, `plugins.weather-plugin.weather.weather`
and `plugins.network-info-plugin.public-ip.ipv4`.

## Options

- **Services as**: List or Pills (stored as `healthLayout`).

## Presets

None yet.
