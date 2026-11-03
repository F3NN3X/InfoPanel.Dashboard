# Batch 2b notes: widget layouts (W7, W8, D-04, D-10 .. D-12, D-15 .. D-24)

Checked with `npx vite build`, the overflow probe (`ofdiff b2af b2b`: no NEW lines; "gone": FpsMonitor and OsdStrip 4x4 / 4x2) and screenshots (`.cache/qa-shots/b2b`).

## Kit additions
- `core/summary-hero.tsx` `SummaryHero` + `SUMMARY_H` (72): the 4x4 summary band (48px numeral, what it counts, one context line, hairline).
- `core/channel-row.tsx` `ChannelRow`, `ChannelBar`, `CHANNEL_TRACK` (8): the mixer family's one row.
- `core/layout.ts` `stacksIn(w, h)`; `core/data.ts` `shortLabel`, `rowLabel`; `Empty` takes `hint` and `large`.
- `widget-qa/probe.ts` skips `.sr-only` nodes: a tone cue's "warning: " is a 1px clip by design. This was the "1 issue" QA badge the W8 prototype raised (the new ToneCue in the legend), and the same false positive showed on FpsMonitor 4x4 (now "gone").

## W7 (D-05) bar widgets stack
- `StatusBar.tsx`, `StatusBar/Stack.tsx`: a non-strip box shows a 2-column tile grid (name + icon over a 28px value, 20px under 360 wide; weather draws its `WeatherGlyph`; logo and cards have no value and are skipped; every view stacks, the capsule and islands chrome is ignored).
- `OsdStrip.tsx`: 2-column cells, 28px values (32px from 340 tall), as many rows as fit: 4x4 shows all 7 cells, 4x2 shows 4 (the prototype's 2). An odd last cell spans both columns.
- Threshold: the box passed to a widget is measured inside its padding, so a 4x2 is about 0.43, not 0.49. `stacksIn` is "content height >= 120 and h/w > 0.4" (2x1 stays a strip, 1400x110 is unchanged). 2x2 stacks too (4 tiles at 20px values).
- `OSD_BG` const keeps the colour-literal count at its limit.

## W8 (D-09) SystemOverview
- `SystemOverview.tsx`: RAM default `#2dd4bf` (stored colours keep theirs); the ring stack always draws the series colour; from 2x2 up the hole holds the lead number at 28px and a 3-row legend (series dot, name, value with `ToneCue` and the warn/crit colour); the 4x4 panel ring is the series colour with a cue on the big value. `SystemOverviewViews.tsx` Gauges: series ring, cue before a threshold value.
- The "1 issue" badge: caused by the probe flagging the cue's sr-only span (see kit); fixed in the probe, not by removing the cue. Not done: the 1x1 ring stack has no legend (110px). Teal RAM is near NET's green; check them together.

## D-04 summary hero (shared `SummaryHero`)
ServiceHealth (9/10, "Sources online", what is off; then one column of rows), StatusTracker (4/5, "OK now"), Thermals (hottest reading, its name, "Hottest"), SteamNews (headline count, "from N games"). Only in a roomy box; the detail budgets `h - SUMMARY_H`. Finishes batch 1's D-03 (summary number) too.

## Rows
- D-10: `SensorValue` ("No sensor", hint "Pick a sensor" in the studio) and `WebPage` use `Empty large` (28px icon, 13px label). Visualizer: bars keep a 6% idle height (`minLevel`) and "No audio" shows when the level is 0.
- D-11: `shortLabel(name, unit)` (metric first: "CPU load", "GPU temp"; model second; family words give the device when the name has no CPU/GPU). SessionStats and ThresholdTimeline rows show the metric, with the model only where two rows share a metric; the 4x4 SessionStats blocks and the 2x2 header (metric only) follow. Label column keeps the table's 1.6fr, about 35% (not 38).
- D-12: headers `--w-muted`, AVG 600 in `--w-fg` and MIN/MAX muted, 16px column gap. Units were already `text-micro` (0.73em of the 15px value, the 11px floor), kept.
- D-15 partial: StreamChat's list fades out over its top 18px. Whole rows are not counted: messages wrap, so row heights vary.
- D-16: Timer idle at 2x2 and 4x2 shows the duration as a muted 48px "05:00" over the chips (the last duration, else the first preset).
- D-17: Weather roomy: 96px icon, 88px temperature, 16px condition, a row of four stats (wind, humidity, pressure, rain) under it, forecast at the bottom. Tint untouched.
- D-18: ThresholdTimeline lanes and StatusTracker tracks with under 8 samples draw a 6px tick per sample and "collecting · n / 8" (tracker: "/ 60"). StatusTracker legend is 11px text with a 6px dot, one line, pinned to the bottom.
- D-19: StreamControl live tile (4x2) draws a "Viewers" label with the count and the area `Spark`.
- D-20: WaveLink meters 10px (14 at lg, 6 in dense rows), dB scale muted, "silent" instead of "-∞" in the tile readout (the 4x4 columns keep "-∞" under their "dB" caption), a narrow channel name wraps to two lines.
- D-21 partial (user's direction): StreamMixer and VolumeMixer share `ChannelRow` (name 14px, 8px track, value 16px tabular); VolumeMixer lost its knob; StreamMixer shows the fader marker only when it can write (not when refused) and its touch area is taller than the 8px track. WaveLink's rows and columns are not on it (they carry L/R meters, readouts and mix chips).
- D-22: StreamDeck keys under 44px (and a window whose keys come out at 36px or more) show a 3 x 3 window with 11px wrapped titles and window dots in the page row. 1x1 / 2x1 unchanged.
- D-23: SteamProfile 2x2 / 2x1 draw the avatar (56px at 2x2) with a 22px name and "status · Lv N"; only a 1x1 is the summary. The subtitle is the status, not the game.
- D-24 (taste, option A): all four numerals `--w-fg`; the label row stays muted.

## Snapshots and fixtures
- `tests/lib/__fixtures__/v8-parity.json`: 19 cases (SystemOverview, Uptime, SteamProfile, StatusTracker, Timer, CodingAgents, SensorValue, VolumeMixer, WaveLink). Differences: RAM teal and the tone cue (SystemOverview), no accent on days (Uptime), the "collecting" tick row (StatusTracker), `Empty` classes, the shared `ChannelRow` markup. Props unchanged.
- `widget-qa/demo-settings.ts`: SensorValue gets a demo sensor, WebPage a blank URL, so the QA parity e2e does not see their (now marked) empty state.

## Tests
`tests/widgets/core/data.test.ts` (shortLabel, rowLabel), `tests/widgets/StatusBar/stack.test.ts` (stacksIn, stackTiles), `tests/widgets/StreamDeck/layout.test.ts` (keyWindows).

## Look at in screenshots
4x4: StatusBar, OsdStrip, ServiceHealth, StatusTracker, Thermals, SteamNews, Weather, SessionStats, ThresholdTimeline, StreamMixer, VolumeMixer, WaveLink, StreamChat, SystemOverview. 4x2: StatusBar, OsdStrip, SessionStats, Timer, StreamControl, Visualizer. 2x2: SystemOverview, Timer, StreamDeck, SteamProfile, SensorValue. 2x1: SteamProfile.

## Uncertain
- Visualizer idle: the fixture has a level, so "No audio" was not seen; the bars in the 4x2 shot stay near the baseline because the QA input does not animate.
- StreamDeck window titles can break mid-word ("Discor / d") at 40px keys.
- StreamMixer sub-lines (device names) still cut to two lines.

## Fix round 1
- Fader touch area: the pseudo-element now spans the track's length (`inset-x-0`, or `inset-y-0` and `-inset-x-3` for vertical) so the taller hit area exists.
- `shortLabel` keeps the remaining words unless they are bare Total/Core/Package ("GPU memory used", "CPU core #1"); `rowLabel` falls back to the full name when rows still collide; tests added.
- StatusBar: a bar with no stackable tiles (cards only: Meters, Orbit, Ticker) stays a bar.
- Timer idle hero scales by text length (`idleHeroPx`, tested), so "01:30:00" fits a 2x2.
- StreamMixer rows keep their old proportions: `ChannelRow big` (16px name, 20px value), the LED ladder keeps its old height, the sub-line is one truncated line with a `title`. VolumeMixer unchanged (14/16).
- StreamDeck window titles never split a word: the font scales down to the longest word (11px floor since batch 9), two lines clamped; dot buttons 24px wide.
- Nits done: aria-label on `ChannelRow`, "collecting" lane text no longer aria-hidden. Not done: fader slider role and keyboard, PRIORITY order in the stack, double `store.read`, Thermals hero repeating the first row.
- v8-parity: VolumeMixer cases regenerated for the `aria-label`.

## Fix round 2
- VolumeMixer rows have their fader knob back (12px, `--w-fg`, shadow, as before): `ChannelBar thumb`. StreamMixer (its own `MixFader` marker, shown only when it can write) and WaveLink (not on `ChannelRow`) are untouched.
- Leftover: the fader has no `role="slider"`, `aria-valuenow` or keyboard path (StreamMixer `MixFader`, VolumeMixer bar).
