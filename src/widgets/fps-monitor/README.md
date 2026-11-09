# FPS Monitor

Frame rate, 1% low and frame time.

## What it shows

Four views. Frame-time graph (the default): the frame rate with its 1% low, average and frame time over a frame-time graph, and
with room the minimum and maximum, the display and the game. Gauge: the frame rate on a ring against the refresh rate (or an
FPS target) with the 1% lows, extra metrics and the display facts. Trend: the gauge with a rolling frame-rate sparkline.
Frame pacing: the frame-time graph with refresh-rate and 60 Hz budget lines, axes and four figures, because an average frame
rate hides stutter and frame-time spikes show it. The pacing view was a widget of its own (Frame Pacing) until config v19,
which made every Frame Pacing zone this view; it still reads RTSS only and draws "No game running" with any sensor present.

## Data it needs

RTSS (`plugins.InfoPanel.RTSS.rtss.*`: `fps`, `current frame time`, `refreshrate`, `avg-fps`, `1% low fps`, `min-fps`,
`max-fps`, `windowtitle`, `gpu-name`, `resolution`, `graphics-api`, `display-mode`, `benchmark-mode`) or, in the first three
views, the PresentMon plugin (`plugins.fps-plugin.fps.*`) for the same figures and its GPU and latency readings. The pacing
view owns no prefix and reads RTSS only.

## Options

- **View**: Frame-time graph, Gauge, Trend or Frame pacing.
- **FPS target** (0 = the refresh rate; not in Frame pacing).
- **Extra metrics**, **Trend sparkline** and the **Ring** and **Trend sparkline** colours (Gauge and Trend).
- **Budget lines** (Hz, comma-separated; empty = the refresh rate and 60) and **Samples** kept (Frame pacing).
- **Send to island**: the running game and its FPS, with optional start and low-FPS notices.

## Presets

None yet.
