# Game Spotlight

Steam art for the game you're playing.

## What it shows

Now-playing for games: the Steam hero banner with slow Ken Burns motion, the game's logo, poster art and icon, plus session,
playtime, FPS, achievements and friends, and an optional music overlay. The chosen layout draws while the box holds it;
smaller boxes fall back to the hero, then the ticker, then a mini card. No header; small zones get a summary card and a
dense view of their own.

## Data it needs

The Steam API plugin, `plugins.InfoPanel.SteamAPI.`: Profile (`player-name`, `online-status`, `steam-level`,
`profile_image_url`, `current_game_banner_url`, `game_logo_url`, `game_icon_url`), Session (`current-game`,
`current-game-playtime`, `current-session-time`, `session-start-time`), Library (`total-games`), Achievements
(`current-achievements`, `latest-achievement`, `latest-achievement-icon`), Social (`friends-online`, `total-friends`) and
News (`current_game_news_title`). Image keys are validated with `isImageUrl` before use. It owns no prefix. The music
overlay reads the media or Spotify plugin.

## Options

- **Spotlight layout**: Hero, Poster, Logo, Ticker, Combo (with music) or Composite (profile, stats, news).
- **Scrim darkness** and **Ken Burns motion**; **Stats** and **News line** (Composite).
- **Music source**, **Music progress** and **Visualizer mode** (Combo).

## Presets

None yet.
