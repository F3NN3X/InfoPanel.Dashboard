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
