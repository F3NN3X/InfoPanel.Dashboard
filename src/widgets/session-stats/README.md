# Session Stats

Min, max, average and time above a level.

## What it shows

Two views. Stats: the minimum, maximum and average of up to six sensors and the time each spent above a level, counted
since the page loaded. Threshold timeline: one lane per sensor (up to six), coloured green, amber or red by its
thresholds over the last few minutes, so it shows when a sensor was hot, not just that it is. The Threshold timeline was a
widget of its own until config v19, which made every Threshold Timeline zone this view. Nothing is stored: a reload starts
again, and Reset in the studio starts over.

## Data it needs

Any numeric sensors you pick. With none picked, CPU and GPU load and temperature, read by role (`shared/role-data.ts`).
It owns no prefix.

## Options

- **View**: Stats or Threshold timeline.
- **Sensors**: up to six, in both views.
- **Time above** (Stats view): the level, in each sensor's own unit; changing it starts the counts over.
- **Window (min)** and the value **thresholds** (Threshold timeline view): the minutes shown, and the levels that turn a
  lane amber and red.

## Presets

None yet.
