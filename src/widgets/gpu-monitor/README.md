# GPU Monitor

Load, temperature, power, VRAM, clocks and fans of one graphics card.

## What it shows

The card's load with a trend, its core and hot-spot temperatures, power, VRAM use, fans and, with room, its engine loads
and clocks. Its name is the title. Small zones get a summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen graphics card, `libre.<gpu>_*`: `gpu_core_load`,
`gpu_core`, `gpu_hot_spot` (else `gpu_memory_junction`), `gpu_package`, `gpu_memory_used` / `gpu_memory_total`,
`gpu_fan_1`–`gpu_fan_3`, the engine loads (`d3d_3d`, `d3d_copy`, `d3d_video_decode`, `d3d_video_encode`,
`gpu_memory_controller`, `gpu_video_engine`), `gpu_core_clock`, `gpu_memory_clock`, `gpu_core_voltage` and
`gpu_board_power`. The name comes from RTSS, `plugins.InfoPanel.RTSS.rtss.gpu-name`, else the card's key.

## Options

- **Graphics card**.
- Thresholds: Temperature.

## Presets

None yet.
