# Batch 2a notes: widget layouts (W4, W5, C-04 .. C-25, D-14)

Checked with `npx vite build`, the overflow probe (`ofdiff b1f b2a`: no NEW lines; the one "gone" is DayPlanner 4x4) and screenshots (`.cache/qa-shots/b2a`).

## W4 button tile (C-03)
- `src/widgets/core/button-tile.tsx` `ButtonTile` (kit export): glyph `clamp(26, 0.28*min, 120)`, name `clamp(12, 0.07*min, 28)`, status line from 90px, a 1px hairline (`--w-faint` 70%) and a 3% fill so it reads as a button; active = 16% tint fill, optional 2px outline. AudioButton and ObsButton render through it. 1x1/2x1 stay at the lower clamps. Obs scene "active" now also gets the accent fill.
- Active and muted states are shown in `tests/widgets/core/button-tile.test.tsx` (colour, `aria-pressed`, hairline vs outline), not in screenshots (QA fixtures have none). StreamDeck is not moved onto it.

## W5 scrim (C-06, D-14)
- `core/views.tsx` CompactView image branch: bottom-up scrim `.78 / .55 at 45% / transparent 85%` (every widget with an `img`: GameSpotlight, NowPlaying, SteamProfile...). `SteamGame.tsx`: D-14's top/bottom two-stop scrim (strength follows the `scrim` setting, 0.55 default; the bottom is +0.2), Playtime / Avg session values 20px (`BIG_VALUE`).
- GameSpotlight 1x1 (w < 132): banner instead of the poster. Decision: the banner reads better than a logo-only tile. The tile already prints the game name, so the poster's own logo repeated it under the title ("ARC Raiders" over "Raiders"); a logo-only tile needs a transparent-PNG layout of its own and the logo is missing for many games. 
- Composite: below 460px wide the right column is three lines (total, session, achievements); "total in <game>" and "latest:" are gone there (latest achievement shows plain in the wider variants).
- Weather's condition tint is untouched (no scrim added).

## Rows
- C-04 partial: NetworkThroughput 4x4 always draws the mirrored trend (the `sparkline` setting still decides smaller spans; legacy zones store it false) with 50%-hero speeds stacked; DiskIO 4x2 total at 48px left, disks right; NetworkAdapters 4x4 rows grow to 52px, address a step larger. Not done: per-adapter rx/tx (the plugin has no such keys), trend at 2x2 / 4x2.
- C-05: CompactView tile whose label would be cut (`len * 7.6 > w - 46`, w < 140) shows the icon alone (faint) with the label as `title`.
- C-07: NowPlaying 4x4 stacks cover (`min(w, 0.64h)`), 22px title, artist, progress.
- C-10 partial: DriveSpace 4x4 two-line rows (name + free 15px/600, 6px bar, mono used/total · format), pitch up to 52. Grey "ok" kept: it is the existing "Neutral below thresholds" setting (default on); flipping its default would change saved zones and the schema snapshot.
- C-11: Fans 4x4 vertical meter cards (duty, else rpm share; 22px RPM top, name bottom).
- C-12 partial: MeterBridge vertical names wrap to two lines (11px) and the percent moves under the meter. 1x1 "frame cut": the overflow is the peak-hold marker's translate in `LedLadder`, pre-existing, not changed.
- C-13: AudioMeter 4x4 peak hero 56px (stat row drops Peak), 0/-6/-12 scale under the LED row at 4x2+; AudioFader 4x4 vertical fader 64px x 70% with 56px value and the mute tile.
- C-14: Bluetooth keeps the header chip only (second count gone), 4x2 one column, 4x4 56px rows with 22px percent; Notifications headline is the count summary ("1 error · 1 warning") in tone colour.
- C-15: CoreHeatmap light text up to 72% fill (shadowed on mids), short last row centred (double-width grid), header "avg 54% · max 80%".
- C-16: DayPlanner 2x2 uses the `idle` empty state ("No events today" / "No calendar"); 4x4 rail starts 8px down, labels right-aligned. The weather fill is already 14% opacity (the audit's 35% was fixed earlier).
- C-18 partial: Achievements 4x4 ring up to 0.55h with the latest unlock under it. The plugin reports only the latest unlock, so no list of 3.
- C-19 partial: Departures 2x2 puts the destination on a second line; 4x4 22px minutes, 15px destination, rows grow. "Updated 12:04" stays at the bottom (a widget cannot put a roomy-only item into the header right slot).
- C-21: FpsMonitor drops the "×" glyph (`Metric cue={false}`, `ToneCue glyph={false}` keeps the screen-reader word), ring accent unless crit, a tone chip "1% low N" when the low is under warn.
- C-22: KpiTiles delta only at |change| >= 1% (title says over how many readings), 4x2 tiles get a 24px spark, 4x4 hero up to 56px.
- C-23: Calendar 4x4 rows up to 52px, 64px day, caption beside the weekday. C-02 leftover: Calendar 2x2 draws weekday, 56px day and the week strip.
- C-24 (user's direction A): Clock 4x4 centres the time (`roomyTimePx`), seconds 0.35em muted, date line `min(0.05w, 0.2 px)`.
- C-25: BottleneckLens 4x4 band 36px; "Collecting verdicts" hint until the log has width to draw.

## Not touched
Weather 2x2 icon (C-02, D-02), FramePacing and DayPlanner budget labels (C-08) stay as batch 1 left them. Pre-existing probe items: AudioMeter 4x2/4x4 clipped hold marker, DiskIO 4x2 bar clip.

## Snapshots
`tests/lib/__fixtures__/v8-parity.json`: 28 of 128 markup cases regenerated (props unchanged). All are this batch's intended markup: AudioMeter (dB scale row), CoreHeatmap (double-width grid columns, header text, text colour), DiskIO (wrapper div), NetworkThroughput (roomy figure classes, stacked layout), Clock (centring and seconds classes), FpsMonitor (no glyph, chip wrapper), SteamGame (scrim, 20px values), Notifications (summary headline), Departures (two-part row), Bluetooth (one column, no second count).

## Look at in screenshots
4x4: NowPlaying, NetworkThroughput, NetworkAdapters, Achievements, DriveSpace, Fans, AudioMeter, AudioFader, Bluetooth, Notifications, Calendar, Clock, CoreHeatmap, DayPlanner, Departures, FpsMonitor, KpiTiles, MeterBridge, BottleneckLens, AudioButton, ObsButton. 2x2: Calendar, Departures, DayPlanner, SteamGame, AudioButton. 1x1: Achievements (icon-only), GameSpotlight, NowPlaying. 4x2: DiskIO, KpiTiles, Bluetooth, AudioMeter, SteamGame.

## Fix round 1
- Overflow probe `ofdiff b1f b2ar1`: no NEW lines (an sr-only span in the icon-only label was flagged, so it is `role="img"` with `aria-label` instead).
- Calendar: `drawsOwnTile` (200 to 240px square only) replaces the open-ended 200px test, so Summary card "Always" on a big zone gets the summary again (`tests/widgets/Calendar.test.ts`). Bluetooth: the body count stays unless the header (and so its chip) is really drawn, via `chromeOf(look).showTitle`. DriveSpace 4x4: row budget uses `ROW_H` 58. AudioMeter: the Peak hero and its stat-row change follow `showDetails`; the "0" scale label uses `-translate-x-full`. ButtonTile: `label` optional. Clock test asserts the real value. Not done: the button-tile test still checks colour, not the 16% fill (happy-dom drops `color-mix`); KpiTiles spark and delta rules apply at every size (kept, notes say 4x2 only because that is where it shows).
- FpsMonitor 4x4: stat label "Frame" (was "Frame time", cut), the 1% low pill is gone and the stat shows the low in its tone; a low under 1 or missing prints "–". v8-parity.json regenerated again for these markup changes.
