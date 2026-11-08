# Visualizer

An animated audio visualiser.

## What it shows

A canvas visualiser driven by the audio level meter's spectrum: bars, mirror, radial, wave, blob, LED dots, line and a
scrolling view, at up to 60 fps. A dense view only; small zones keep the visualiser.

## Data it needs

The audio level meter plugin's spectrum, `plugins.audio-level-meter.*` (read, not owned). It draws the loudest device unless
**Audio devices** picks some.

## Options

- **Style**, **Bands** (0 = auto) and **Peak caps**, with the shape rows of the style.
- **Color** and the colour mode rows.
- **Audio devices** and the audio direction filter.
- **Sensitivity**, **Auto gain** and the other dynamics rows.

## Presets

None yet.
