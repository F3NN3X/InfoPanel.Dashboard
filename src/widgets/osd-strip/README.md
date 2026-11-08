# OSD Strip

In-game overlay strip.

## What it shows

An overlay strip in the style of RTSS / Afterburner: a fixed cell order, monospace digits, colour only when a value drops.
No header; small zones get a summary card and a dense view of their own.

## Data it needs

The RTSS plugin, `plugins.InfoPanel.RTSS.rtss.*` (`fps`, `1% low fps`, `current frame time`, `refreshrate`,
`windowtitle`), and LibreHardwareMonitor's GPU load, temperature and memory and CPU load, `libre.*`. It owns no prefix.

## Options

- **Cells**: FPS, 1% low, Frame time, GPU, CPU, VRAM and Display (all by default).
- **FPS target** (0 = the display's refresh rate).

## Presets

None yet.
