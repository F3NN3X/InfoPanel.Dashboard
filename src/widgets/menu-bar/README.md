# Menu Bar

Glance strip of labels and values.

## What it shows

An always-visible strip in the style of iStat Menus: each item's label over its value, with a mini history bar. The items
are CPU, GPU, temperature, memory, download, upload and NVMe. Clicking an item opens its detail, or an active item shows
its detail without a click when the widget is tall enough. It draws no header; small zones get a summary card and a dense
view of their own.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases), `libre.*`: the chosen processor's `<cpu>_cpu_total` and
`<cpu>_cpu_core_max`, the graphics card's `<gpu>_gpu_core_load`, `gpu_core`, `gpu_core_clock`, `gpu_memory_used`,
`gpu_memory_junction` and `gpu_package`, `total_memory_memory` (with `_used` and `_available`), the network adapter's
`<net>_download_speed`, `upload_speed`, `data_downloaded`, `data_uploaded` and `network_utilization`, and the first
disk's `<disk>_temperature` (or `composite_temperature`), `life` and `read_rate`. CPU temperature and power come from the
hardware readings by name.

## Options

- **Items**: which of CPU, GPU, Temperature, Memory, Download, Upload and NVMe, in that order.
- **Active item**: None, or the item shown selected with its detail.
- **Label placement**: Auto, Stacked or Inline.
- **Network adapter**: Auto or a chosen one (only with Download or Upload in the bar).
- **Detail dropdown on click** (Behaviour).
- Units & format: the speed unit of the network rates.

## Presets

None yet.
