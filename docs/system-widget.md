# System widget (`systemmodern`)

Picker name **System (modern)**, minimum footprint 2 x 1 cells. It shows
CPU, GPU, RAM and Disks as device blocks: a load ring each (drives get
used-space bars), with temperature, power, memory and other details beside it.
This page is the full reference; the one-line entry is in
[module-catalog.md](module-catalog.md), and the standard options shared with
every modern widget are in [widget-settings.md](widget-settings.md).

Code: `src/modules/system-modern.tsx` (settings and wiring),
`src/components/ModernSystem.tsx` (layout), `src/lib/system-metrics.ts`
(reading the sensors).

## Where the data comes from

The widget owns `system.cpu.` and `system.ram.` and reads `libre.`
(LibreHardwareMonitor). The zone re-renders when a key under any of these
changes.

- **Loads.** CPU load is `system.cpu.load`, else LibreHardwareMonitor's
  `…_cpu_total` (%). RAM load is `system.ram.load`, else used / (used +
  available) from `libre.total_memory_memory_used` and `_available`. GPU load
  is `…_gpu_core_load`.
- **Everything else** comes from `libre.*`. Those keys contain the hardware
  name, so they are found by key suffix and unit instead of exact key. Each
  reading takes the first matching key in sorted order, so with several GPUs
  the first one wins.

| Reading | Key suffix (unit) |
|---|---|
| CPU temperature | `_core__tctl_tdie` (°C), else `_cpu_package` (°C), else `_core_max` (°C, not a GPU key) |
| CPU power | `_package` (W, not a GPU key) |
| CPU thread loads | `_cpu_core__N` (%), sorted by N |
| GPU temperature | `_gpu_core` (°C) |
| GPU power | `_gpu_package` (W) |
| GPU clock / memory clock | `_gpu_core_clock` / `_gpu_memory_clock` |
| GPU hotspot | `_gpu_memory_junction` (°C) |
| GPU power as % of limit | `_gpu_power` (%) |
| VRAM load | `_gpu_memory` (%), else used / total |
| VRAM used / total | `_gpu_memory_used` / `_gpu_memory_total` (MB, shown in GB) |
| GPU fans | `_gpu_fan_N` (RPM) and `_gpu_fan_N_control` (%), of the same card as the GPU load key |
| RAM used / available | `libre.total_memory_memory_used` / `_available` (shown as GB; total = used + available) |
| Page file | `libre.virtual_memory_memory_used` / `_available`, load from `libre.virtual_memory_memory` (%) or derived |

Hardware names (the "Hardware names" option) are the sensor names with the
trailing " CPU Total" / " GPU Core" removed.

## Settings

Besides the standard block (see
[widget-settings.md](widget-settings.md#the-standard-block-standard_settings):
preset, layout, surface, title, icon, accent, background, size, alignment,
spacing, colors and type, border, glow, opacity, blur, custom CSS), the
widget has these keys, all on the studio inspector's Content tab except
the colors (Style tab, *Colors & type*). "Group" is the collapsible section;
"top" means the ungrouped list at the top of the tab.

| Key | Type | Default | Effect | Group |
|---|---|---|---|---|
| `devices` | multi-select: `cpu`, `gpu`, `ram`, `disk` | `cpu,gpu,ram` | Which device blocks to show. They always appear in the order CPU, GPU, RAM, Disks. With none selected the widget renders nothing. | top |
| `showVram` | boolean | on | GPU memory bar under the GPU | top |
| `showTemps` | boolean | on | CPU and GPU temperature | top |
| `showPower` | boolean | on | CPU and GPU power draw, in W | top |
| `showClock` | boolean | off | GPU core clock, in MHz | top |
| `showMemory` | boolean | on | Used / total GB for RAM and VRAM (otherwise VRAM shows a percentage) | top |
| `showNames` | boolean | off | Hardware model under the device label (CPU and GPU) | top |
| `showHotspot` | boolean | off | GPU memory junction temperature ("Hotspot") | top |
| `showFans` | boolean | off | GPU fan speed: average RPM and duty % | top |
| `showMemClock` | boolean | off | GPU memory clock ("Mem … MHz") | top |
| `showPowerLimit` | boolean | off | GPU power as % of its limit ("… % limit") | top |
| `showPageFile` | boolean | off | RAM page file, used / total GB (else a percentage) | top |
| `showCores` | boolean | off | One block per CPU thread under the CPU | top |
| `coreStyle` | `heatmap` / `bars` | `heatmap` | Thread block style | top |
| `showDiskTemp` | boolean | on | Per-drive temperature | top |
| `showDiskIo` | boolean | on | Per-drive read and write rate (`R …`, `W …`) | top |
| `showDiskLife` | boolean | off | Per-drive remaining life ("Life …%") | top |
| `diskFilter` | text | empty | Comma-separated drive names to show; empty = all | top |
| `sparkline` | boolean | off | Rolling trend line per load (CPU, GPU, RAM) and for VRAM | top |
| `historyLength` | number 12-120, step 12 | 48 | Samples kept for the sparklines | top |
| `tempWarn` | number 50-100, step 5 | 80 | Temperature warning, °C | Thresholds |
| `tempCrit` | number 50-110, step 5 | 90 | Temperature critical, °C | Thresholds |
| `loadWarn` | number 10-100, step 5 | 80 | Load warning, % | Thresholds |
| `loadCrit` | number 10-100, step 5 | 95 | Load critical, % | Thresholds |
| `vramWarn` | number 10-100, step 5 | 90 | VRAM and drive "full" warning, % | Thresholds |
| `tempUnit` | `c` / `f` | `c` | Temperature unit for display | Units & labels |
| `decimals` | `0` / `1` | `0` | Decimals on percentages and temperatures | Units & labels |
| `cpuLabel`, `gpuLabel`, `ramLabel`, `diskLabel` | text | empty | Replace the device label ("CPU", "GPU", "RAM", "Disks") | Units & labels |
| `cpuColor`, `gpuColor`, `ramColor`, `diskColor`, `vramColor` | color | empty | Ring / bar color per device and for the VRAM bar; empty = default | Colors & type |

Default colors: CPU `#38bdf8`, GPU `#a78bfa`, RAM `#4ade80`, VRAM `#fbbf24`,
Disks `#fb7185`. A threshold value of 0 (or a non-number) falls back to its
default.

## Layouts

`pickVariant` chooses the layout from the zone's measured size, in this
order (the size is measured inside the zoom, so it is the widget's own
unscaled space):

| Order | Condition | Layout | Look |
|---|---|---|---|
| 1 | height <= 72 | `compact` | One pill: per device a ring (no number inside), the load text, the label and the first temperature |
| 2 | width < 300 and height < 150 | `simple` | Mini rings with the value inside and the label below |
| 3 | height >= 0.72 x width | `card` | Tall: the device blocks stacked |
| 4 | otherwise | `standard` | Wide: the device blocks side by side |

Until the zone has been measured the widget uses `standard`. Setting the
standard `layout` option to a fixed value skips this choice.

What each layout shows:

| | standard / card | compact / simple |
|---|---|---|
| Load ring, label and value | yes | yes (compact: ring, value text, label) |
| Detail line (temperature, power, clock, …) | yes | compact: only the first temperature; simple: none |
| VRAM bar | yes | no |
| Sparklines | yes | no |
| CPU thread grid | yes | no |
| Drive list | yes | no; the Disks block becomes one ring for the fullest drive |

## What each device shows

- **CPU** - load ring and value. Details, in order: temperature, power.
  Optionally the hardware name and the thread grid.
- **GPU** - load ring and value. Details, in order: temperature, hotspot,
  power, power % of limit, core clock, memory clock, fans. Optionally the
  hardware name. Below it the VRAM bar with `used / total GB` (or a
  percentage).
- **RAM** - load ring and value. Details: `used / total GB`, then the page
  file.
- **Disks** - no ring in the large layouts. Each drive is a row: its name,
  its used-space percentage, a used-space bar, and a detail line with
  temperature, `R` / `W` rates and life, as switched on. Label "Disks".

A device the machine does not report (no load, no details, no bar) is left out.
If every device is left out the widget shows "No system data".

The number inside a ring is always a whole number; `decimals` applies to the
text beside it, to temperatures and to drive percentages.

## Units

| Value | Format |
|---|---|
| Load, used space, life | percent, `decimals` digits (the ring itself shows a whole number) |
| Temperature | `64°C` or `147°F` (`tempUnit`), `decimals` digits. Thresholds stay in °C |
| Power | whole watts, `45 W` |
| Clocks | whole MHz, `2850 MHz`, `Mem 1750 MHz` |
| Fans | `Fans 1200 RPM`, plus ` · 45%` when the duty is known |
| Memory | GB with one decimal, none from 100 GB up: `12.4 / 31.2 GB` |
| Drive rates | KB/s, MB/s from 1024 KB/s, GB/s from 1 GB/s: `512 KB/s`, `3.2 MB/s` (whole MB/s from 10 MB/s) |

## Thresholds and colors

`levelOf(value, warn, crit)` returns `crit` at or above the critical value,
`warn` at or above the warning value, and `normal` below it or when there is no
reading. Warning is amber (`#f59e0b`), critical red (`#ef4444`).

| What | Compared with | Turns amber / red |
|---|---|---|
| CPU, GPU and RAM load | `loadWarn` / `loadCrit` | the ring and the load text |
| CPU, GPU, hotspot and drive temperatures | `tempWarn` / `tempCrit` (°C) | the temperature text |
| VRAM bar | `vramWarn` / `loadCrit` | the bar |
| Drive used space | `vramWarn` / `loadCrit` | the bar and the percentage |

The Disks ring in the compact and simple layouts shows the fullest drive and
uses the drive rule.

## The thread grid

`showCores` adds one small block per CPU thread under the CPU in the standard
and card layouts. The loads come from `…_cpu_core__N` keys (unit %), sorted by
N. Up to 16 threads the grid has up to 8 columns; beyond that it has a quarter
of the thread count in columns, at most 16 (so 32 threads make four rows of 8).
`coreStyle` picks the look:

- `heatmap` - 10 px blocks in the CPU color, whose opacity follows the load
  (12% idle to 100% at full load);
- `bars` - 22 px vertical bars that fill with the load.

Hovering a block shows its position and load (`#3: 42%`). A real 0% load is
kept.

## Disks

A drive is any `libre.*` key ending in `_used_space` whose unit contains `%`.
The key without that suffix identifies the drive. The doubled `_load` and
`_data` variants and network adapters never end that way, so they are not
drives.

For each drive the widget reads, by suffix on that identifier:

| Detail | Source |
|---|---|
| Name | the sensor's name without a trailing "Used Space", else the identifier |
| Used | `_used_space` (%) |
| Temperature | the first `_temperature__N` key of that drive, else `_composite_temperature`; 0 counts as unreadable |
| Read / write | `_read_rate` / `_write_rate` (KB/s) |
| Life | `_life` (%) |

`_total_space` and `_free_space` are read but not displayed.

`diskFilter` keeps the drives whose **name** contains one of the
comma-separated terms, ignoring case (for example `kingston, samsung`). It
matches the hardware name, not a drive letter.

## Content-aware design size

Auto-scale zooms the content until the zone holds the widget's design size
(see "Scaling" in [widget-settings.md](widget-settings.md#the-chrome-layer-modernchrome)).
A fixed design size would zoom a widget full of details as if it were three
rings, so `designFor` computes it from what is actually shown. The base sizes
are 560 x 220 (wide), 300 x 420 (tall) and 380 x 300 (square). It grows them
from the visible blocks:

- each device block counts as 230 px wide (a Disks block 270) plus a 24 px gap;
- a block's height is the larger of 88 px (plus the thread grid: 14 px per row
  of 8 threads, plus 8) and 32 px plus 20 px per detail (plus 46 px for the
  VRAM bar); the Disks block is 30 px plus 56 px per drive;
- zones that stack (the card shape) are sized for the column, at least 300 px
  wide.

So adding devices, details, threads or drives raises the design size and
lowers the zoom for the same zone; auto-scale only ever grows the content
(between 1x and 3x, then multiplied by Size %).

## Known limits

- **0 means unreadable.** For temperatures, power, clocks, hotspot, memory
  clock, power limit, fan speeds, VRAM used / total and total drive space, a
  reading of 0 is treated as "no reading" and the detail is hidden. Loads
  are the exception: a real
  0% is shown. The widget cannot tell a sensor that is truly at 0 from one
  that is unreadable, so a CPU package power or temperature that stays at 0
  on your system will simply not appear.
- **No CPU clock.** The widget has a GPU clock option but reads no CPU clock.
- **First GPU only.** With several GPUs the first match in key order is used.
- **Compact and simple omit** the thread grid, the VRAM bar, sparklines and
  the drive list.
- **No data, no widget.** The widget renders nothing (the zone is empty in
  the kiosk) until a CPU, RAM or GPU load — or, with Disks selected, a drive —
  is available.
- **Layout is per zone size.** A zone too small for a layout's content clips
  it (the surface hides overflow); pick a larger zone or a more compact layout.
