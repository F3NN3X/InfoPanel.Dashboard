# Widget controls: plan

Source: `../widget-backlog.md` (IDs below refer to its rows). Each wave ends with typecheck, tests and
build green, and existing configs load and render unchanged (keys and stored values never change;
a control type may change only if old stored values still parse).

## Wave 1: clear fixes from the top 10

| Chunk | Items |
|---|---|
| Gaming + audio | D1.1, D1.2, X2 (NowPlaying, FpsMonitor, GameSpotlight, SteamGame), C2.1, C2.2 / X11, C4.1, X4 gating for C1.1, C1.2, C2.1, C5.1, D1.1, D2.1, D2.2 |
| Storage + generic | A3.1, B11.1, B1.1, B1.2, B10.1, B10.2, B11.2, B11.4, B11.5, B2.1, B3.1, B3.3, X4 gating for A10.2, A11.1, A11.2, B4.3, B8.2, B10.2, B11.2, plus a schema test that flags dependent settings shown with no consumer |

Wave 1 changes some rendering on purpose. DriveSpace row bars and the critical pill use 92, the
documented critical value, instead of 90. KpiTiles and SensorGroup no longer show the author's
hardware.

### Wave 1 status (done, merged in PR #6)

All items are in except one. B3.1 DiskIO got a single-disk pin, not a multi-select, because
`DevicePicker` has no multiple mode.

SensorValue warn and crit stay as text fields where blank means off, so a stored `"0"` keeps its
meaning. The other free-text fields became number controls.

Rendering changes on purpose:
- MeterBridge: a stored `holdMs` now overrides the preset hold.
- SensorGroup: blank `groupMax` means auto (a bar at 100 for % and °), and decimals are automatic.
- NetworkThroughput: with no `sparkline` prop, it no longer draws the chart.

`DiskIO.tsx` is now UTF-8; its separator was a lone latin-1 byte before.

Checks: typecheck, test (168 files, 3815 passed) and build all pass. A `?widget-qa` sweep of the 16
changed templates (14 skins × 2 variants × cells 110 / 150, 5,264 zones) gave 0 overflow and 0 error
tiles. FpsMonitor gauge and trend with a target set are clean as well.

## Wave 2 (decided 2026-10-13, done, merged in PR #6)

- **X1, wired in:** alignment, label case and gap now reach template bodies (see "Template bodies" in
  `docs/widget-settings.md`). Default renders were pixel-compared: 544 shots, and the only differences
  were live-meter noise.
- **C3.1, read-only:** the VolumeMixer fader is now a level bar and mute is an indicator. The
  `onSetVolume` / `onToggleMute` props are gone. The key `showMute` is kept and relabelled "Show mute
  state".
- **B11.3, per-item editor:** SensorGroup has a new `items` setting (kind `sensorItems`, a JSON
  string) for per-sensor label, max, warn, crit and decimals. Per-item values beat the shared ones,
  which beat the automatic ones. Each field edit is one undo step, and typing coalesces.
- **MeterBridge:** "Peak hold" now shows the preset's 1200, which is what applies.
- **Section header:** the space under it follows the look gap up to 12 px. This fixes header overflow
  at large gaps, which was already on main for CpuMonitor, Fans, Forecast and Notifications.

Known:
- PowerDraw 1x2 at cell 110, brutal skin, studio variant, overflows by 2 px. This was already on
  main.
- VolumeMixer 4x2 with alignment center + end and gap 16 clips its last row by 3 px in every skin.
  The list's rows come out taller (about 34 px against the 30 the row count assumes) under the
  `[data-wp-x="center"]` rules, so the count is right but the rows don't fit. Not caused by the gap:
  the same gap with alignment end + center is clean.

Sweeps: all modules × 14 skins × 2 variants × cells 110 / 150 under three non-default looks
(55,104 zones). The only finding was the VolumeMixer case above, with 0 error tiles.

## Later waves

X3 (threshold builder), X5 (units), X6 (colours), X8 (header toggle), X9 / X10 / X13 (naming and
filing), X12 (strings), then the remaining per-widget rows by group. The pass ends with the full
`?widget-qa` sweep (X14).
