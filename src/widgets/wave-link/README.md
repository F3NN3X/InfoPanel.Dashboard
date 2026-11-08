# Wave Link

Elgato Wave Link channels and gain.

## What it shows

The Elgato Wave Link mixer: software channels with live L/R meters, fader, mute and mix routes, output devices and the
app's mixes, as rows or as console strips and an LCD. Small zones get a summary card and a dense view of their own. It
sends to the Dynamic Island.

## Data it needs

The Wave Link client the dashboard server keeps (`src/lib/wavelink.ts`), not sensor keys: it draws without them and shows
an empty state until Wave Link is connected.

## Options

- **View**: Rows, Strips or LCD, with their strip, meter and fader options.
- **Source**, the audio direction filter, and what to show: readout, fader and mixes.
- **Meter**: variant, orientation and response; the live and mute colours.

## Presets

None yet.
