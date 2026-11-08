# Audio Fader

One touch fader for a channel.

## What it shows

A single fader for one channel (Master, Mic, an app or a Wave Link channel), vertical in a tall zone and horizontal in a
wide one. It has no summary card or dense view.

## Data it needs

The server's audio control (`src/lib/audio-control.ts`: Windows audio and Wave Link), not sensor keys. It reads and
writes it, so it draws without sensor keys.

## Options

- **Channel**, and the **Wave Link mix** for a Wave Link channel; **Name**.
- **Fader**: LEDs or bar.

## Presets

None yet.
