# KPI Tiles

Four key numbers with trends.

## What it shows

Two views. Tiles: the numbers you check first, each with its change since about ten readings ago and a trend sparkline
with a live end dot. Vitals: CPU, GPU, RAM and network as cards side by side, which reflow into a row, a 2×2 grid or a
stack to suit the zone. Vitals was a widget of its own until config v19, which made every Vitals zone this view. No header
in either view.

## Data it needs

The system readings (`src/lib/system-metrics.ts`): the Data API's own `system.*` keys where it has them, the rest from
LibreHardwareMonitor or HWiNFO, found by suffix and unit. FPS (Vitals view) is RTSS, `plugins.InfoPanel.RTSS.rtss.fps`
and `resolution`. It owns no prefix.

## Options

- **View**: Tiles or Vitals.
- **Tiles** (Tiles view): which numbers, from CPU, GPU, Memory, Network, VRAM and Power; and **Change over (readings)**,
  how far back the change is counted.
- **Metrics** (Vitals view): which cards, from CPU, GPU, RAM, Network, VRAM and FPS (the Vitals widget's `metrics`,
  stored as `cardMetrics` since config v19).

## Presets

None yet.
