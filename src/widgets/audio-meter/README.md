# Audio Meter

Left and right level with peak hold.

## What it shows

L/R level, peak, RMS and peak hold for one audio device, as an LED ladder, bar, solid bar, VU needle, ring, mirror or wave; or,
in its All devices mode, a meter bridge with one meter for every device. Small zones get a summary card and a dense view of
their own.

## Data it needs

The audio level meter plugin, `plugins.audio-level-meter.*` (it owns the prefix), grouped by container (device): the entries
are found by their key suffix (`audio-level`, `peak-level`, `rms-level`, `left-channel`, `right-channel`, `device-name`),
and the legacy plain names (`Level`, `Peak`, ...) are the fallback. The `default-audio` container is labelled "Default
device". Volume and mute come from the volume plugin when shown.

## Options

- **Mode**: One device or All devices; **Meter type** and **Segments** (One device), **Bridge layout** (All devices).
- **Device** or **Devices**, and the audio direction filter; **Level** and **Hot level** colours.
- **Details**: device name, Peak / RMS, L/R, volume and mute.
- Units & thresholds: the Audio level threshold (dBFS); **Meter response**.

## Presets

None yet.
