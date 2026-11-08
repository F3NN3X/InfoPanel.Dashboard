# Now Playing

Track, artist and cover art.

## What it shows

The playing track, artist, album, cover art and progress from Windows Media, Spotify or values pushed to the server, in
one of four layouts: Card, Vinyl (the cover on a spinning record), Backdrop (the track over its blurred cover) and Wave
(a waveform progress line). Progress can be a bar, a wavy line or a live audio visualiser. It can send the playing track
to the Dynamic Island.

## Data it needs

The media plugin, `plugins.media-plugin.media.*`: `current-track`, `artist`, `album`, `cover-art`, `track-progress`,
`elapsed-time`, `remaining-time`, `playback-state` (2 or 4 = playing). The Spotify plugin, `plugins.spotify-plugin.spotify.*`
(the same names), with pushed `spotify.track` / `artist` / `album` / `art` / `progress` / `playing` winning over it. The
visualiser reads the audio level meter, `plugins.audio-level-meter.*`, without owning it.

## Options

- **Layout**: Card, Vinyl, Backdrop or Wave.
- **Source**: Auto (Spotify unless it is idle), Windows, Spotify or Pushed.
- **Cover art**, **Blurred cover behind**, **Progress** and its style (Bar, Wavy, Visualizer).
- The visualiser's style, shape, colours, dynamics, audio devices and **Timeline under it**, shown for the Visualizer progress style.
- **Send to island**: the playing track beside the time.

## Presets

None yet.
