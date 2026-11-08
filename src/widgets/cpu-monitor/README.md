# CPU Monitor

Load, temperature, power and clock of one processor, with its threads.

## What it shows

The processor's total load with a trend, its temperature, package power and clock, the VRM temperature and CPU fan where
the board reports them, and every thread as bars or a heatmap (by load or clock). Small zones get a summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen processor, `libre.<cpu>_*`: `cpu_total` and
`cpu_core_max`, the per-thread loads, and per core the clock, power and voltage in AMD's keys (`core__<n>__effective`,
`core__<n>__smu`, `core__<n>_vid`) or Intel's (`cpu_core__<n>_clock`, `_power`, `_voltage`). Temperature, power and
clock are read by role, so Intel's key shapes read as well as AMD's; the VRM temperature and CPU fan come from the
board's readings.

## Options

- **Threads**: Bars, Heatmap or Off, with its **Metric** (Load or Clock) and the **Heatmap ramp** (Style).
- **Processor**.
- Thresholds: Load. Units & format: the temperature unit and decimals.

## Presets

None yet.
