# Network Traffic

Live download and upload.

## What it shows

The download and upload rate with optional rolling sparklines (overlaid or mirrored), session totals and the adapter's
utilisation. Small zones get a summary card; the dense view falls back to it.

## Data it needs

LibreHardwareMonitor's network readings, `libre.<adapter>_*`: `download_speed` and `upload_speed`, `data_downloaded`,
`data_uploaded` and `network_utilization`. It owns no prefix.

## Options

- **Session totals** and **Trend sparkline**, with the **Chart** style (Overlay or Mirrored) when the sparkline is on.
- **Download** and **Upload**: the colours (the theme's Series 1 and 2 unless set).
- **Adapter**: pin one (Auto picks the busiest); Units & format: the speed units.

## Presets

None yet.
