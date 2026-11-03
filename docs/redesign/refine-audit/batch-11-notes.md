# Batch 11 notes: widget scale and grammar (D-01, C-08, C-09, C-10, D-21 tail, StatusBar stack, Fader NaN)

Shots: `scratchpad\refine\shots\b11\` (before-/after- per widget and span, `sheet-a.png` to `sheet-d.png`, `changed.txt` lists the shots that differ). Overflow probe diff (1x1, 2x1, 2x2, 4x2, 4x4, every widget): nothing NEW.

## D-01 row heights on roomy spans: partial
- Rule after review: at 4x4 a widget keeps the rows it fitted before (never fewer) and shares the spare height between them, with a cap.
- `src/widgets/core/layout.ts`: `rowPx(px, w, h)` = `px` x `ROOMY_SCALE` when `roomy(w, h)`, else `px` (unit-tested). Used by Timer only (the Pause / Stop buttons' height and the running clock's reserve under them); there is no row count there to lose.
- ProcessList (`ProcessList.tsx`): the count is the old `ROW_H` fit; `fillRows` grows each row up to 1.6x of 20px to use the spare height (12 rows stay 12, the gap at the bottom closes). Notifications (`Notifications.tsx`): the count is the old 20 to 30px fit; the shown lines share the history's height up to 40px each (5 lines stay 5 and no longer huddle at the top; the bottom half stays empty by design of the cap). DriveSpaceViews `DriveRows`: old count, `fillRows` grows `minHeight`. SteamFriends: table rows grow with `fillRows` over the header and the rows; the lists are unchanged.
- `rowsFor` max raised by `ROOMY_SCALE` in SessionStats `RangeBlocks` (72 to 90) and ThresholdTimeline `RoomyLanes` (64 to 80); both are 4x4-only and the count comes from `min`, so rows only get taller.
- Reverted after review (a scaled pitch cost rows): SystemOverviewViews `MetricGraphs` (its rows already stretch with `flex-1`), SteamLibrary (row pitch follows the scaled type already), CodingAgents Summary (and the limits and breakdown packer, whose exported height functions pick a layout density). Not done, hence partial.
- Review nit 6 (Notifications' `120` header reserve not scaled): left, scaling it would reduce the line count.
- Non-roomy spans: markup unchanged.

## C-08 axis labels: fixed
- `primitives.tsx`: `ChartAxis` gains `centred` (every label on its position, for labels sitting on gridlines); new `ChartYAxis` (faint mono micro labels, right-aligned, centred on `at` % from the top, flush at 0 and 100).
- FramePacing: the budget labels (60 fps / 16.7 ms) are on the `ChartYAxis` beside the plot (was a column of muted sans text). DayPlanner: the hour labels use `ChartYAxis` (vertical) or a `ChartAxis` under the plot (horizontal, was above it).
- Look at: FramePacing 4x2/4x4, DayPlanner 4x2/4x4.

## C-09 units split from the value: partial
- `Stat` takes `unit`, drawn after the value with `UNIT_CLASS` at `!text-[0.7em]`. `Metric` already had `unit` (0.4em hero unit), so it is unchanged. New `gbParts` in `data.ts` (`fmtGB` joins it; tested).
- Converted: CpuMonitor, GpuMonitor, FpsMonitor, NetworkThroughput (including Downloaded / Uploaded / Utilisation).
- Left with baked units: FpsMonitor `Display` (resolution and Hz), StorageHealth (`fmtGB` in `StatGrid` items), PowerDraw, MenuBar, AudioMeter, KpiTiles/Vitals (already use `UNIT_CLASS` on their own), SystemStatus, FramePacing's own `cell`, `StatGrid` itself (takes strings).
- Snapshots: `v8-parity.json` cases `cpu-default cpu-lg gm-default gm-own nt-default fps-default fps-gauge fps-trend fps-trend-bare fps-own-follows` changed, only because the unit moved into its own span (the number and unit are no longer one text node). `tests/widgets/hwinfo-only.test.tsx` expects "Max core 55 %" instead of "Max core 55%": the test strips tags and joins text nodes with a space, and the unit is now its own text node, so the reading and its value are still checked exactly (same as its "12 %" entries); the check is not looser.
- Look at: CpuMonitor, GpuMonitor, FpsMonitor, NetworkThroughput 4x2 / 4x4.

## C-10 DriveSpace ok bar: fixed (reworked)
- User decision: the "Neutral below thresholds" toggle (`registry/b.ts:52`) now defaults to off. `DriveSpace.tsx` `tn`: `p.neutral === true` draws an ok bar grey, anything else (missing or `false`) in the accent. The earlier render-only hard-coding of the accent is gone, so the toggle works again.
- Saved data: checked that a widget that never touched the toggle stores no `neutral` key (the settings panel writes only changed values and `clearsOwn` drops a key set back to the default; `toProps` reads `boolOf(s.neutral)`, undefined when absent; no default-filling for DriveSpace in `mergeConfig` or `legacy-zones`). So untouched widgets move to the accent; a widget that saved `true` keeps grey; saved `false` is the accent as before. A widget whose user had toggled it back to on (key cleared) is indistinguishable from untouched and also moves to the accent.
- Schema snapshot: no snapshot lists this default (the registry schema tests pass unchanged), so none needed updating. `docs/widget-settings*.md` do not state the default.
- Test: `tests/widgets/DriveSpace.test.ts` (missing and `false` are accent, `true` is grey). Applies to the list view at every size; Segments and Bars always drew the accent.

## D-21 tail: Wave Link rows on ChannelRow
- `core/channel-row.tsx`: `stereo` (two level bars, `STEREO_BAR` 3px with a `STEREO_GAP` 2px, so the pair is as tall as one 8px bar) in place of `bar`; `trailing` (a line under the row across its columns). `WaveLink/meters.tsx`: `levelBar`.
- Every datum stays at every span (review S1): wide rows keep chips and both dB readouts in the trailing line; medium rows (150 to 300px wide, or under 100 tall) keep the left readout there; tiles (under 150px) keep the fader value there. `tests/widgets/mixer-views.test.tsx` "Wave Link's rows" and `tests/widgets/core/channel-row.test.tsx` (the `stereo` and `trailing` contract, and that a row without them keeps its single bar cell) pin it.
- `WaveLink.tsx`: `WaveRow` (was `ChannelRow`) uses it: name 14px left (muted when the channel is muted, mute icon after it), thin L/R meters, the fader value right at 16px (dB without the unit); mix chips and the "L R dB" readout in the trailing line, only on wide rows. The list is a `ul` (device rows in `li`). Row pitch for fitting: 44 with a trailing line, 28 without.
- The look of saved Wave Link rows changes (intended: the mixers are unified). Dense rows, columns, devices, strips and LCD are unchanged. Tiles (w under 150) show a truncated name (was a two-line clamp).
- Look at: WaveLink 1x1, 2x2, rows view (shots exist); the 4x4 default is the same rows view in the QA fixture only with two channels.

## StatusBar 4x4 stack
- `StatusBar/Stack.tsx`: the grid is `content-start` (tiles start at the top) instead of `content-center`. I did not spread the rows: five tiles in 440px would make 140px tiles with 28px values. Also moves the 4x2 stack to the top.

## Fader NaN
- `Math.round(clamp(NaN))` is 0: `clamp` (`core/data.ts:51`) maps a non-finite value to its minimum. So no code change. Added NaN to "announce a whole percent in range" in `tests/widgets/mixer-views.test.tsx`.

## Kiosk budget trim (exact)
- The first verify run was 6 B over the kiosk gzip limit. What changed to get under it, no behaviour lost: the `trailing` slot's wrapper `div` in `core/channel-row.tsx` was removed (the caller's element carries `col-span-full`, `WaveLink.tsx`); `ChartYAxis` lost its unused `title` prop and uses one `translateY(-${..}%)` expression (`core/primitives.tsx`); `DriveSpace.tsx` dropped two redundant `as Tone` casts. `MeterPair` now calls `levelBar` (`WaveLink/meters.tsx`, one copy). The unit class stays `${UNIT_CLASS} !text-[0.7em]` (two size classes, the important one wins) because a separate unit class string cost 19 to 35 B over the limit (review nit 2 declined). `tools/perf/budgets.json` is untouched.
- Review nit 5 (`ChartYAxis` flush at exactly 0 or 100): kept, the brief asks the first and last label to align with the plot's top and bottom.
