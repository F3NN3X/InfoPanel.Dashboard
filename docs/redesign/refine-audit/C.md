# Audit C: widgets (35 kinds), all spans and views

Evidence: contact sheets built from `.cache/qa-shots/refine/default/` and `refine-small/default/` (one sheet per widget, every span and view). Rules: Waza `design-data-viz.md` (tabular, right-aligned numbers, main question answerable at a glance, check sparse data), ui-ux-pro-max quick-reference (dense-but-scannable, chart rules, live/stale labelling). Fixture data is flat for many histories (CPU, GPU, DiskIO, FPS, FramePacing); I only flag that where the *layout* is wrong regardless of data.

## Critique

Keep: the shared kit gives a consistent voice. Mono uppercase header, tabular numerals, one accent, semantic amber/red on bars (DriveSpace 90% amber, Bluetooth 14% red, Memory virtual 90% amber). Strong spans: OnAirBeacon (4x4 reads from across a room), Forecast 4x4 (range bars), MemoryUsage 2x2, GpuRings 4x2, BottleneckLens 4x2 (verdict as hero), Departures 2x2/4x2, Notifications 4x2, Calendar 4x2, AudioMeter 2x2 hero, NowPlaying 4x2.

Three things hold it back:
1. **The hero number does not scale with the frame.** CPU/GPU/FPS/KpiTiles/Clock/NetworkThroughput/Countdown show a 40-48px hero in 4x4 (464px) frames, then give the rest to a flat chart or to nothing. Across the room, a 4x4 CPU tile reads the same as a 4x2. 2x2 frames put the hero bottom-left under ~100px of empty space.
2. **Large spans are padded with void rather than content.** 4x4 of Achievements, AudioButton, ObsButton, AudioFader, AudioMeter, NetworkAdapters, NetworkThroughput, DriveSpace, Fans, Notifications, MemoryUsage, GpuRings, Calendar, Departures all leave 35-60% of the frame blank or place a tiny element mid-frame (a 28px icon in a 464px button).
3. **The same concept is drawn differently per widget.** Bars are grey in DriveSpace 4x2 but green in DriveSpace Bars; headline stats use 3 different label styles (mono uppercase, 11px muted sentence case, 12px muted); chart axis labels sit in different corners; 1x1 headers truncate ("COUNTDO…", "ACHIEVEM…", "ARC RAID…", "DEFAULT …"); art-backed widgets (GameSpotlight, NowPlaying 1x1) put text over busy art.

## Suggestions (ranked impact/effort)

### C-01 Hero number scales with the box in 4x4
- Where: CpuMonitor_4x4, GpuMonitor_4x4, KpiTiles_4x4, FpsMonitor_4x4, NetworkThroughput_4x4, Clock_4x4; `src/widgets/CpuMonitor.tsx:105` (`scale={size === "lg" ? "xl" : "lg"}`), `GpuMonitor.tsx` same pattern, `core/primitives.tsx:63` (Metric, `SCALES` max `2xl` = text-7xl).
- Now: CPU 4x4 hero is 48px, identical to 4x2, above a 330px flat chart. Reading distance value is the same at both spans.
- Suggest: in `roomy(w,h)` frames pass `px={Math.round(Math.min(w*0.22, h*0.16))}` (about 80-100px at 464) to Metric, unit stays 0.45em. The stat row (Max core/Package/Avg clock) stays at current size. Chart keeps `flex-1`.
- Why: Waza data-viz "main question answerable without expansion"; ui-ux-pro-max "dense-but-scannable" (one dominant figure, supporting figures smaller).
- Impact: high   Effort: M   Risk: layout-at-other-spans (gate on `roomy` only)
- Kind: refinement   Prototype: yes

### C-02 2x2 frames: lift the hero to the optical centre, cut the empty top
- Where: CpuMonitor_2x2, GpuMonitor_2x2, DiskIO_2x2, MemoryUsage (ok), NetworkAdapters_2x2, DriveSpace_2x2, FrameHistogram_2x2, Countdown_2x2, Calendar_2x2, Fans_2x2, Forecast_2x2, Departures (ok); kit: `core/Widget.tsx` body, per-widget `justify-end`.
- Now: header at top, then ~90-110px of nothing, then hero and a sub line at the bottom edge. NetworkAdapters 2x2 shows a 12px IP in a 228px frame; Calendar 2x2 shows only "12 October 2026".
- Suggest: shared `StackBody` (hero + sub + optional chart) that uses `justify-center` with the chart as `flex-1 min-h-[56px]`, and hero `px` ~ `0.26*h` (about 56px at 228). For text-only heroes (IP, "8°") use the same px. Calendar 2x2: show the weekday strip or a 7-column mini month under the 12.
- Why: Waza "tighter than marketing; use density not height"; blank quarter-frames waste the strongest span for a side monitor.
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### C-03 One button-tile primitive that scales (AudioButton, ObsButton)
- Where: AudioButton_4x4, ObsButton_4x4, 2x2; `AudioButton.tsx:63`, `ObsButton.tsx:59` (icon `text-[26px]/[34px]`, label 12px, fixed at every span).
- Now: a 34px glyph and 12px label centred in a 464px square; no visible tap affordance, no state colour until pressed.
- Suggest: icon `size = clamp(26px, 0.28*min(w,h), 120px)`, label `clamp(12px, 0.07*min(w,h), 28px)`; add a 1px `--w-faint` inset border and tinted fill on active (accent 14%) / muted (crit 14%). Shared as `ButtonTile` in the kit so StreamDeck and others follow.
- Why: ui-ux-pro-max touch targets/state (rule "visible affordance"); glanceable status across the room.
- Impact: high   Effort: S   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### C-04 Fill the large span with the data that was dropped (NetworkThroughput, DiskIO 4x2, NetworkAdapters)
- Where: NetworkThroughput_2x2/4x2/4x4 (only 1x1 has a chart), DiskIO_4x2 (hero total 24.4 MB/s vanished; two bars only), NetworkAdapters_4x4 (bottom 45% empty); `NetworkThroughput.tsx:85-86` already has dual mirrored Spark but is not shown at these spans.
- Now: 4x4 Ethernet has 20px figures in the middle of a 464 frame and nothing else. DiskIO 4x2 loses its total and sparkline.
- Suggest: NetworkThroughput 2x2+ show the mirrored down/up Spark (flex-1, min 64px) between hero rows and the totals; 4x4 hero px as C-01. DiskIO 4x2: hero total at left (48px) + per-disk bars at right, matching CPU 4x2 pattern. NetworkAdapters 4x4: add per-adapter rx/tx rate in the right column (Mono 11px, right-aligned) and use row height `1fr` up to 64px.
- Why: Waza "disclose supplementary records, not the answer"; "check sparse and typical data without padding gaps".
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### C-05 Hide the title at 1x1 (or show icon only) instead of truncating
- Where: Achievements_1x1 ("ACHIEVEM…"), AudioMeter_1x1 ("DEFAULT …"), Countdown_1x1, Forecast_1x1 ("TOMORRO…"), FpsMonitor_1x1 ("ARC RAID…"); `core/Widget.tsx:118` (header rule `box.size !== "xs"`), `core/look.ts`.
- Now: 110px frames spend ~16px on a clipped caption.
- Suggest: when the header text would truncate at 1x1 (measured, or `w < 130`) render the icon alone, 14px, `--w-faint`, and give the 16px back to the hero. Keep the full title in `title` attribute.
- Options: A icon-only header at xs; B title ellipsis allowed but no icon; C drop header entirely and tint the hero with the icon at 12% opacity behind it.
- Why: ui-ux-pro-max "truncation with purpose"; clipped labels read as errors.
- Impact: med   Effort: S   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### C-06 Legibility scrim on art-backed widgets at small spans
- Where: GameSpotlight_1x1/2x1/2x2/view-composite, NowPlaying_1x1; `GameSpotlight.tsx`, `GameSpotlightComposite.tsx`, `NowPlaying/`, `core/look.ts` `scrimFor`.
- Now: the game logo and box-art text collide with the widget's own title ("ARC Raiders" over "Raiders" art at 1x1/2x2); composite view overlaps text on the poster stripes and truncates ("total in ARC Rai…"); NowPlaying 1x1 title overlaps the disc glyph.
- Suggest: bottom-up scrim `linear-gradient(to top, rgb(0 0 0/0.78) 0, rgb(0 0 0/0.55) 45%, transparent 85%)` under all text at spans <= 2x2; hide the box-art on 1x1 and show the logo only. Composite: drop to 3 lines (name, hours, session) and remove "latest:" and the Cyrillic line below 4x4.
- Why: Waza "ban low-contrast text over imagery"; ui-ux-pro-max color contrast over images.
- Impact: high   Effort: M   Risk: none
- Kind: refinement   Prototype: yes

### C-07 NowPlaying 4x4: cover art as the hero
- Where: NowPlaying_4x4; `NowPlaying/NowPlaying.tsx`.
- Now: 173px art centred mid-frame with 130px blank above and below; the same composition as 4x2 scaled nowhere.
- Suggest: in `roomy`, stack: art square `min(w-32, h*0.52)` (about 270px), then title 22px / artist 14px / progress 4px bar with mono times. Keep source chip top-right.
- Why: Waza hierarchy (cover is the recognisable thing from a distance).
- Impact: high   Effort: M   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-08 Shared axis and stat-label grammar for charts
- Where: FrameHistogram_4x2 (`0 ms · last 1 min`, `120 fps`, `20 ms` run in one row, meaningless), FramePacing_4x4 (labels right of plot, time axis bottom), FpsMonitor_4x2 (stray "frame time" caption right-aligned under the stat row, duplicated), CpuMonitor_4x4 (`100 %`/`0 %` top right inside plot), DayPlanner_4x4.
- Now: each widget places min/max, time span and unit in a different spot and style.
- Suggest: one `ChartAxis` primitive in the kit: y labels 11px `--w-faint` mono at the plot's right edge, aligned top/bottom to the first/last gridline; x labels at left/right below the plot ("-2 min" / "now"); no inline unit strings in the axis. FrameHistogram: x axis ticks as separate cells `0 ms | 8 | 16 | 20+ ms`, remove "last 1 min" from the axis and put it in the header right slot. FpsMonitor: delete the duplicate "frame time" caption (the stat above already carries it).
- Why: Waza chart rules ("axis label size and colour exact, one grid weight"); ui-ux-pro-max chart domain (labels at consistent positions).
- Impact: med   Effort: M   Risk: none
- Kind: refinement   Prototype: no

### C-09 Per-stat label style unified (mono uppercase micro vs sentence-case)
- Where: CpuMonitor_4x2 (sentence case 11px muted: "Max core"), KpiTiles 4x2 (mono uppercase "MEMORY"), MeterBridge 4x2 (mono "PACKAGE"), FramePacing (mono uppercase), AudioMeter 4x2 (sentence "Peak"), NetworkThroughput 4x2 ("Downloaded" sentence), `core/primitives.tsx:671` (`Stat`), `StatGrid`.
- Now: three label treatments in the same product family; values also vary in size (12.5-16px).
- Suggest: `Stat` becomes the only stat primitive: label `text-micro uppercase tracking-[0.06em] --w-faint` (as in KpiTiles), value 15px/600 tabular `--w-fg`, units 0.7em `--w-muted`; make Cpu/Gpu/FpsMonitor/NetworkThroughput/AudioMeter use `StatGrid`.
- Options: A uppercase mono (current in 5 widgets), B sentence 11px muted (current in 4). Recommend A: aligns with headers and reads as a label at a distance.
- Why: Waza number-dense rules (labels left-aligned, numbers consistent); design-system consistency.
- Impact: med   Effort: M   Risk: none
- Kind: refinement   Prototype: no

### C-10 DriveSpace: one bar colour logic and use the 4x4 height
- Where: DriveSpace_4x2/4x4 (grey bars, one amber) vs view-bars/segments/list (green bars, one amber); `DriveSpace.tsx`, `DriveSpaceViews.tsx`.
- Now: the default 4x2/4x4 list draws "ok" as neutral grey; the other views draw ok as accent green. 4x4 uses only the top 50% of the frame (5 rows, 38px each).
- Suggest: ok bars = accent (same as views), warn/crit as today; 4x4 row pitch `min(64, h/(n+1))` with a 2-line row (name + used/total mono) and a 6px bar. Add a right-aligned "free" value in 15px 600.
- Why: status colours semantic across views; ui-ux-pro-max "do not use colour alone" is met by the value text.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-11 Fans 4x4: use the tall cards
- Where: Fans_4x4; `Fans.tsx`.
- Now: four 100x410 cards with a 28px icon and two lines of text in the vertical middle; 350px of dark card around.
- Suggest: in the roomy layout, the card is a vertical meter: fill from bottom by duty (accent 22% -> 40%), RPM 22px/700 at top, name 11px at bottom; "Off" card keeps fill 0 and faint icon. 4x2 unchanged.
- Why: Waza chart choice (comparing values across categories = bars); data-viz "unused space needs data".
- Impact: med   Effort: M   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-12 MeterBridge: stop truncating channel names in 4x4 and 4x2
- Where: MeterBridge_4x4 ("Syste…", "Head…", "Brow…", "Spe…"), 4x2, 1x1 (frame background cut off on the right edge in the capture), `MeterBridge.tsx`.
- Now: 86px columns with 15px name + 12px percent; the name loses its end while 150px of vertical LED space is untouched.
- Suggest: name on two lines allowed (`line-clamp-2`, 11px) and percent below the meter next to the dB readout; or abbreviate with the same `fit.ts` helper (SYS, HEAD, BRW). Fix the 1x1 frame (width 110 shows a dark strip at the right; the content wrapper is wider than the frame).
- Why: ui-ux-pro-max truncation rules; AudioMeter bridge view at 3x2 shows the same loss ("Default…", "Headp…").
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-13 AudioMeter / AudioFader: use the width and height at 4x2 and 4x4
- Where: AudioMeter_4x2/4x4, AudioFader_4x2/4x4/2x2; `AudioMeter.tsx`, `AudioFader.tsx`.
- Now: AudioMeter 4x4 draws two 12px LED rows in the middle of 464px and a 4-column stat row; hero -8.7 dB is 11px there (a hero at 2x2 is 36px, at 4x4 it disappears). AudioFader 4x4 is a 22px-tall row centred.
- Suggest: AudioMeter roomy: hero dB 56px left, L/R ladders 20px tall each, peak/RMS/hold row under. AudioFader roomy: vertical fader (`LedLadder vertical`) at 64px wide x 70% of h, with 56px value beside it; 2x2 keeps horizontal. Add 0/-6/-12 ticks under the LED row at 4x2.
- Why: Waza "main question answerable" and consistency with MeterBridge ladders.
- Impact: high   Effort: M   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-14 Redundant header chip and sub-title (Bluetooth, Notifications)
- Where: Bluetooth_2x2/4x4 ("3 devices" chip in header and "3 devices" under "Bluetooth On"), Bluetooth_4x2 (third device dropped; 2-column wrap leaves "Mouse M2" under "Bluetooth On"), Notifications_2x2/4x2 (headline "Build finished…" duplicated as first row, truncated "…2 war…"); `Bluetooth.tsx`, `Notifications.tsx:67`.
- Now: the same fact is stated twice; Bluetooth 4x4 has 100px empty above and below the list.
- Suggest: Bluetooth: remove the second "3 devices" (keep chip); 4x4 rows get 56px pitch with a 6px battery bar and 22px percent; 4x2 uses a single column of 3 rows (row 38px). Notifications: the headline becomes the *count summary* ("1 error · 2 warnings") in tone colour; first row is the latest item, no duplicate.
- Why: Waza "every element earns its place".
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### C-15 CoreHeatmap: label contrast and left-aligned grid
- Where: CoreHeatmap_2x2/4x2/4x4; `CoreHeatmap.tsx`.
- Now: dark numerals on mid-green cells (58, 60, 66) fall under ~4:1; the last row is partial (2 of 6, 5 of 9) and left-aligned leaving a jagged hole; header `54% · T2 80%` is cryptic.
- Suggest: cell text colour chosen by cell luminance (white when cell L < 0.62 else near-black `#0b0f0d`); `justify-content:center` on the last row (or distribute with `fitGrid` so rows are even); header right slot "avg 54% · max 80%".
- Why: ui-ux-pro-max color-contrast (4.5:1 text); heatmap rule "label contrast on every fill".
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-16 DayPlanner: no calendar at 2x2, clipped hour labels, weather fills the plot
- Where: DayPlanner_2x2 ("NEXT … – / No calendar"), DayPlanner_4x4 (red issue badge in QA, "11" label clipped against top, area chart drowns the hour lanes, left-hand fill), `src/widgets/DayPlanner/`.
- Now: 2x2 is an empty void with a 6px dash; the 4x4 weather area covers 60% of the timeline so events (none in fixture) would sit on a bright fill.
- Suggest: 2x2 empty state `Empty` primitive with an icon and "No events today", hero for next event time when present. 4x4: weather curve at 18% accent opacity (currently ~35%), a 24px top inset so the first hour label is not clipped, row labels 11px mono right-aligned.
- Why: ui-ux-pro-max empty states; Waza empty/sparse frames.
- Impact: med   Effort: M   Risk: none
- Kind: refinement   Prototype: yes

### C-17 GpuRings 4x4 and MemoryUsage 4x4: ring scales and the legend sits beside it
- Where: GpuRings_4x4 (ring 150px in 464, gap of 70px to list), MemoryUsage_4x4 (ring top-left, stats bottom-right, void top-right), `GpuRings.tsx`, `MemoryUsage.tsx`.
- Now: the 4x4 composition is the 4x2 composition scaled by nothing; the layout reads as two disconnected blocks.
- Suggest: ring diameter `min(w-32, h*0.46)` (about 210px) centred, hero in the ring 44px; legend rows (22px pitch) directly below, full width with right-aligned tabular values. Memory: keep Available/Total as two stat cells under the ring, Virtual bar at the bottom.
- Why: Waza hierarchy + alignment; consistency with Achievements and CustomGauge, which already fill their frames.
- Impact: med   Effort: M   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-18 Achievements 4x4 and 4x2: compose around the ring
- Where: Achievements_4x4, 4x2; `Achievements.tsx:27-62`.
- Now: 4x4 ring (150px) and "Latest unlock" sit in a band across the middle with 190px empty above and below; hero 26px.
- Suggest: 4x4: ring 220px with 56px hero, then a list of the last 3 unlocks (icon 32px, name 14px, date mono 11px right). 4x2 as today.
- Why: sparse frame check (Waza data-viz); fills with data the widget already has.
- Impact: med   Effort: M   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-19 Departures 4x4/2x2: row pitch and truncation
- Where: Departures_2x2 ("Frankenstr…", "Bahnhofq…"), Departures_4x4 (190px empty under 5 rows); `Departures.tsx`.
- Now: the line badge (40px) and minutes (60px) take 40% of a 228px row so every destination truncates; 4x4 rows stop at 270px.
- Suggest: 2x2: put destination on a second 11px line under "2 min [13]" so it never truncates; 4x4: row pitch `h/(rows+1)` up to 56px, minutes 22px, destination 15px; wrap "Updated 12:04" into the header right slot ("12:04" in muted mono).
- Why: ui-ux-pro-max truncation; Waza right-align numbers (minutes) with left labels.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-20 CustomGauge / ring tracks: stronger empty track and a label
- Where: CustomGauge_* (value 0%: track `rgba(255,255,255,0.06)` against a surface of similar luminance; no label or title text), `core/primitives.tsx:252` (`Ring` track).
- Now: a 0% gauge is a near-invisible ring; nothing says what it measures.
- Suggest: ring track `color-mix(in oklab, var(--w-fg) 12%, transparent)` for all rings (Achievements, Memory, GpuRings use the same default); `CustomGauge` renders the user's label (11px muted) below the value when height >= 160 and always at 4x4.
- Why: ui-ux-pro-max chart "track visible against surface"; label every gauge.
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-21 FpsMonitor hero: the red "×78" reads as an error
- Where: FpsMonitor_4x2/4x4 and gauge/trend views; `FpsMonitor.tsx`.
- Now: a red "×" glyph precedes 78 and the number is red while the 1% low is 0 (fixture); at a glance it signals failure, and the ring is red too.
- Suggest: colour the hero by the *tone of the metric that gates it* only (`tone(value, warn, crit)`), drop the "×" (a multiplication mark is not meaningful), and show the 1% low as an amber/red chip next to it only when it is below warn. Keep the ring accent unless crit.
- Options: A neutral `--w-fg` hero with a small tone dot (ToneCue, already in Metric); B tone-coloured hero (today, without ×).
- Why: ui-ux-pro-max "status colours: red only for action"; semantic colour.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### C-22 KpiTiles: remove a no-information delta, add sparklines at 4x2
- Where: KpiTiles_4x2/4x4 ("→ 0%" on every tile); `KpiTiles.tsx`.
- Now: each tile shows "→ 0%" top-right (zero change vs 5 min?), not labelled; the tiles have no chart at 4x2 and a flat chart at 4x4 with 90px gap above it.
- Suggest: show the delta only when |delta| >= 1% and label it ("vs 5 min") once in the header right slot; 4x2 tiles get a 24px Spark at their base; 4x4 hero px as C-01 so the grey gap closes.
- Why: ui-ux-pro-max "live/stale labelling" and unlabeled deltas are noise.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### C-23 Calendar 4x4: use the lower half
- Where: Calendar_4x4; `Calendar.tsx:46`.
- Now: month grid ends at 270px; 190px is empty and the "October 2026 · W41" caption floats at the bottom.
- Suggest: grid cells `h/8` (about 52px) so the month fills; the big "12" shrinks to 64px; caption joins "Monday" at top-left.
- Why: Waza sparse-frame check.
- Impact: low   Effort: S   Risk: layout-at-other-spans (gated)
- Kind: refinement   Prototype: yes

### C-24 Clock 4x4: big time uses the frame (direction)
- Where: Clock_4x4/4x2; `Clock.tsx`.
- Now: 80px time left-aligned; the right 40% of the frame is empty; seconds "26" is 14px.
- Suggest: fit the time to `0.2*w` px and centre it; seconds 0.35em in `--w-muted`; weekday/date below at 0.12*w. Optional second line with a 60-sample seconds bar (1px) as a quiet heartbeat.
- Options: A centre fit; B a flip-less analog ring behind the time at 6% opacity; C leave left-aligned but at 120px.
- Why: Waza hierarchy; the Clock is the most read-from-across-the-room widget.
- Impact: med   Effort: S   Risk: layout-at-other-spans (gated)
- Kind: direction   Prototype: yes

### C-25 BottleneckLens 4x4: the empty verdict history bar
- Where: BottleneckLens_4x4 (large empty band "VERDICT, LAST 5 MIN"), 2x1/2x2 hero 14px; `BottleneckLens.tsx:72`.
- Now: a 12px track with nothing in it and 170px of empty frame beneath; the 4x2 hero (60px) is bigger than at 4x4 relative to the frame; 2x2/2x1 verdict is 14px.
- Suggest: when history is empty show the `Empty` hint "Collecting verdicts" (11px faint) and drop the band; otherwise raise the band to 36px with 5-second cells coloured by verdict; 2x2 verdict 28px, 2x1 22px.
- Why: Waza empty states (say what is happening); hierarchy.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: no

## Cross-cutting (fix once in the kit)

- **`Metric` `px` auto-fit** (`core/primitives.tsx:63`): add a `fitTo` prop that derives px from the box (`min(w*k1, h*k2)`) so C-01/C-02/C-24 are one change; `fit-font.ts` already exists.
- **`Stat` / `StatGrid` (`primitives.tsx:671-690`)** as the single label+value style (C-09).
- **`ChartAxis` + `Spark` frame** with fixed gutter, label style and "now"/time-span labels (C-08); and `Spark` min height 56px at 2x2.
- **`ButtonTile`** (C-03) and **`ArtScrim`** (C-06) as kit primitives used by every button-style and art-backed widget.
- **`Ring` track token** (C-20) and `Empty` hint for "no data yet" charts (C-16, C-25).
- **Header at xs** in `Widget.tsx:118` to stop 1x1 truncation (C-05).
- **`roomy(w,h)` layout contract**: add a shared `RoomyStack` wrapper (hero / chart / stats with fixed ratios 0.28 / 0.44 / 0.28 of height) so the 13 roomy widgets and the ~10 above stop reinventing it.

Counts: 25 suggestions; high-impact 7 (C-01, C-02, C-03, C-04, C-06, C-07, C-13); direction 1 (C-24).
