# Audit D: 34 widgets (OsdStrip .. WebPage), every span and view in refine/ and refine-small/

Evidence: I opened every screenshot in scope (contact sheets of each widget's full set). Source paths and lines are only for naming where a fix goes. Fixture data is mostly flat (constant 63%, one-sample timelines, silent audio), so a few "empty" charts below are partly fixture; I say so where it matters.

## 1. Critique

Keep:
- The shared header (icon + uppercase label), tabular numerals, the single teal accent, and the semantic red/amber/green used sparingly (Vitals GPU 90% in red, Thermals warn ticks) all read as one product.
- Widgets that scale their hero with the box are the strongest at a distance: Uptime 4x4/4x2, StreamMixer 4x4, StorageHealth 4x4, Weather glance, StatusBar strips. ProcessList 4x4 and VolumeMixer 4x4 are dense but aligned (names left, numbers right).
- The 4x4 roomy layouts that add a second tier (PlaytimeShare stacked bar + legend, StorageHealth stat grid, Vitals tiles) are the right idea.

What holds the surface back:
1. **Type does not grow with the span.** A 464 px card shows the same 12-13 px rows as a 228 px card (ProcessList, ServiceHealth, SensorGroup, TextFile, SteamFriends, SteamLibrary, SteamNews). Across a room, a 4x4 is a small-print list inside a big frame.
2. **Dead space is unmanaged.** On 2x2 the hero sits at the bottom with the top 55% empty (about 11 widgets). On 4x4 a content block sits in the top 35-60% and the rest is blank (SensorGroup, ServiceHealth, StatusTracker, SteamLibrary, Thermals, ThresholdTimeline, Timer, StreamDeck, OsdStrip, PlaytimeShare, TextFile, SteamNews, VolumeMixer). Bar-type widgets (OsdStrip, StatusBar) render as a tiny strip in a square.
3. **Charts and gauges are not one system.** Ring thickness differs (StorageHealth 2x2 about 18 px, VolumeMixer/StreamMixer about 12 px, SystemOverview/RadialClockStack different again); area sparks have no scale or gridline and stretch to 300 px tall for one flat value (PowerDraw, SystemStatus 4x4); unit glyphs are different sizes ("313 games", "8online", "63 %", "7.4h"); ring colour means series in some widgets and status in others.

## 2. Suggestions (ranked impact/effort)

### D-01 Grow body type with the span (a shared scale variable)
- Where: ProcessList_4x4, ServiceHealth_4x4, SensorGroup_4x4, TextFile_4x4, SteamFriends_4x4, SteamLibrary_4x4, SteamNews_4x4; `src/widgets/core/layout.ts:85` (`roomy`), `src/widgets/core/Widget.tsx`
- Now: row text, labels and values are 11-13 px at both 228 px and 464 px; TextFile at 4x4 is the same mono size as at 2x2 with 60% of the card empty.
- Suggest: in `Widget.tsx`, when `roomy(w,h)` set `--w-scale: 1.25` on the root (else 1) and let `text-caption`/`text-body`/`text-title` in the widget scope resolve to `calc(var(--w-type) * var(--w-scale))`. Row heights and `rowsFor(h,count,min,max)` max values scale by the same factor. TextFile uses `clamp(12px, w/26, 22px)` via `fit-font.ts`. Keep the 11px floor at small spans unchanged.
- Why: Waza data-viz "number density: crowding without alignment is the problem", not size; ui-ux-pro-max readability (large-display legibility); the brief's 4x4-only roomy rule means smaller spans are untouched.
- Impact: high   Effort: M   Risk: layout-at-other-spans (guarded by roomy, so 4x4 only)
- Kind: refinement   Prototype: yes

### D-02 Hero value scales with the box on 2x2 and fills the dead top half
- Where: SensorGroup_2x2, ServiceHealth_2x2, PlaytimeShare_2x2, PowerDraw_2x2, Thermals_2x2, SteamLibrary_2x2, SteamFriends_2x2, StatusTracker_2x2, Uptime_2x2, StreamChat_2x2, Weather_2x2; `src/widgets/core/primitives.tsx:63` (`Metric`)
- Now: hero is about 36-44 px and bottom-anchored; the top half of the 228 px card is blank. Weather 2x2 drops the icon entirely.
- Suggest: `Metric scale="lg"` on square shapes uses `font-size: clamp(44px, 26cqmin, 80px)`, the unit at 0.42em, and the block is `justify-center` (not bottom-anchored) when there is no chart below. Where a chart exists (PowerDraw, SystemStatus, Thermals) keep bottom anchoring but give the hero 56 px. Weather 2x2: add the 40 px condition icon left of the temperature.
- Why: Waza "main question answerable at a glance"; one hero per card at room distance.
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### D-03 One "rows fill the height" rule for list widgets at 4x4
- Where: SensorGroup_4x4 (5 rows end at 70%), ServiceHealth_4x4 (10 rows in 2 columns fill the top 38%), StatusTracker_4x4, Thermals_4x4, VolumeMixer_4x4, SteamNews_4x4, Timer_4x4; `core/layout.ts:104` (`rowsFor`), `:101` (`fitRows`)
- Now: row pitch is the 4x2 pitch (26-36 px), so doubling the height only adds blank space.
- Suggest: in roomy mode `rowsFor` lets rowH grow up to 1.6x min (cap 52 px) and distributes the remainder with `justify-content: space-evenly`; if rows still do not fill, add the detail tier (D-04). SensorGroup 4x4 should switch to the 4x2 tile grid (as in SensorGroup_4x2) with 40 px hero values, three columns, because five bars-with-labels is the weakest 4x4 in scope.
- Why: Waza "whitespace: generous column spacing, not generous row height" (so grow the columns/tier, not blank space); ui-ux-pro-max ux "empty states: Don't blank screens".
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### D-04 4x4 gets a summary hero on top of the detail (ServiceHealth, StatusTracker, Thermals, SteamNews)
- Where: ServiceHealth_4x4 (the "9/10" that is the 2x2 hero vanishes at 4x4 and becomes small "9/10" top right), StatusTracker_4x4 ("4/5" also gone), Thermals_4x4 (hottest 66 C gone)
- Now: scaling up loses the answer. At 2x2 you read "9/10"; at 4x4 you must count dots.
- Suggest: roomy layout keeps the hero (48 px, same unit style) in a top band, with the existing list underneath at the larger pitch from D-03. Thermals: hero "66 °C GPU memory" above the bars. ServiceHealth: hero plus a single column of 10 rows at 30 px.
- Why: Waza "status summary at top, detail below"; ui-ux-pro-max (status colours, dense but scannable).
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: direction (a "hero + detail" template for every 4x4)   Prototype: yes

### D-05 Bar-type widgets in square frames: stack instead of a tiny strip
- Where: StatusBar_4x4, StatusBar_4x2 (11 px items floating in the middle of a dark box), OsdStrip_4x4 and OsdStrip_4x2 (4 cells about 80 px tall centred in 464 px); `src/widgets/StatusBar/`, `src/widgets/OsdStrip.tsx`
- Now: at 1400x110 the StatusBar views are excellent (26 px icons, 22 px text); at 464x464 the same single row is 11 px and unreadable.
- Suggest: when `h/w > 0.5` (not a strip) lay items out as a 2-column tile grid, each tile with label (11 px) over value (28 px, the OsdStrip cell style), so the area is used and the numbers are 2.5x larger. OsdStrip 4x4: 2x2 cells at 40 px values; 2x2 shows the hero FPS only, which is correct but should use D-02 scale (78 is 36 px in 228 px).
- Why: Waza data-viz density; across-the-room reading.
- Impact: high   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### D-06 Area sparks: scale, gridlines and a height cap
- Where: PowerDraw_4x4 (a 300 px tall flat green block), SystemStatus_4x4 and 4x2 (two huge flat slabs), Vitals tiles, StreamControl; `core/primitives.tsx:567` (`Spark`), `:406` (`sparkY`)
- Now: a single flat value renders as a giant gradient rectangle with no axis, so it reads as a progress bar and carries no information. Fixture is flat, but real data with a narrow range will look equally bare.
- Suggest: (a) in roomy mode draw 3 hairlines at 25/50/75% using `--w-faint` at 12% opacity, with right-aligned min/max labels in `text-micro`; (b) `min-h-0 flex-1` capped at `max-height: 55%` and give the remaining space to a stat row (PowerDraw: Peak / Avg / Min; SystemStatus: per-metric peak); (c) when the series is constant, the y-range expands to `value +/- 10%` so the line sits mid-chart instead of at the top edge. Keep the end dot already present on PowerDraw.
- Why: ui-ux-pro-max chart domain: axis labels and gridlines needed for any non-sparkline chart; Waza data-viz "axis label size and colour, grid weight and opacity".
- Impact: high   Effort: M   Risk: none
- Kind: refinement   Prototype: yes

### D-07 Sparkline sits behind the value text in Vitals 4x2 (and compact Vitals tiles)
- Where: Vitals_4x2 (the line crosses "54%", "90%", "66%", "920"); `src/widgets/Vitals.tsx`
- Now: label at top, value at bottom-left, spark filling the tile, so the line and its gradient pass through the digits.
- Suggest: in tiles shorter than 110 px reserve the bottom 34% for the spark (`h-[34%]`, aligned right of the value or under it) and keep the value in the upper two thirds. Or keep the overlay but add a `--w-surface` text plate (`text-shadow: 0 0 6px var(--w-surface)`). Option A: split the tile (cleanest). B: text plate (least change). C: value right, spark left.
- Why: Waza "if a problem is visible in a screenshot, it is real"; contrast of overlaid text.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-08 A single ring spec for every gauge
- Where: StorageHealth_2x2 (thick ring, tiny "97%" inside, a visible seam at 12 o'clock at 97%), StreamMixer_2x2, VolumeMixer_2x2, RadialClockStack_4x4, SystemOverview_2x2/1x1; `core/primitives.tsx:252` (`Ring`), `:307` (`RingStack`)
- Now: thickness ranges from about 8% to 14% of the diameter between widgets; centre text is 14-16 px in a 180 px ring (under 10% of the diameter) in StorageHealth/StreamMixer/VolumeMixer; the ring ends in a round cap that creates a notch at 97%.
- Suggest: `Ring` thickness defaults to `0.075 * diameter` (min 6 px) when `thickness` is unset; centre text is `0.24 * diameter` for the value and `0.11 * diameter` for the unit; cap the arc at `value` minus the cap radius to remove the seam. RingStack gap 0.02 * diameter.
- Why: Waza data-viz "consistent chart styles"; ui-ux-pro-max chart/gauge rows (label the value in the centre, high contrast).
- Impact: high   Effort: M   Risk: none
- Kind: refinement   Prototype: yes

### D-09 Colour means status OR series, never both (SystemOverview)
- Where: SystemOverview_2x2, 1x1, 2x1 (CPU blue, GPU 90% amber, RAM amber), SystemOverview_view-graphs (GPU purple), view-gauges; `src/widgets/SystemOverviewViews.tsx`
- Now: GPU is purple in graph and in the 2x1 text label but amber in the rings and gauges; GPU and RAM both read amber so the concentric rings cannot be told apart; centre label "CPU 63" is 10 px.
- Suggest: series colour (CPU blue, GPU purple, RAM teal) for the ring stroke in every view; threshold state shows only as the `ToneCue` dot and the value colour. In the 2x2 ring stack, centre shows only the number at 28 px and a 3-row legend appears from 2x2 up (as the 2x1 already does).
- Why: Waza "status colours are semantic"; ui-ux-pro-max colour (do not rely on colour alone, consistent encoding).
- Impact: high   Effort: M   Risk: stored-settings (if series hues are configurable, keep them)
- Kind: refinement   Prototype: yes

### D-10 Empty/idle states: use the kit `Empty` everywhere, with an action line
- Where: SensorValue_* (bare "No sensor" text at 12 px in all spans), WebPage_4x4/4x2 ("Enter a URL in the inspector", fine but 12 px), Visualizer_4x4/4x2 (blank card with a dashed baseline and "-8.7 dB"), ThresholdTimeline lanes; `src/widgets/SensorValue.tsx:178`, `core/primitives.tsx:704` (`Empty`)
- Now: three different empty looks. Visualizer at 4x2 and 4x4 shows nothing but a faint dashed line, while 2x2/1x1 show full bars, so it looks broken.
- Suggest: `SensorValue` off-canvas: `<Empty icon="sensors_off" label="No sensor"/>` (icon 28 px, label 13 px); on the kiosk the same. Visualizer: when level is below the floor, draw bars at a 6% idle height in `--w-faint` plus "No audio" `text-micro`, at every span. WebPage keeps its globe icon but scales with D-01.
- Why: ui-ux-pro-max ux "Empty States: show helpful message; Don't blank empty screens"; ui-ux-pro-max checklist: live/stale labelling.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-11 Truncated and duplicate sensor names in Session Stats and ThresholdTimeline
- Where: SessionStats_2x2 ("AMD RYZEN 9 9950X3D CPU T..." header), SessionStats_4x2 (two rows both "AMD Ryzen 9 9950X3...", two "NVIDIA GeForce RTX 5..."), ThresholdTimeline_2x2/2x1/4x4/4x2 (same); `core/data.ts` (`sensorLabel`/`pretty`)
- Now: the label column truncates at about 110 px so the distinguishing word (which metric: load vs temperature) is cut off; two rows are indistinguishable.
- Suggest: add a `shortLabel(sensor)` that drops vendor prefixes (AMD, NVIDIA, GeForce, Intel(R)) and puts the metric first: "CPU load · Ryzen 9 9950X3D", "GPU temp · RTX 5090". Label column 38% of the width with `text-caption`, the model in `--w-faint` as a second line at 4x4. 2x2 header uses the metric only ("CPU load").
- Why: Waza data-viz "left-align labels"; unique row identity.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-12 SessionStats 4x2 table: header row and columns at 9-10 px
- Where: SessionStats_4x2 (MIN/AVG/MAX headers, "°C" units tiny), SessionStats_4x4 (range blocks with 10 px min/avg/max captions)
- Now: sub-11 px text and 5 columns of equal weight; the "now" value is the hero in 4x4 but all three are equal in the 4x2 table.
- Suggest: headers at `text-micro` (11 px) in `--w-muted`, AVG column in `--w-fg` weight 600 with MIN/MAX at `--w-muted`; 16 px column gap; right-aligned numerals; unit sub-glyph at 0.7em.
- Why: Waza data-viz number-dense rules (right-align, 16 px between columns); the brief's 11 px floor.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### D-13 One unit style (size, gap, colour) for hero numbers
- Where: SteamLibrary_2x2 ("313games" the unit about 0.45em but touching), SteamFriends_2x2 ("8online" the unit nearly as large as the hero), PlaytimeShare ("7.4h"), SensorGroup ("63 %"), Thermals ("66 °C"), Vitals ("920KB/s"); `core/primitives.tsx:63` (`Metric`), `:728` (`Num`)
- Now: four different unit treatments; word units are at 0.5-0.6em next to a large numeral and read as the same weight.
- Suggest: unit span = `font-size: 0.4em; font-weight: 500; color: var(--w-muted); margin-left: 0.18em; letter-spacing: 0` for symbols (%, °C, h, W) and words alike; words ("games", "online") move under the hero as a caption instead of inline.
- Why: Waza typography hierarchy (hero vs supporting).
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-14 Text over art needs a scrim (SteamGame)
- Where: SteamGame_4x4, SteamGame_4x2, SteamGame_2x2, SteamGame_2x1; `src/widgets/SteamGame.tsx`
- Now: the red/yellow/green art stripes run through "CURRENTLY PLAYING", "Achievements" and "00:07 session · 263.4 h".
- Suggest: add a 2-stop scrim, `linear-gradient(to bottom, rgb(0 0 0 / .55) 0, transparent 28%, transparent 55%, rgb(0 0 0 / .75) 100%)`, over the art in all spans. Title (28 px at 4x4) is already fine; make the "Playtime / Avg session" values 20 px.
- Why: Waza contrast and readability over imagery.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-15 StreamChat clips a message mid-line at the top
- Where: StreamChat_4x2 (the first row "yt_marta hi from youtube!" cut in half under the header); `src/widgets/StreamChat/`
- Now: the list is bottom-anchored with a hard overflow clip, so the top row is sliced.
- Suggest: `mask-image: linear-gradient(to bottom, transparent 0, #000 18px)` on the scroll area so the top row fades, and count whole rows (`fitRows`) so the cut lands on a row boundary. Same change in 4x4.
- Why: Waza "if visible in a screenshot it is real"; polish.
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-16 Timer idle state: show the time, not three small chips in blank space
- Where: Timer_2x2, Timer_4x2, Timer_2x1, Timer_1x1; `src/widgets/Timer.tsx`
- Now: the idle card is a header plus three 40 px chips floating mid-card; the 4x4 is good (big "5 min / ends 12:05" cards). A person at a distance sees nothing.
- Suggest: when idle at 2x2 and 4x2, show the last/selected duration as a hero "05:00" (`--w-muted`, 48 px) above the chips; the chips stay 40 px (decision kept). On 1x1 keep chips only. Options: A hero "05:00" muted; B hero "Start" label; C no change plus a thin outline ring.
- Why: Waza hierarchy; ui-ux-pro-max empty-state guidance.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### D-17 Weather 4x4 and 2x2 now-block is small beside the 4x4 forecast
- Where: Weather_4x4 (5° at about 44 px, icon 52 px, then a 100 px gap before the forecast row), Weather_view-glance (the right proportions), Weather_2x2; `src/widgets/Weather.tsx`, `WeatherViews.tsx`
- Now: the glance view shows a 110 px icon and a 64 px temperature, but the 4x4 default shows the same block at half that and leaves a blank band.
- Suggest: in roomy mode use the glance proportions for the now block (icon 96 px, temperature 88 px, condition 16 px) and move wind/humidity into a two-cell row under it; forecast row stays at the bottom. Condition tint stays untouched.
- Why: Waza hierarchy; the brief's Weather tint decision is respected.
- Impact: med   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: yes

### D-18 StatusTracker and ThresholdTimeline lanes carry little when history is short
- Where: StatusTracker_4x4 (60 hairline ticks, the legend chips far taller than the content), ThresholdTimeline_4x4/4x2 (dark lane block with a single 2 px marker at the right edge)
- Now: a lane with one sample is an empty dark rectangle; the 4 legend chips in StatusTracker are 24 px tall and the largest element on the card.
- Suggest: until at least 8 samples exist, draw the lane with a 6 px tick per sample and a "collecting · 1 / 60" `text-micro` in the lane; the lane fills the full lane height with the tone colour at 85% (not a thin edge marker). Legend chips become 11 px text with a 6 px dot (no pill border), one row, pinned to the bottom.
- Why: ui-ux-pro-max checklist (live/stale labelling); Waza data-viz legend rules.
- Impact: med   Effort: M   Risk: none
- Kind: refinement   Prototype: no

### D-19 StreamControl 4x2 chart tile is unlabelled
- Where: StreamControl_4x2 (a block of three flat bars and one tall green block under "1:26:36"); `src/widgets/StreamControl/`
- Now: the viewer history is drawn without a label or scale, in a different style from the Spark in 2x2/2x1.
- Suggest: use `Spark` there (same area style as 2x2), label "Viewers" with the current count at the right in `text-micro`.
- Why: Waza data-viz chart consistency.
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### D-20 WaveLink meters: 4 px stubs and "-∞"
- Where: WaveLink_2x2, 2x1, 1x1 (two 4 px bars with "-∞"), WaveLink_4x4 (meter bars 6 px in a 320 px column, scale labels 11 px faint); `src/widgets/WaveLink/`
- Now: the level meters are barely visible, and "-∞" is cryptic. 1x1 shows "G..." for a name.
- Suggest: meter bar width 10 px (4x4: 14 px) with a `--w-faint` 12% track so silence still reads as a meter; replace "-∞" with "silent" at 2x2; 1x1 shows the first name only at 2 lines instead of truncating with an ellipsis; dB scale labels in `--w-muted`.
- Why: Waza chart consistency; ui-ux-pro-max a11y (labels, not glyphs).
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### D-21 Mixer family: three looks for the same job
- Where: StreamMixer_4x4 (LED ladders), VolumeMixer_4x4 (slider with a white knob), WaveLink_4x4 (meters), plus ring 2x2 in StreamMixer/VolumeMixer
- Now: three different level representations, and the same fader value uses a different position (value right in StreamMixer, 100 at the far right in VolumeMixer with a knob that overlaps the value).
- Suggest: share one row primitive: name left (14 px), bar (LED ladder in StreamMixer, 8 px solid bar elsewhere, the same track height), value right at 16 px tabular. Drop the white knob in read-only kiosk mode (the knob suggests it is draggable).
- Why: Waza consistency; kiosk read-only affordances.
- Impact: med   Effort: M   Risk: layout-at-other-spans
- Kind: direction (a shared "channel row" primitive for the audio widgets)   Prototype: no

### D-22 StreamDeck 2x2: 15 blank 30 px buttons
- Where: StreamDeck_2x2, StreamDeck_4x2 (grey outlined squares with no labels), StreamDeck_1x1 ("5×3" only)
- Now: the key grid shows no labels and 30 px targets, so it is neither readable nor touchable; 4x4 is good.
- Suggest: when the cell is under 44 px, show a 3-column page (9 keys, 56 px cells) with the 11 px label under the icon, and keep the page dots; 1x1/2x1 stay as they are.
- Why: ui-ux-pro-max ux touch target 44 px; Waza hierarchy.
- Impact: med   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: no

### D-23 SteamProfile 2x2: no avatar, hero is a 15 px name
- Where: SteamProfile_2x2, 1x1, 2x1 (bottom-anchored "Player One" 15 px); 4x2 and 4x4 show the avatar tile
- Now: the card's identity element (avatar) vanishes at the small spans and the name is the same size as the header label.
- Suggest: 2x2: 56 px avatar top-left with the status dot, name 22 px, subtitle "ARC Raiders · Lv 29" 12 px; 2x1: 40 px avatar left of the name.
- Why: Waza hierarchy; recognisable at a distance.
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### D-24 Uptime: days are accent, other units white
- Where: Uptime_4x4, Uptime_4x2 ("05" in teal, "07 35 38" in white)
- Now: the accent on the first unit implies a status that is not there.
- Suggest: all four numerals in `--w-fg`; only the label row (DAYS/HOURS) in `--w-muted`, or if emphasis is wanted dim the minutes and seconds to `--w-muted` so the days lead. Taste call. Options: A all white; B days white, rest muted; C keep the accent.
- Why: Waza "one accent, semantic status colours".
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

## 3. Cross-cutting

- `--w-scale` in `Widget.tsx` plus `roomy()` (D-01) fixes the small-print 4x4 problem in about 15 widgets at once.
- `Metric`/`Num` (`primitives.tsx:63,728`): one hero size ramp and one unit style (D-02, D-13) fixes 2x2 dead space across the family.
- `rowsFor`/`fitRows` (`layout.ts:101-112`): growth cap plus even distribution, and a standard "hero band + list" roomy template (D-03, D-04).
- `Ring`/`RingStack`: thickness and centre text as ratios of the diameter (D-08); series colour vs status colour rule (D-09).
- `Spark`: gridlines, range expansion, max height (D-06) and a text-safe zone for tiles (D-07).
- `Empty` primitive for every empty or idle frame (D-10, D-18); a shared channel-row primitive for the audio widgets (D-21).
- Sensor label shortening in `core/data.ts` (D-11) benefits SessionStats, ThresholdTimeline, SensorGroup and SensorValue.
