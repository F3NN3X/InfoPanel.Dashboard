# System Overview

CPU, GPU, memory, VRAM, drives and network in one panel.

## What it shows

One section per chosen device (CPU, GPU, RAM, VRAM, drives, network), in the order they were picked. Three views: Panel
(load rings, hardware names, temperatures and power, the CPU threads as a heatmap or bars, and trend sparklines), Graphs
(one sparkline row per metric) and Gauges (an open-arc dial per metric). The title only, no header bar; small zones get a
dense view of their own.

## Data it needs

Loads from `system.cpu.load` and `system.ram.load`; the rest from LibreHardwareMonitor (or HWiNFO through its aliases),
`libre.*`, found by key suffix and unit (`src/lib/system-metrics.ts`): the GPU's `_gpu_core_load`, `_gpu_core`,
`_gpu_package`, `_gpu_core_clock`, `_gpu_memory`, `_gpu_memory_used` / `_gpu_memory_total`, `_gpu_memory_junction`,
`_gpu_fan_<n>` / `_gpu_fan_<n>_control`, `_gpu_memory_clock` and `_gpu_power`; the CPU's `_cpu_total`, temperature,
package power and per-thread `_cpu_core__<n>`; memory's `total_memory_memory_used` / `_available` and the page file's
`virtual_memory_memory*`; each drive's `<drive>_used_space`, temperature, `_read_rate` / `_write_rate`, `_life`,
`_total_space` / `_free_space` and `_volumes`; the network adapter's speeds.

## Options

- **View**: Panel, Graphs or Gauges; **Show**: the sections, in click order.
- Panel only: **Detail level**, **Load rings**, the hardware names, temperatures and power, the CPU **Threads** view, the
  GPU, memory and drive details, and **Trend sparklines**.
- A **Label** per section (More), and one colour per section (theme Series 1 to 6) or **One accent for every section**.
- Graphs and Gauges: the **Drive** and what it shows, the network **Adapter**, **Direction** and **Top speed**.
- **Drives to show** (Data) and the trend **Length** (Behaviour).
- Thresholds: Load, Temperature and Fullness (VRAM and drives). Units & format: the temperature unit and decimals.

## Presets

None yet.
