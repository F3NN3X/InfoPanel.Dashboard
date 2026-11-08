# Frame Histogram

Frame-time bins with 1% and 0.1% lows.

## What it shows

The frame times of the last minute in bins, with the 1% and 0.1% lows marked and the 60 and 120 fps frame budgets as guides.
A tall bar to the right of the guides is stutter. A friendly empty state when no game runs. A summary card; the dense view
falls back to it.

## Data it needs

The sensor roles, not fixed keys (`role-data.ts`, owning no prefix): `fps` and `frametime` (RTSS's Current Frame Time, or a reading named Frame Time in ms).

## Options

- **Window (s)**: how many seconds of frames are counted (one reading a second).

## Presets

None yet.
