# Thermals

Every temperature sensor, hottest first.

## What it shows

Every temperature in one place (CPU, GPU core and memory junction, NVMe and SSD drives, VRM), hottest first, with a
warning marker on each row. Two views: Bars, and Temp gauges (the hottest four as rings, with the fans under them). Small
zones get a summary card and a dense view of their own.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases), `libre.*`: the graphics card's `<gpu>_gpu_core` and
`gpu_memory_junction`, each drive's `<disk>_temperature` (or `composite_temperature`, `temperature__2`) with its own
`warning_temperature` and `critical_temperature`, and the CPU and VRM temperatures from the hardware readings by name.
With **All temperature sensors** on it lists every `libre.*` / `hwinfo.*` temperature instead; the gauges' fan row reads
the fan readings the same way.

## Options

- **View**: Bars or Temp gauges.
- **All temperature sensors**.
- **Fan readings** and the **Fan dot** colour (gauges only; the dot follows the theme's Series 3 unless set).
- **Order**: Hottest first or Fixed (Behaviour).
- **Bar scale (°C)** (Data).
- Thresholds: **Use sensor limits** (each sensor's own levels), else the Temperature threshold.
- Units & format: the temperature unit.

## Presets

None yet.
