# Status Tracker

State history, one block per reading.

## What it shows

Five tracks, each a row of blocks, one per reading (Tremor Tracker style): OK, 50–80 %, above 80 % or down, and no data.
Three threshold tracks (hottest thread, GPU load, memory) and two status tracks (Ethernet, Data API). Hovering a block
shows its value. Small zones get a summary card and a dense view of their own.

## Data it needs

By default LibreHardwareMonitor (or HWiNFO through its aliases), `libre.*`: the processor's `<cpu>_cpu_core_max`, the
graphics card's `<gpu>_gpu_core_load` and `total_memory_memory`; the network adapter's state; and the Data API's own
`system.bridge.status` and `system.bridge.time`. Each track can read any sensor instead.

## Options

- **Track 1–5 label**, and for the two status tracks the **value that means up**.
- **Track 1–5 sensor**: empty for the default reading.
- **History length (samples)** (Behaviour).
- Thresholds: the Load threshold, and each threshold track's own warning and critical levels (blank = the Load
  threshold, `off` = never).

## Presets

None yet.
