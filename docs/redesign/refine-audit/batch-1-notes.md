# Batch 1 notes: shared widget code (W1, W2, W3, W6, C-08, C-09, D-07, D-13)

Built from the prototypes' approach, in the project's idiom. No screenshots were taken in this pass (see "Not verified").

## W1 hero and body type scale with the box (C-01, C-02, D-01, D-02)
- `src/widgets/core/layout.ts`: `ROOMY_SCALE` (1.25), `heroPx(w, h)` (min of 0.22w and 0.2h), `RoomyCtx`.
- `src/widgets/core/Widget.tsx`: in a roomy box the root sets the four type tokens (`--text-micro/caption/body/title`) x1.25 and `--w-hero`, carries one `data-wp-roomy` attribute (W1 and W3 merged) and provides `RoomyCtx`.
- `src/widgets/core/primitives.tsx` `Metric`: scale lg/xl/2xl without `px` takes `--w-hero` under `[data-wp-roomy]` (CpuMonitor, GpuMonitor, FpsMonitor, KpiTiles, NetworkThroughput 4x4). Stat rows keep their size class, which now follows the tokens.
- `src/widgets/core/views.tsx` `CompactView` tile: on a 2x2 (200 <= w < 340, h >= 200) the hero is 0.26h and sits between label and graph (`my-auto`) instead of on the bottom edge (CpuMonitor, GpuMonitor, Uptime, DiskIO, DriveSpace, SensorGroup, ServiceHealth, Thermals 2x2 and the other compact tiles).
- Hard-coded `text-[11px]`, `[12px]`, `[13px]`, `[15px]` in `src/widgets/**` (not widget-qa) became `text-micro/caption/body/title` (same px at 1x). Not swept: `SystemOverview.tsx`, `SystemOverviewViews.tsx` (see parity note below), `text-xs`/`text-sm`/`text-base` generally. `text-xs` became `text-caption leading-[1.333]` (same 12px / 16px) only in ProcessList, ServiceHealth, TextFile, SteamFriends, SteamLibrary, Thermals, VolumeMixer, the D-01 list widgets that show rows at 4x4; SensorGroup's was left (its roomy layout is the tile grid, and a parity fixture holds its row markup).
- Uptime, SensorValue: they already fit their numerals to the box (`numPx`, `valueFont`/`ringFont`, roomy 2x2 grid for Uptime), so there was nothing to scale; their unit span now uses `UNIT_CLASS`. MemoryUsage's ring text follows the ring (W2).
- Not done: row heights and `rowsFor` max values (ProcessList, SteamX lists) stay fixed px; TextFile still uses its own line height (inline `lineHeight`).

## W2 one ring spec (D-08, C-17, C-20)
- `primitives.tsx`: `RING_T` 7.5, `RING_GAP` 2, `RING_TRACK` = 12% of `--w-fg`; `ringStroke(diameter)` gives at least 6px on screen (`useSide` measures the ring); `ringDashOffset` stops a round cap short by its radius so the arc ends on the value (the 97% seam). `thickness`/`gap` stay as optional overrides (RadialClockStack only); every other caller dropped them. The centre is a size container; `RING_TEXT` (value 24cqw, unit 11cqw, line 9cqw, 11px floor) is used by CompactView ring, Achievements, MemoryUsage, GpuRings (19cqw core temp), SystemStatus lg rings.
- GpuRings 4x4 (`GpuRings.tsx`): ring `min(w-32, 0.46h)`, legend rows under it at body size. MemoryUsage 4x4: ring same size, centred; Available/Total under it, spark, Virtual bar at the bottom. Smaller spans keep their layout (their ring text now scales with the ring).
- CustomGauge (`CustomGauge.tsx`): the label is the configured label, else the title, else the sensor name; nothing when none (no "Gauge" stand-in). It takes its own line under the gauge from 160px tall (the gauge is fitted in the rest).
- Mirrored value: the `track` theme colour in `src/lib/infopanel/gauges/vector.ts` is now `color-mix(.. --w-fg 12%)` live and `rgba(255,255,255,.12)` baked (was .07). `VectorGaugeSvg.tsx` `WIDGET_SCOPE` no longer lists `track` (it parsed the var name from `css`, which no longer starts with one). Export tests (`tests/lib/infopanel`) pass.

## W3 area sparks (D-06)
- `primitives.tsx`: `sparkRange(values, min, max, flat)`: a constant series with no fixed top reads value +/- 10% only when `flat` (the spark reads `RoomyCtx`), so PowerDraw 2x2 is unchanged. Gridlines at 25/50/75% (`--w-faint` 22%) only in a roomy box; `Spark` props `grid={false}` (Vitals) and `axis` (top and bottom of the range, mono micro at the right edge, last-sample dot kept).
- `PowerDraw.tsx`: 4x4 spark capped at 55% with axis labels, Peak / Avg / Min row under it. `SystemStatus.tsx` md branch (4x4): sparks capped at 55%, axis and Peak / Avg under each.
- Stress data: the QA "stress" fixtures are flat series (constant), so Peak/Avg/Min are equal and the scale is not exercised; a varying series was not available and the frozen parity fixtures were not touched. The pure range function is unit-tested instead.

## W6 rows fill the height (D-03)
- `layout.ts` `fillRows(h, shown, min, gap, on)`: rows grow to 1.6x min (52px at most) and the list spreads, only when `on`. Used by ServiceHealth (roomy: one column of rows instead of two), Thermals, VolumeMixer (not when the look places the rows), StatusTracker (rows share what the legend leaves). SensorGroup 4x4 switches to the tile grid with 40px values. Timer 4x4 tiles grow to fill (100 to 152px).
- SteamNews: few headlines are not spread; at 4x4 the headline grows to `text-title` with one more line, rows stay top-packed. The detail tier (D-04) is a later batch.

## D-13 unit style
- `UNIT_CLASS` (0.4em, medium, muted, 0.18em gap, no tracking) in `Metric`, CompactView, StudioView and KpiTiles, PowerDraw, SensorValue, SystemStatus, Vitals. Word units (`isWordUnit`: lowercase word of 4+ letters, e.g. "games", "online") sit under the number as a caption in Metric and CompactView.

## D-07 Vitals
- Cards 76-109px tall give the bottom third (`h-[34%]`) to the spark and keep the numerals above it; shorter cards keep the overlay (not fixed: under 76px there is no room for a split). Vitals sparks draw no gridlines.

## C-08 axis grammar
- `ChartAxis` primitive (faint mono micro labels, first flush left, last flush right). FrameHistogram: ticks `0 ms | 8 | 17 | 20+ ms` (the fps meaning is in each tick's title), "last 1 min" moved to the header's right slot. FramePacing uses it for its time axis. FpsMonitor's duplicate "frame time" caption is gone. Spark axis/mark labels are mono (CpuMonitor, PowerDraw, SystemStatus print the numbers without a unit). Not done: DayPlanner and FramePacing's right-hand budget labels (they are level with their lines, a different job).

## C-09 stat labels
- `Stat` is uppercase micro faint over a 15px / 600 value. CpuMonitor, GpuMonitor, FpsMonitor, NetworkThroughput already used `Stat`; AudioMeter's detail row now does. Units are still part of the value string (no separate 0.7em unit).

## Status
- fixed: C-01, C-17, C-20, D-06, D-08, D-13. partial: C-02 (Weather 2x2 icon, Calendar 2x2 strip and the NetworkAdapters IP size not done), D-01 (row heights and `rowsFor` max not scaled), D-02 (Weather icon), D-03 (ServiceHealth and StatusTracker summary number is D-04), C-08 (DayPlanner, FramePacing budget labels), C-09 (units not split out), D-07 (cards under 76px keep the overlay).
- StreamControl, MenuBar, AudioMeter and WaveLink opt out of the type growth with the `fixedType` Widget prop (fixed-size tiles, meters and labels; the e2e fit check and the overflow probe caught clips and overlaps at 4x4 once the type grew).

## Snapshot change
- `tests/lib/__fixtures__/v8-parity.json` was regenerated from the current code (77 of 128 cases changed markup, `props` unchanged). It records the v7 render of nine widgets and compares the v8 migration against it, so any shared-primitive change moves it. Checked case by case: the differences are only class renames (`text-[11px]` to `text-micro` etc. at the same px, `text-xs` to `text-caption leading-[1.333]`), the unit span, the ring spec (stroke 7.5, track colour, container-type), `cqw` ring text, the added hero class on `Metric`, the Stat label/value classes, class order, the gauge scope variables, and the removed "frame time" caption.

## Look at in screenshots
- 4x4: CpuMonitor, GpuMonitor, FpsMonitor, KpiTiles, NetworkThroughput (hero 80-100px), GpuRings, MemoryUsage (new column layout), PowerDraw, SystemStatus (cap, grid, axis), SensorGroup (tile grid), ServiceHealth, StatusTracker, Thermals, VolumeMixer, Timer, SteamNews, CustomGauge, FrameHistogram, FramePacing.
- 2x2: every compact tile (hero centred), all rings (Achievements, StorageHealth, VolumeMixer, StreamMixer, SystemStatus lg, GpuRings), PowerDraw (must be unchanged), SteamLibrary / SteamFriends (word unit caption), Vitals.
- 4x2: Vitals (split tiles), FrameHistogram, FpsMonitor, AudioMeter detail row, CpuMonitor stat row.

## Uncertain / not verified
- No screenshots or `qa-shots` were run; the layouts were checked by types, unit tests and the build only.
- `Metric` takes the hero size for every lg/xl/2xl metric inside a roomy widget, including secondary ones; check 4x4 widgets with several metrics.
- `ringStroke` measures the ring with a ResizeObserver, so a ring's first paint uses 7.5% and the 6px minimum applies one frame later; the zoom of the shell is not corrected for.
- The Stat value is 15px/600 for every user of `Stat`, which is bigger than before (13px/500) in all spans.

## Fix round 1
- Overflow probe (`ofdiff` base vs b1r1): no NEW lines. MemoryUsage 4x4's column needed `min-h-0` (the spark's viewBox aspect ratio made it 300px tall); ProcessList and SteamProfile now budget the 41px / roomy 51px Stat and the roomy friend row; MenuBar, AudioMeter, WaveLink use `fixedType`.
- Review: CpuMonitor and GpuMonitor stack the stat row under the hero in a roomy box (S1); `Metric hero={false}` for SteamLibrary's three metrics (S2); ServiceHealth and Thermals count 20px rows when roomy (S3); CpuMonitor sm budget 41px (S4; other `Stat` budgets were not audited); `fillRows` never below `min` (N1), a flat series at its floor stays on the baseline (N2), `ringStroke` capped at 30 (N3), no word-unit caption for "–" (N4). N5 (a render test for the roomy gating) not added.
- v8-parity.json: the regeneration stays. The new output differs from v7 only by the intended changes: the ring spec (stroke 7.5%, track colour, container-type, cqw ring text, gap), the unit style (0.4em span, word units as a caption), the Stat label/value classes, the class renames to the type tokens at the same px (`text-[11px]` to `text-micro`, `text-xs` to `text-caption leading-[1.333]`), the roomy hero class on `Metric` (a CSS selector that matches only inside a roomy box), the Cpu/Gpu roomy stack classes (same), the gauge scope variables and the removed duplicate "frame time" caption. Props are unchanged in all NowPlaying cases and nothing else in any case differs.
