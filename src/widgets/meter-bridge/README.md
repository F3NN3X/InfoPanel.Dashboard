# Meter Bridge

Multi-channel dB meters.

## What it shows

Studio-style level meters for several audio devices at once: a dB scale, stereo LED or smooth ladders with dimmed zone
colours, peak-hold markers, a volume bar per channel and live L/R dB readouts. A dense view only; small zones keep the
meters.

## Data it needs

The audio level meter plugin, `plugins.audio-level-meter.*`, and the volume plugin's volume and mute,
`plugins.volume-plugin.*` (both read, not owned). Devices are found by container, as Audio Meter does; **Channels** picks
them (none = all).

## Options

- **Orientation**, **Ladder**, **Segments** and **dB scale**.
- **Channels** (none = all devices), the audio direction filter and **Include the default device**.
- **Details**: volume, device name, L/R readouts and mute; **Level** and **Clip level** colours.
- **Floor (dB)**, **Peak hold (ms)**, the Audio level threshold and **Meter response**.

## Presets

None yet.
