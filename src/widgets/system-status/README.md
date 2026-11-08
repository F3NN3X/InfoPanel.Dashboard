# System Status

CPU, RAM and Data API health.

## What it shows

CPU and RAM load as rings or bars with a short history, the free memory, and whether the Data API is running and how
recently it answered. Small zones get a summary card.

## Data it needs

The Data API's own `system.*` readings: `system.cpu.load`, `system.ram.load`, `system.ram.free`, `system.bridge.status`
and `system.bridge.time`. It owns the `system.` prefix.

## Options

- Thresholds: the Load threshold (warning and critical) for the CPU and RAM load.

## Presets

None yet.
