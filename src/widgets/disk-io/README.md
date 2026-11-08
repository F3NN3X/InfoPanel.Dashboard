# Disk I/O

Each drive's read and write rate.

## What it shows

One row per drive (or the one chosen) with its read and write rates as bars, and a combined read plus write history under
them. Under 170 px wide a row drops its bar. Small zones get a summary card and a dense view of their own.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases), for each drive: `libre.<disk>_read_rate`, `write_rate` and
`total_activity`, and `volumes` for its name.

## Options

- **Combined history**.
- **Read** and **Write** colours (the theme's Series 1 and 2 unless set).
- **Disk** (Auto = every detected drive).

## Presets

None yet.
