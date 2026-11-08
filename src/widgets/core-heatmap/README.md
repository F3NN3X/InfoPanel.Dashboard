# Core Heatmap

Every thread of one processor as a coloured cell.

## What it shows

One cell per thread (up to 64), coloured by its load, clock, power or voltage, as a grid, hexagons, a radial ring or a
waterfall over time. Grid cells above a share of the highest value get an outline. Small zones get a dense view of their
own, no summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen processor, `libre.<cpu>_*`: `cpu_total`, the
per-thread loads (AMD's, Intel's and HWiNFO's key shapes), and per core the clock, power and voltage in AMD's keys
(`core__<n>__effective`, `core__<n>__smu`, `core__<n>_vid`) or Intel's (`cpu_core__<n>_clock`, `_power`, `_voltage`).

## Options

- **Shape**: Grid, Hexagons, Radial or Waterfall; **Metric**: Load, Clock, Power or Voltage (VID); **Values in cells**
  (grid and hexagons).
- **Color ramp** (Style, More).
- **Processor**.
- **Waterfall columns** (Behaviour).
- Thresholds: **Outline cells above (%)** (grid).

## Presets

None yet.
