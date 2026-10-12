# System widget (`systemmodern`)

Picker name **System (modern)**, minimum footprint 2 x 1 cells. It shows
CPU, GPU, RAM and Disks as device blocks: a load ring each (drives get
used-space bars), with temperature, power, memory and other details beside it.
This page is the full reference; the one-line entry is in
[module-catalog.md](module-catalog.md), and the standard options shared with
every widget are in [widget-settings.md](widget-settings.md).

`systemmodern` is an alias of the **System Overview** template: the id, the
keys and today's defaults are unchanged, the zone draws through the shared
widget shell, and the Library lists System Overview instead. A System
Overview zone reads the same keys but chooses its blocks with `sections`
(CPU, GPU, RAM, VRAM, Disks, Net) and `coreView` instead of `devices`,
`showVram` and `showCores`, and starts with every detail and its graphs on.

Code: `src/modules/system-modern.tsx` (alias and wiring),
`src/widgets/registry/system-overview.ts` (the stored keys and how they map
to template props), `src/widgets/SystemOverview.tsx` (layout),
`src/lib/system-metrics.ts` (reading the sensors).

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
spacing, colors and type, border, glow, opacity, blur, custom CSS, and the
look keys skin, variant, graph style, meter style and compact view), the
widget has these keys, each in a category card of the studio inspector
(after the general cards, in this order). "Category" is the card.

| Key | Type | Default | Effect | Category |
|---|---|---|---|---|
| `devices` | multi-select: `cpu`, `gpu`, `ram`, `disk` | `cpu,gpu,ram` | Which device blocks to show. They always appear in the order CPU, GPU, RAM, Disks. With none selected the widget renders nothing. | Devices |
| `showVram` | boolean | on | GPU memory bar under the GPU | GPU |
| `showTemps` | boolean | on | CPU and GPU temperature | Devices |
| `showPower` | boolean | on | CPU and GPU power draw, in W | Devices |
| `showClock` | boolean | off | GPU core clock, in MHz | GPU |
| `showMemory` | boolean | on | Used / total GB for RAM and VRAM (otherwise VRAM shows a percentage) | Memory |
| `showNames` | boolean | off | Hardware model under the device label (CPU and GPU) | Devices |
| `showHotspot` | boolean | off | GPU memory junction temperature ("Hotspot") | GPU |
| `showFans` | boolean | off | GPU fan speed: average RPM and duty % | GPU |
| `showMemClock` | boolean | off | GPU memory clock ("Mem … MHz") | GPU |
| `showPowerLimit` | boolean | off | GPU power as % of its limit ("… % limit") | GPU |
| `showPageFile` | boolean | off | RAM page file, used / total GB (else a percentage) | Memory |
| `showCores` | boolean | off | One block per CPU thread under the CPU | CPU |
| `coreStyle` | `heatmap` / `bars` | `heatmap` | Thread block style | CPU |
| `showDiskTemp` | boolean | on | Per-drive temperature | Drives |
| `showDiskIo` | boolean | on | Per-drive read and write rate (`R …`, `W …`) | Drives |
| `showDiskLife` | boolean | off | Per-drive remaining life ("Life …%") | Drives |
| `diskFilter` | text | empty | Comma-separated drive names to show; empty = all | Drives |
| `sparkline` | boolean | off | Rolling trend line per load (CPU, GPU, RAM) and for VRAM | Trends |
| `historyLength` | number 12-120, step 12 | 48 | Samples kept for the sparklines | Trends |
| `tempWarn` | number 50-100, step 5 | 80 | Temperature warning, °C | Thresholds |
| `tempCrit` | number 50-110, step 5 | 90 | Temperature critical, °C | Thresholds |
| `loadWarn` | number 10-100, step 5 | 80 | Load warning, % | Thresholds |
| `loadCrit` | number 10-100, step 5 | 95 | Load critical, % | Thresholds |
| `vramWarn` | number 10-100, step 5 | 90 | VRAM and drive "full" warning, % | Thresholds |
| `tempUnit` | `c` / `f` | `c` | Temperature unit for display | Units & labels |
| `decimals` | `0` / `1` | `0` | Decimals on percentages and temperatures | Units & labels |
| `cpuLabel`, `gpuLabel`, `ramLabel`, `diskLabel` | text | empty | Replace the device label ("CPU", "GPU", "RAM", "Disks") | Units & labels |
| `cpuColor`, `gpuColor`, `ramColor`, `diskColor`, `vramColor` | color | empty | Ring / bar color per device and for the VRAM bar; empty = default | Device colors |

Default colors: CPU `#38bdf8`, GPU `#a78bfa`, RAM `#4ade80`, VRAM `#fbbf24`,
Disks `#fb7185`. A threshold value of 0 (or a non-number) falls back to its
default.

## Layouts

The widget draws inside the shared shell, which measures the zone and hands
the layout its size tier (`xs` / `sm` / `md` / `lg`) and its shape. The shape
follows the grid span: a 1 x 1 zone is a **tile**, a wide, short one a
**strip**, a tall, narrow one a **column**, anything else a **box**. Setting
the standard `layout` option fixes the tier (card = `lg`, standard = `md`,
compact = `sm`, simple = `xs`); the shape is always measured.

| Shape | Look |
|---|---|
| Tile | Concentric activity rings for CPU, GPU and RAM (VRAM is a detail of the GPU here), amber or red when hot; the three loads are listed beside them when the tile is wide enough |
| Anything else | The device blocks in a grid: one column for a column or a tall box, one row while each block keeps about 150 px for its ring, otherwise two columns |

How much each block shows follows its own height: under 92 px a single line
(ring or value, label), under 170 px adds the detail line, above that the
full block with the stats, the thread grid, the sparkline and the drive list.
The ring is dropped when a block is under about 130 px wide or 54 px tall.
The **Studio** variant replaces the whole layout with a compact summary
(lead load, trend and one row per device). The widget has no separate
compact view of its own, so the Compact view look key changes nothing here.

What each level shows:

| | full | mid | min |
|---|---|---|---|
| Load ring, label and value | yes | yes | yes |
| Detail line (temperature, power, clock, ...) | yes | yes | only when the block has no hardware name |
| VRAM bar | yes | yes | no |
| Sparklines | yes | no | no |
| CPU thread grid | yes | yes | no |
| Drive list | yes | yes | no |

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

The Disks ring in a small block shows the fullest drive and
uses the drive rule.

## The thread grid

`showCores` adds one small block per CPU thread under the CPU once the block
is tall enough (see Layouts). The loads come from `…_cpu_core__N` keys (unit %), sorted by
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

## Sizing

The template fits itself to its zone, so there is no design size to
compute: the shell measures the zone, the layout picks the grid and the detail
level above, and the ring size comes from the block's own height and width.
The standard **Size %** option zooms the content on top of that (the tier and
shape are then measured after the zoom). **Scale with the zone** has nothing
left to scale; the setting stays stored for older configs.

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
- **Small blocks omit** the thread grid, sparklines, the VRAM bar and the
  drive list (see the levels under Layouts); the tile shows loads only.
- **No data, no widget.** The widget renders nothing (the zone is empty in
  the kiosk) until a CPU, RAM or GPU load — or, with Disks selected, a drive —
  is available.
- **Layout is per zone size.** The detail level drops as the zone shrinks, so
  a small zone hides details rather than clipping them; pick a larger zone to
  see them.
