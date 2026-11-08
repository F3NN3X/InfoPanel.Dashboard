# Stream Mixer

Touch faders for Windows audio or Wave Link.

## What it shows

Large touch faders per device or app: icon, name, status line, LED fader and level, with tap-to-mute. It controls this
PC's Windows audio or Elgato Wave Link, as rows or as console strips and an LCD. Small zones get a summary card and a
dense view of their own.

## Data it needs

The server's audio control (`src/lib/audio-control.ts`: Windows audio and Wave Link), not sensor keys. It reads and
writes it, so it draws without sensor keys.

## Options

- **Control**: Windows or Wave Link, and the **Wave Link mix**; **Channels** (none = all).
- **Names**, **Status lines** and **Icons** per channel; the **Fader** (LEDs or bar) of the rows view.
- **View**: Rows, Strips or LCD, with their strip, meter and fader options.

## Presets

None yet.
