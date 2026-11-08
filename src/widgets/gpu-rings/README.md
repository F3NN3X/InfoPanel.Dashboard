# GPU Rings

GPU load, VRAM and temperature as rings.

## What it shows

Two stacked radial rings for bounded percentages (VRAM outer, core load inner by default) around the core temperature,
with a legend of the two ring values, the core clock, power, fans and the memory junction temperature. Small zones get a
dense view of their own; there is no summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen graphics card, `libre.<gpu>_*`: `gpu_memory_used` /
`gpu_memory_total` (MB) and `gpu_memory`, `gpu_core_load`, `gpu_board_power`, `gpu_core` (°C), `gpu_core_clock`,
`gpu_package` (W), `gpu_fan_1`–`gpu_fan_3` (RPM), `gpu_fan_1_control` (%) and `gpu_memory_junction`. The card's name
comes from RTSS (`plugins.InfoPanel.RTSS.rtss.gpu-name`) when it runs, else from the key.

## Options

- **Outer ring**: VRAM, Load or Power.
- **Inner ring**: Load, VRAM or Fan.
- **Outer ring** and **Inner ring** colours: the theme's Series 1 and 2 unless set.
- **Graphics card**: Auto (the first GPU) or a chosen one.

## Presets

None yet.
