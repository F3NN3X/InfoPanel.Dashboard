# Refinement audit ledger

The second design pass (November 2026), run with the Waza `ui` skill and ui-ux-pro-max against the locked direction: dark, dense, Geist, a white primary and one blue accent. Per-surface audits: [A](A.md) Studio, [B](B.md) Settings, Help and kiosk, [C](C.md) and [D](D.md) widgets. 94 suggestions; the user chose to build all of them.

Prototypes (W1–W8 and some A-/B- IDs) were built on throwaway `proto/<id>` branches to show before/after; a `group` names the prototype a row was merged into. Status: open, fixed, partial, wont_fix or no_change_needed, with the reason in the batch notes.

| ID | Batch | Group | Impact | Effort | Title | Status |
|---|---|---|---|---|---|---|
| A-01 | 5 |  | high | M | Screens cards show the screen, not an icon | fixed |
| A-02 | 5 |  | high | S | Collapse the repeated state pills | fixed |
| A-03 | 5 |  | med | S | Quick tips should not live on the canvas | fixed |
| A-04 | 5 |  | med | M | Contextual widget toolbar clips and floats away | fixed |
| A-05 | 5 |  | high | M | Fit the board to the stage and drop dead air | fixed |
| A-06 | 5 |  | high | M | Add panel: one filter row, one count, real previews | partial |
| A-07 | 5 |  | med | S | Theme header: Save as theme collides with the differences pill | fixed |
| A-08 | 5 |  | low | S | Inspector gutters: one right edge | fixed |
| A-09 | 5 |  | med | S | Alerts and Island: a real empty state | fixed |
| A-10 | 5 |  | med | S | Library: toast on the grid, truncated search, shelf of chips | fixed |
| A-11 | 5 |  | med | M | Data table: display-name column is a wall of inputs | partial |
| A-12 | 5 |  | med | S | Footer strip: three kinds of status in one line | fixed |
| A-13 | 5 |  | med | S | Rail active state and label size | fixed |
| A-14 | 5 |  | med | M | Segmented selected state | fixed |
| A-15 | 5 |  | med | M | Command palette: group, recent and key hints | fixed |
| A-16 | 5 |  | low | S | Layer rows: kind tag and drag handle noise | fixed |
| A-17 | 5 |  | low | S | Gauge cards: names clip and previews differ in scale | partial |
| A-18 | 5 |  | low | M | Replace hard-coded greys with tokens | partial |
| A-19 | 5 |  | med | M | Home: a screen detail that is quieter, and a hover on the card | fixed |
| A-20 | 5 |  | med | L | Direction: live canvas mini-map and page strip on Screens | fixed |
| B-01 | 0 |  | high | M | Status bar readouts truncate at 1920x1080, 1280x800 and 1024x600 (Confirmed bug: with the island gap on, need() compared all items against the whole bar instead of the wider half (prototype proto/B-01).) | fixed |
| B-02 | 3 | B-02 | high | M | The island is a fixed black pill that ignores the skin and the panel size (Default tint follows the skin as a new value; islands stored as black stay black.) | fixed |
| B-03 | 3 | B-02 | med | S | The island and the bar both show the time (and the same CPU/GPU) (Default tint follows the skin as a new value; islands stored as black stay black.) | fixed |
| B-04 | 3 |  | med | S | The outer frames touch the display edge (User: as suggested, plus a per-screen option to touch the edges as today.) | fixed |
| B-05 | 3 |  | med | M | The bar is 16% of a 1080p screen and 25% of a 480p one | fixed |
| B-06 | 3 |  | med | M | Tall cells pin their content to one edge | fixed |
| B-07 | 3 |  | med | M | At 800x480 labels truncate to meaningless stubs | fixed |
| B-08 | 4 |  | high | S | Settings pages jump: the title moves 130px between pages | fixed |
| B-09 | 4 | B-10 | high | S | Group headings come in two styles (Reopens the first audit's recorded 'two Settings row styles'; the user chose to build it from the prototype.) | fixed |
| B-10 | 4 | B-10 | high | M | Dashboard and Studio pages should use the card layout (Reopens the first audit's recorded 'two Settings row styles'; the user chose to build it from the prototype.) | fixed |
| B-11 | 4 |  | med | S | Twelve `(i)` icons where General shows its hint as text | fixed |
| B-12 | 4 |  | med | S | "Releases on GitHub" reads like a broken link in the nav | fixed |
| B-13 | 4 |  | med | S | Connections: status as plain text, a quiet Save, a "None" password | fixed |
| B-14 | 4 |  | low | S | Diagnostics: five equal buttons and an orphaned note | fixed |
| B-15 | 4 |  | low | S | Server header repeats the tiles | partial |
| B-16 | 4 |  | med | S | The restart bar wraps at 720 and is shouting | fixed |
| B-17 | 4 |  | med | S | The sidebar takes a third of a 720px window | fixed |
| B-18 | 4 |  | med | S | Help search shows two fields | fixed |
| B-19 | 4 |  | med | M | Help home repeats the sidebar | fixed |
| B-20 | 4 |  | med | S | Help articles run about 95 characters per line | fixed |
| B-21 | 4 |  | low | S | Search snippets are flattened table text | fixed |
| B-22 | 4 |  | low | S | Logs: INFO is accent blue | fixed |
| B-23 | 4 |  | low | S | Settings text sizes sit off the shared scale | fixed |
| B-24 | 4 |  | med | M | Help home as task paths | fixed |
| B-25 | 3 |  | med | L | Island that follows the skin (User: optional, island either part of the skin or an overlay. Existing islands stay overlay.) | fixed |
| C-01 | 1 | W1 | high | M | Hero number scales with the box in 4x4 | fixed |
| C-02 | 1 | W1 | high | M | 2x2 frames: lift the hero to the optical centre, cut the empty top | partial |
| C-03 | 2a | W4 | high | S | One button-tile primitive that scales (AudioButton, ObsButton) | fixed |
| C-04 | 2a |  | high | M | Fill the large span with the data that was dropped (NetworkThroughput, DiskIO 4x2, NetworkAdapters) | partial |
| C-05 | 2a |  | med | S | Hide the title at 1x1 (or show icon only) instead of truncating | fixed |
| C-06 | 2a | W5 | high | M | Legibility scrim on art-backed widgets at small spans | fixed |
| C-07 | 2a |  | high | M | NowPlaying 4x4: cover art as the hero | fixed |
| C-08 | 1 |  | med | M | Shared axis and stat-label grammar for charts | partial |
| C-09 | 1 |  | med | M | Per-stat label style unified (mono uppercase micro vs sentence-case) | partial |
| C-10 | 2a |  | med | S | DriveSpace: one bar colour logic and use the 4x4 height | partial |
| C-11 | 2a |  | med | M | Fans 4x4: use the tall cards | fixed |
| C-12 | 2a |  | med | S | MeterBridge: stop truncating channel names in 4x4 and 4x2 | partial |
| C-13 | 2a |  | high | M | AudioMeter / AudioFader: use the width and height at 4x2 and 4x4 | fixed |
| C-14 | 2a |  | med | S | Redundant header chip and sub-title (Bluetooth, Notifications) | fixed |
| C-15 | 2a |  | med | S | CoreHeatmap: label contrast and left-aligned grid | fixed |
| C-16 | 2a |  | med | M | DayPlanner: no calendar at 2x2, clipped hour labels, weather fills the plot | fixed |
| C-17 | 1 | W2 | med | M | GpuRings 4x4 and MemoryUsage 4x4: ring scales and the legend sits beside it | fixed |
| C-18 | 2a |  | med | M | Achievements 4x4 and 4x2: compose around the ring | partial |
| C-19 | 2a |  | med | S | Departures 4x4/2x2: row pitch and truncation | partial |
| C-20 | 1 | W2 | low | S | CustomGauge / ring tracks: stronger empty track and a label | fixed |
| C-21 | 2a |  | med | S | FpsMonitor hero: the red "×78" reads as an error | fixed |
| C-22 | 2a |  | med | S | KpiTiles: remove a no-information delta, add sparklines at 4x2 | fixed |
| C-23 | 2a |  | low | S | Calendar 4x4: use the lower half | fixed |
| C-24 | 2a |  | med | S | Clock 4x4: big time uses the frame | fixed |
| C-25 | 2a |  | med | S | BottleneckLens 4x4: the empty verdict history bar | fixed |
| D-01 | 1 | W1 | high | M | Grow body type with the span (a shared scale variable) | partial |
| D-02 | 1 | W1 | high | M | Hero value scales with the box on 2x2 and fills the dead top half | partial |
| D-03 | 1 | W6 | high | M | One "rows fill the height" rule for list widgets at 4x4 | fixed |
| D-04 | 2b |  | high | M | 4x4 gets a summary hero on top of the detail (ServiceHealth, StatusTracker, Thermals, SteamNews) | fixed |
| D-05 | 2b | W7 | high | M | Bar-type widgets in square frames: stack instead of a tiny strip | fixed |
| D-06 | 1 | W3 | high | M | Area sparks: scale, gridlines and a height cap | fixed |
| D-07 | 1 |  | med | S | Sparkline sits behind the value text in Vitals 4x2 (and compact Vitals tiles) | partial |
| D-08 | 1 | W2 | high | M | A single ring spec for every gauge | fixed |
| D-09 | 2b | W8 | high | M | Colour means status OR series, never both (SystemOverview) | fixed |
| D-10 | 2b |  | med | S | Empty/idle states: use the kit `Empty` everywhere, with an action line | fixed |
| D-11 | 2b |  | med | S | Truncated and duplicate sensor names in Session Stats and ThresholdTimeline | fixed |
| D-12 | 2b |  | med | S | SessionStats 4x2 table: header row and columns at 9-10 px | fixed |
| D-13 | 1 |  | med | S | One unit style (size, gap, colour) for hero numbers | fixed |
| D-14 | 2a | W5 | med | S | Text over art needs a scrim (SteamGame) | fixed |
| D-15 | 2b |  | low | S | StreamChat clips a message mid-line at the top | partial |
| D-16 | 2b |  | med | S | Timer idle state: show the time, not three small chips in blank space | fixed |
| D-17 | 2b |  | med | M | Weather 4x4 and 2x2 now-block is small beside the 4x4 forecast | fixed |
| D-18 | 2b |  | med | M | StatusTracker and ThresholdTimeline lanes carry little when history is short | fixed |
| D-19 | 2b |  | low | S | StreamControl 4x2 chart tile is unlabelled | fixed |
| D-20 | 2b |  | low | S | WaveLink meters: 4 px stubs and "-∞" | fixed |
| D-21 | 2b |  | med | M | Mixer family: three looks for the same job | fixed |
| D-22 | 2b |  | med | M | StreamDeck 2x2: 15 blank 30 px buttons | fixed |
| D-23 | 2b |  | low | S | SteamProfile 2x2: no avatar, hero is a 15 px name | fixed |
| D-24 | 2b |  | low | S | Uptime: days are accent, other units white | fixed |

## Closing notes

- A-06: Live previews in tiles: won't fix, the hover card already renders the widget live; the palette-group chips come back in batch 11.
- C-04: Per-adapter rx/tx: won't fix, the plugin sends no such keys. The trend at 2x2 and 4x2 follows the user's `sparkline` setting by design.
- C-18: The unlock list: won't fix, the plugin reports only the latest unlock.
- C-19: "Updated" stays in the footer: won't fix, the `Widget` header has no right slot and adding one isn't worth it.
- D-21: Mixer family: fixed in batch 8. The rows (batch 2b) stay the default; the user asked for audiocn views on all three mixers, so Strips and LCD views (vertical or horizontal) came with them, and read-only faders draw no knob. See batch-8-notes.md.
