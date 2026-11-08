# Audio Button

One tap: mute a channel or switch output.

## What it shows

A tile that mutes a channel (Master, Mic, an app or a Wave Link channel) or switches the default output device. It lights
while muted or while it is the active output. It has no summary card or dense view.

## Data it needs

The server's audio control (`src/lib/audio-control.ts`: Windows audio and Wave Link), not sensor keys. It writes through
it, so it draws without sensor keys.

## Options

- **Action**: Mute a channel or Switch output; the **Channel** or **Output device**, and the **Wave Link mix** for a Wave
  Link channel.
- **Name** and **Symbol** (a Material Symbols name).

## Presets

None yet.
