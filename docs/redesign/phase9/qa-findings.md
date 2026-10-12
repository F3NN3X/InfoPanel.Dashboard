# Phase 9 QA findings (browser sweeps)

Source: `?widget-qa` overflow probe (`o` = overlapping text), 50 templates × spans
1×1 2×1 3×1 1×2 2×2 4×2 × cell 110/150 × skins default/instrument/tui/ink/android × variants.
Studio variant: clean under every skin. No error tiles anywhere.

## Overlaps (default variant)
| Widget | Spans | Skins | Notes |
|---|---|---|---|
| SystemStatus | 4×2 | all, 110 + 150 | 2 overlaps |
| Clock | 4×2 | default, tui, ink | 1 |
| SteamLibrary | 4×2 (110); 2×1, 2×2, 4×2 (150) | all | 1 each |
| CpuMonitor | 2×1 | 150, all but tui | 1 |
| SystemOverview | 4×2 (110 tui), 2×2 (150 instrument) | | 1 |
| FpsMonitor | 4×2 | tui | 2 |
| Vitals | 2×1, 3×1, 1×2, 2×2, 4×2 | tui | 8–9: tui box header collides with the cells |
| StorageHealth | 4×2 | tui | 17–25 |
| tui compact views | 1×1, 1×2 of ServiceHealth, ProcessList, CoreHeatmap, GpuMonitor, StorageHealth, NetworkThroughput, NetworkAdapters, Weather, NowPlaying, AudioMeter, Visualizer, FpsMonitor, SteamProfile; CoreHeatmap 2×1/2×2 | tui | the ┐title┌ header overlaps the compact label/value |

## Light theme
Reviewed 88 renders in `shots/light/matte-light/`. Also reviewed the 89 renders in `shots/light/theme/` (white card). 

| Widget | Surface | Span | Element | Problem |
|---|---|---|---|---|
| StatusTracker | matte-light | 4x2 | Reading cells in the three rows | Empty and low cells are near-invisible on the light card. Only the last cell of each row shows, so the strips read as blank. (also theme) |
| CoreHeatmap | matte-light | 4x2 | Dark-green cells (33, 39, 25, 26, 16, 18) | Black numerals on near-black green, well under 4.5:1. The dark tiles look like dark patches on a light card. (also theme) |
| CoreHeatmap | matte-light | 1x1 | Dot grid | The lowest-load dots are near-black green on light grey, so they read as dark spots. |
| OsdStrip | matte-light | 4x2 | Strip background and FPS / 1% LOW values | Mid-grey slab on a light card. Red values (78, 0) on that grey are about 2.5:1 and the grey labels are low contrast. (also theme) |
| WebPage | matte-light | 4x2 | Whole card and "Enter a URL in the inspector" | Dark grey gradient fills the card. The placeholder text and globe icon are barely visible against it. (also theme) |
| SteamGame | matte-light | 4x2 | "ARC Raiders" ghost title | Dark text on dark art, essentially invisible. (also theme) |
| GameSpotlight | matte-light | 4x2 | SESSION / PLAYTIME values | Dim grey text on dark art, near-illegible. The playtime value is also an unformatted float (263.3999...). (also theme) |
| KpiTiles | matte-light | 4x2 | Delta text ("-> 0%") | Pale grey on a light card, about 2.5:1. (also theme) |
| StorageHealth | matte-light | 4x2 | "read" / "write" legend | Pale green and lilac 10px text, about 2:1. (also theme) |
| DiskIO | matte-light | 4x2 | "R" / "W" letters in the throughput rows | Light mint and lilac on a light card, about 2:1. (also theme) |
| Calendar | matte-light | 4x2 | "Monday" heading and today's cell | Bright green text on a light card is about 2:1. White "12" on the green pill is about 2.2:1. (also theme) |
| Vitals | matte-light | 4x2 | GPU "90" and tile surface | Salmon-red on the darker grey tile is about 2.8:1. (also theme) |
| Thermals | matte-light | 4x2 | Threshold ticks on the bars | Pale amber ticks are almost invisible on the light track. (also theme) |
| MeterBridge | matte-light | 4x2 | Unlit LED segments | Very faint (probably intentional for unlit). Channels at -inf show no visible meter at all. (also theme) |
| GameSpotlight | theme | 4x2 | SESSION / PLAYTIME values | On the white-card theme the values are not visible at all (labels only), so the numbers vanish on the dark art. |

## Performance
24 widgets (incl. Visualizer, NowPlaying, MeterBridge, AudioMeter, WaveLink) at 2×2 in a 1920×550
viewport, 4 s rAF sample: fixture data 240 fps, worst frame 4.4 ms; live data 239 fps, worst frame
12.7 ms (budget 16.7 ms). Pass.

## Carried from the review ledger
- #40 SensorGroup: item labels from the sensor display name (`sensorLabel`), not the key's last segment.
- #16 overlaps above (SystemStatus, Clock, SteamLibrary, CpuMonitor) are the same rows.

## Sweep 2 (after consolidation; probe with `clipped`; 3984 renders: 50 templates × 6 spans + 16 legacy ids × 4 spans, × cell 110/150 × default/instrument/tui × default/studio)
Notation: `span@cell/skin/variant(d|s)`; `dx/dy` = px hidden. Line-clamped text is excluded (fixed in 6464236) — ignore rows whose element is `line-clamp-*`.

### F1 — core (tui skin), owner: `src/widgets/core/**`
- tui compact views 1×1/1×2: the header's right slot (`div.absolute.right-3 > …`) overlaps the compact label/value — AudioMeter, CoreHeatmap (also 2×1/2×2), FpsMonitor, GpuMonitor, NetworkAdapters, NetworkThroughput, NowPlaying, ProcessList, ServiceHealth, SteamProfile, StorageHealth, Visualizer, Weather.
- tui `div.overflow-hidden.whitespace-pre` (braille/text graph or text meter) wider than its box by 3–49px at 1×1, 2×1, 3×1, 1×2 (and 4×2 StorageHealth): CpuMonitor, GpuMonitor, FpsMonitor, PowerDraw, SystemStatus, Thermals, NetworkThroughput, MenuBar 2×1/2×2, StorageHealth 4×2. Size the text graph from the measured width (chars = floor(w / charW)).
- Vitals under tui (3×1, 1×2, 4×2; 2×1/2×2 at 150): unit/label spans overlap.

### F2 — groups A/B/E templates, owner: those `src/widgets/<Id>.tsx`
- SystemStatus 4×2 (all skins, 110+150): superscript unit (`span.ml-0.5.align-top`) overlaps.
- Clock 4×2 (default, tui): `span.mt-2.text-sm` overlaps.
- CpuMonitor 2×1@150 (default, instrument): `span.truncate.text-[10.5px]` overlaps.
- SystemOverview: 2×1@110 content clipped dy 19–21 (also `systemmodern` 2×1); 4×2@110 tui and 2×2@150 instrument overlaps in the detail line.
- KpiTiles 3×1, 4×2 (default/instrument): tiles clipped dy 5.
- Vitals 3×1, 1×2 (default/instrument): value clipped dx 8 / dy 14.
- ProcessList studio 1×2, 2×2, 4×2 @150: clipped dy 11–13.
- DiskIO studio 1×2 and tui 1×1/2×1: clipped dx 33–42.
- Forecast 1×2 (instrument, tui): dx 2–4. GpuRings 1×2 tui: dx 4 / dy 2.
- Weather 4×2 (all): dy 33–42; `weathermodern` 3×2/4×2/6×3: dy 9–33.
- NetworkAdapters 2×1@150: list dy 2; 1×2 tui line-clamp-3 (ignore).
- Bluetooth 2×1@150 and `bluetoothmodern` 3×2@110 / 2×1@150: grid dx 11–27.
- TextFile 2×1 (also `textfile` 2×1): `pre` clipped dy 13–14 — fit lines to height.
- #40 SensorGroup: item labels via `sensorLabel` (display names).

### F3 — groups C/D templates, owner: those `src/widgets/<Id>.tsx`
- NowPlaying 3×1 default and studio 1×1/1×2/2×2: content dx 96.
- SteamGame 3×1 default, studio 2×2: dx 96.
- GameSpotlight: 39 combos (3×1, 1×2, 4×2 default; studio 1×1/1×2/2×2): dx 11–75 / dy 3–79.
- MeterBridge 1×1: list dx 34–36. WaveLink 1×1/1×2: dx 27–29.
- PlaytimeShare 2×1@150: list dy 11–16. SteamProfile 4×2: list dy 4–5.
- SteamLibrary 4×2@110, 2×1/2×2/4×2@150: superscript unit overlaps.
- FramePacing 3×1 (and 2×1 tui): dy 6–8. `fpsmodern` 2×1@150: dy 8.

### Light theme — owners as above by widget (rows in the "Light theme" table)

## Sweep 3 (after round 2; 7968 renders: + skins ink/android/macos, + Other sensors; 0 error tiles) — 15 rows
- Clock: overlaps in 20 combos (1×1, 2×1, 3×1, 1×2, 4×2 @110 default…) — `span.mt-1.text-[11px]` (regression from the 4×2 fix).
- CoreHeatmap 1×1/2×1/1×2/2×2 tui, Visualizer 1×1/1×2 tui: header right slot (`div.absolute.right-3`) still overlaps.
- StorageHealth 4×2 tui: text graph rows overlap the stat labels.
- Vitals: tui overlaps (3×1, 1×2, 4×2 @110; 2×1, 3×1 @150) on the unit `span.ml-0.5.text-[0.5em]`; clipped dy 3 at 1×2 (all skins), 3×1 tui.
- GameSpotlight 3×1, 1×2, 4×2 (all skins): real clipping dx 6–14 / dy 3–11 outside the Ken Burns bleed.
- SystemOverview 2×1 @110 (and `systemmodern` 2×1): content clipped dy 19–21.
- Forecast 1×2 @110 (all skins): dx 12–14.
- Weather 4×2 @110 tui/android (and `weathermodern` 3×2/4×2): dy 3–9.
- GpuRings 1×2 tui/macos: dy 2–5. NetworkAdapters 2×1@150 android: dy 3. `audiomodern` 2×1@150 ink: dy 2.
- Light theme left: LedLadder/MeterBridge unlit segments too faint on light surfaces; Calendar "today" pill white text on a pale accent.
