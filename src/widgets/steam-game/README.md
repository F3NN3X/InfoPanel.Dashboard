# Current Game

Session and total playtime.

## What it shows

The current game's hero art with the session time, total playtime, average session and achievement progress. No header;
a summary card, and the dense view falls back to it.

## Data it needs

The Steam API plugin, `plugins.InfoPanel.SteamAPI.SteamAPI-Session.*` and `SteamAPI-Achievements.*` (it owns both), plus
`SteamAPI-Profile.current_game_banner_url` and the `SteamAPI-Profile.game_*` keys.

## Options

- **Artwork**: Banner, Grid or None; **Scrim darkness**.

## Presets

None yet.
