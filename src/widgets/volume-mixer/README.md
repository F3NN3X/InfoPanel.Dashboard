# Volume Mixer

Volume and mute per device.

## What it shows

Per-device volume and mute, the default device, and Wave Link status, as rows or as the mixer's console strips and LCD
views. It is read-only: the volume plugin has no write path. Small zones get a summary card and a dense view of their own.
It sends to the Dynamic Island.

## Data it needs

The volume plugin, `plugins.volume-plugin.*` (one container per device, with `short_name`, volume and mute), and
`plugins.wavelink-plugin.*` for the Wave Link status (it owns both prefixes); the meters read the audio level
meter plugin.

## Options

- **View**: Rows, Strips or LCD, with their strip, meter and fader options.
- **Devices** (none = all) and the audio direction filter; **Show device**, **Show mute state** and the **Level** colour.

## Presets

None yet.
