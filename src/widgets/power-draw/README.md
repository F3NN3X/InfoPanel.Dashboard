# Power Draw

CPU and GPU watts with history.

## What it shows

The CPU package and GPU package watts as a split bar against a power budget, a history of the total, and the GPU's
board-power limit. Small zones get a summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases): the graphics card's `libre.<gpu>_gpu_package` and
`<gpu>_gpu_board_power`, and the CPU package power from the hardware readings by name.

## Options

- **Power budget (W)**: the full scale of the split bar.

## Presets

None yet.
