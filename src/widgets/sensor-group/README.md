# Sensor Group

Any list of readings as rows or tiles, or every hardware reading.

## What it shows

The picked sensors, each with its value and a bar, as rows or a tile grid (Auto chooses by the box), or with
Auto-discover every hardware reading, kind-dotted (temperatures, fans and power first). Rows are counted with their gaps.
Small zones get a summary card and a dense view of their own.

## Data it needs

Pick sensors: the chosen keys, any source. With none picked, this machine's own `system.cpu.load`, the graphics card's
`libre.<gpu>_gpu_core_load` and `gpu_core`, `system.ram.load` and `plugins.volume-plugin.default.volume`.
Auto-discover: every live `libre.*` / `hwinfo.*` reading.

## Options

- **Readings**: Pick sensors or Auto-discover.
- Pick sensors: **Layout** (Auto, Rows or Grid), **Bar per item**, the **Sensors** (Data; each row tunes its label, bar
  maximum, thresholds and decimals) and the shared **Bar maximum** (Data).
- Auto-discover: **Max rows** and the **Temperature**, **Fan** and **Power** dot colours.
- Thresholds: Value (pick sensors). Units & format: the temperature unit and decimals (pick sensors).

## Presets

None yet.
