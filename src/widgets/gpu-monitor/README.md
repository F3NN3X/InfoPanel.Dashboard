# GPU Monitor

Load, temperature, power, VRAM, clocks and fans of one graphics card.

## What it shows

The card's load with a trend, its core and hot-spot temperatures, power, VRAM use, fans and, with room, its engine loads
and clocks. Its name is the title. Small zones get a summary card.

Two views. Monitor is the card above. Rings: two stacked radial rings for bounded percentages (VRAM outer, core load inner
by default) around the core temperature, with a legend of the two ring values, the core clock, power, fans and the memory
junction temperature; small zones get a dense view of its own and no summary card. The Rings view was a widget of its own
(GPU Rings) until config v19, which made every GPU Rings zone this view.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen graphics card, `libre.<gpu>_*`: `gpu_core_load`,
`gpu_core`, `gpu_hot_spot` (else `gpu_memory_junction`), `gpu_package`, `gpu_memory_used` / `gpu_memory_total`,
`gpu_fan_1`–`gpu_fan_3`, the engine loads (`d3d_3d`, `d3d_copy`, `d3d_video_decode`, `d3d_video_encode`,
`gpu_memory_controller`, `gpu_video_engine`), `gpu_core_clock`, `gpu_memory_clock`, `gpu_core_voltage` and
`gpu_board_power`. The Rings view reads `gpu_memory_used` / `gpu_memory_total` (MB) and `gpu_memory`, `gpu_core_load`,
`gpu_board_power`, `gpu_core`, `gpu_core_clock`, `gpu_package`, `gpu_fan_1`–`gpu_fan_3`, `gpu_fan_1_control` and
`gpu_memory_junction`. The name comes from RTSS, `plugins.InfoPanel.RTSS.rtss.gpu-name`, else the card's key.

## Options

- **View**: Monitor or Rings.
- **Graphics card**.
- Thresholds: Temperature (Monitor view).
- **Outer ring**: VRAM, Load or Power; **Inner ring**: Load, VRAM or Fan (Rings view).
- **Outer ring** and **Inner ring** colours: the theme's Series 1 and 2 unless set (Rings view).

## Presets

None yet.
