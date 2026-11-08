# Storage Health

One drive's life, temperature, space and traffic.

## What it shows

The chosen drive (by its volumes, else its model) with its total size in the title: life remaining as a ring, its
temperature against its own warning and critical levels, read and write rates with a trend, used and free space, and with
room the data written and read, power-on hours and the spare or power cycles. Small zones get a summary card.

## Data it needs

LibreHardwareMonitor (or HWiNFO through its aliases) for the chosen drive, `libre.<disk>_*` (read, not owned: the other
`libre.` keys stay with the fallback grid): `life`, `composite_temperature` (or `temperature`, `temperature__2`),
`warning_temperature` and `critical_temperature`, `read_rate` and `write_rate`, `total_activity`, `total_space`,
`free_space` and `used_space`, `data_written` and `data_read`, `power_on_hours`, `available_spare` or `power_on_count`,
and `volumes` for its name.

## Options

- **Disk**.

## Presets

None yet.
