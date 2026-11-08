# Status Bar

Top bar with slots for any readout.

## What it shows

A one-row bar with a left, a center and a right slot, each holding any of the logo, text, date, time, weather, CPU and
GPU load and temperature, memory, network rates, disk, network, volume, battery, the playing track, uptime, and CPU, GPU
and FPS rings, double rings and lines. Six frames: Edge, Pill, Islands, Meters, Orbit and Ticker. It leaves room for the
Dynamic Island at the page center while the island is on.

## Data it needs

Each item reads only when it is in a slot: LibreHardwareMonitor `libre.*` (CPU, GPU and memory load and temperature,
battery charge level), the weather plugins (`plugins.yr-weather-plugin.*`, else `plugins.weather-plugin.weather.*`),
`plugins.network-info-plugin.*`, `plugins.volume-plugin.*`, `plugins.drive-info-plugin.*`,
`plugins.system-info-plugin.uptime.*`, the Now Playing sources and RTSS or the fps plugin (`plugins.InfoPanel.RTSS.rtss.*`,
`plugins.fps-plugin.fps.*`) for FPS and frame time. An item with no data is left out.

## Options

- **View**: Edge, Pill, Islands, Meters, Orbit or Ticker.
- **Left**, **Center**, **Right**: the items of each slot, in the order picked.
- **Show** (icon and value, value or icon), **Dividers**, **Spacing**.
- **Logo icon** and **Logo image**, **Text**, **Show seconds**, the weather icon set, style and animation.
- **Gap for the island**: Auto, Off or a custom width.
- Units & format: clock, temperature unit and speed units.

## Presets

None yet. The Meters, Orbit and Ticker views set their slots when added.
