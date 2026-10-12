# Audit: reuse and unification

Scope: 44 widget files, the shared kit, 14 skins, 24 surfaces and 2 variants. Goal: reuse as much as possible so the app implementation doesn't duplicate code.

## Done in this pass
| Finding | Was | Now |
|---|---|---|
| The 1,700-line `kit.jsx` mixed every concern | one file | split into `core/data · layout · theme · primitives · views · Widget`, with `kit.jsx` kept as the barrel (no import changes in widgets) |
| CPU/GPU slug detection copy-pasted in 13 widgets | `detect(d, /…_cpu_total$/)[0]` | `hw(d).cpu / .gpu / .disks / .adapters` |
| 3 local "skin-aware numeral" helpers (SystemOverview, FramePacing, PlaytimeShare) and inline Archivo styles | local `Num` / `Big` | `<Num>` primitive and `numFont(sk)` |
| Status pills drawn by hand in 4 places (ServiceHealth, StatusTracker legend, DriveSpace badge, …) | inline spans | `<Pill state="ok\|warn\|crit\|off">` |
| Two copies of the weather icon mapping (Weather, Forecast) | local `ICON` | `weatherIcon()` |
| Tab toggle in ProcessList | inline buttons | `<Segmented>` |
| Ken Burns + logo fallback lived inside GameSpotlight | local | `<KenBurns>` and `<Logo>` primitives (reusable by SteamGame, NowPlaying backdrop) |
| Two copies of the visualiser band maths (Visualizer, MiniViz) | duplicated | `stepBands()` engine shared by both |
| Hard-coded instrument colours in sampler widgets | `#20252D`, `#3FC4D0`, Archivo… | `rgba(255,255,255,.07)` tracks; `hue(deg)` accent-derived series; `STATE` semantic colours; skin numerals |
| A string `style` prop could crash the shell | `{...'pips'}` spread | `shell()` only forwards object styles; the Achievements option was renamed to `display` |
| A canvas re-mounted every data tick (NowPlaying) | `<Viz/>` defined in render | called as a function; the canvas is stable |

## Shared patterns every widget already uses
- **Shell:** `<Widget {...shell(p)}>` handles measurement, skin context, surface, header and view selection.
- **Descriptors:** `compact` and `studio` are plain objects, so a widget never re-implements its tile, strip, column or Studio layouts. 36 of 44 widgets supply `compact`; 28 supply `studio`. The rest either have their own layout for every shape or fall back to `compact`.
- **Values:** `get / num / fmt / fmtRate / fmtMB / fmtGB / rows`.
- **Graphs:** `Spark` alone covers area, line, step, bars, dots and braille, eased by `useHistory`.
- **Meters:** `Bar` alone covers bar, pill, segments, blocks, hair, wave and square.
- **Colour:** `tone(v, warn, crit)`, then `TONES[t]` (accent for ok). Use `STATE` when green must stay green (status). Use `heat(v, ramp)` and `rampColor` for heatmaps.

## Remaining consolidation (recommended while porting)
| Pattern | Where | Proposal |
|---|---|---|
| LED ladders | `AudioMeter` (`Leds`, `%`), `MeterBridge` (`Ladder`, dB), AudioMeter mirror | One `<LedLadder value% n vertical zones={[warn, clip]} hold%>`; MeterBridge converts dB to % with its `pos()` |
| Concentric rings | `SystemOverview` (tile), `GpuRings`, `AudioMeter` ring | `<RingStack rings={[{ v, color }]} thickness gap>{centre}</RingStack>` |
| Legend rows (swatch · label · value) | GpuRings, PlaytimeShare, StorageHealth (read/write) | `<LegendRow color label value>` |
| Row lists sized to height | ProcessList, Thermals, DriveSpace, VolumeMixer, NetworkAdapters, SensorGroup, ServiceHealth | `useFitRows(h, rowH, gap)` → n; the formula `floor((h + gap) / (rowH + gap))` is currently inline in each |
| Stat grids | CpuMonitor, GpuMonitor, StorageHealth, PowerDraw lg footers | `<StatGrid items cols>` (border-t footer) |
| Header "right" chips (time, temperature, status) | many | Already `Chip` / `Dot`; standardise on `Chip` |
| Glass pills on imagery | GameSpotlight `GlassPill`, SteamGame chip | Promote `GlassPill` to primitives once a second widget uses it |
| Media progress | NowPlaying, GameSpotlight combo | `<MediaProgress mode="bar\|wave\|visualizer" …>` wrapping `Bar` and `MiniViz` |

## Consistency rules (checked)
- Every widget renders inside `<Widget>`, so skins, surfaces, accent and variant apply to all 44.
- No widget hard-codes a font family except the OSD strip, which keeps IBM Plex Mono for its HUD digits unless the skin is `tui` or `retro`.
- No widget hard-codes the accent. Secondary series are derived with `hue(deg)` (`oklch(from var(--accent) l c calc(h + deg))`).
- Semantic colours (ok / warn / crit) are the only fixed hues: `#3CC97F · #EDB232 · #F2665E` (`STATE`) and `#fbbf24 · #f87171` (`TONES`). **Recommendation:** merge `TONES.warn/crit` into `STATE` so there is a single set.
- No top-level declaration in any widget shadows a kit export. The preview runtime checks this (a clash is a SyntaxError there).
