# Phase 9 gap table: legacy widgets → templates

Source: settings inventory, `src/modules/*.tsx`, template specs. Rule for every row: the stored key
stays; the widget's `toProps(settings)` maps it to a template prop. "Extend" means the template gains
that feature during its port (9.4). Template props below are from `docs/redesign/widgets/docs/widgets/`.

## Standard settings (every widget) → shell
| Stored key | Shell | Notes |
|---|---|---|
| `label` | `title` | empty = template default |
| `accent` | `accent` | explicit accent beats a skin's accent |
| `radius` | `radius` | `auto` → skin radius |
| `surface` | `surface` | `glass` / `matte-light` / `matte-dark` / `theme` keep today's materials; template surfaces added by name; `auto` = skin surface |
| `layout` (auto/card/standard/compact/simple) | tier/compact selection | auto = measured; card/standard/compact/simple force a tier (lg/md/sm/xs) |
| `icon` | header icon override | lucide name from `WIDGET_ICONS` |
| `preset` | unchanged (applies bundle keys) | |
| `background`, `backgroundOn` | shell background image layer | |
| `hideWhenIdle` | registry `isIdle` | unchanged |
| `autoScale`, `scale` | shell (tier adaptation / CSS zoom) | measure after zoom |
| `alignX`, `alignY` | compact/value views alignment | |
| `padding`, `gap` | override tier padding / layout gap when set | |
| `textColor`, `mutedColor` | `--w-fg`, `--w-muted` | |
| `font`, `fontWeight`, `labelCase` | override skin font / weight / header case | |
| `stroke` | multiplies `skin.ring` and graph stroke | |
| `customCss` | scoped to the widget root | |
| `borderWidth`, `borderColor`, `glow`, `glowColor`, `surfaceOpacity`, `blur` | `surfaceBox` over any surface | |

## Per module
| Legacy id | Target | Mapped | Extend (no template home today) |
|---|---|---|---|
| `systemmodern` (min 2×1) | SystemOverview | `devices`→`sections` (cpu/gpu/ram); `showVram`→`sections`+vram; `showCores`+`coreStyle`→`coreView`; `cpuColor`/`gpuColor`/`ramColor`/`vramColor`→`colors`; `loadWarn`/`loadCrit`→`warn`/`crit` | `disk` section + `diskFilter`, `diskColor`, `diskLabel`; `showNames`, `showTemps`, `showPower`, `showClock`, `showHotspot`, `showFans`, `showMemClock`, `showPowerLimit`, `showMemory`, `showPageFile`, `showDiskTemp`, `showDiskIo`, `showDiskLife`; `sparkline`, `historyLength`; `vramWarn`, `tempWarn`, `tempCrit`; `tempUnit` (°F); `decimals`; `cpuLabel`, `gpuLabel`, `ramLabel` |
| `spotifymodern` / `mediamodern` (2×1, idle) | NowPlaying `source=spotify` / `media` | `liveSource`→`vizDevice` (""=loudest live device); `visualizer`/`waveform`→`progress`; `waveformVariant`→`vizMode`; `visualizerMirrored`→`vizMode=mirror`; `waveformSensitivity`→MiniViz `sens`; `artBackground`→backdrop | `showTimes`, `tint`, `showProgress` (off), `waveformMode` (scrolling/static), `waveformActive`, `waveformBarWidth`, `waveformBarGap`, `waveformBarRadius`, `waveformMinBarHeight`, `waveformLineWidth`, `waveformFadeEdges`, `waveformFadeWidth`, `visualizerBarCount`, `visualizerAlign`, `visualizerMinLevel`, `visualizerIdle`, `visualizerLoading`, `visualizerOrientation`, `liveCapture` (Web Audio), `liveSources`. New stored key `playerLayout` for template `layout` |
| `steammodern` (2×1, idle) | GameSpotlight composite | `dimBanner`→`scrim` (true = template default scrim, false = 0); `showNews` | `showStats`; profile/status/level/friends/library total/latest unlock/news line in one card. New key `spotlightLayout` |
| `hardwaremodern` (2×1) | Thermals (`view=temps`) + SensorGroup auto-discovery (`view=list`) | `view` | `maxRows`, `showFans`, `tempColor`, `fanColor`, `powerColor`; `hwinfo.*` data; rank temp/fan/power/other |
| `weathermodern` (3×1) | Weather (+ Forecast for `view=forecast`) | `forecastDays`→`days` | `view` full/now/forecast/minimal, `tint`, `showStats`, `showFeels`, `showForecast` |
| `fpsmodern` (2×1, idle) | FpsMonitor | | `view` gauge/trend, `showMetrics`, `sparkline`, `ringColor`, `sparkColor`; `plugins.fps-plugin.*` (PresentMon: 0.1% low, GPU util, CPU busy, latency) |
| `audiomodern` (2×1) | `view`: meter→AudioMeter single, audiometer→MeterBridge, volume→VolumeMixer | `source`→`device` (""=all → bridge); `meterVariant`→`meter` (solid→bar, segmented→segments); `meterOrientation`, `showVolume` | `showDevice`, `showDetails`, `showMute`, `meterBallistics` (peak/vu/instant), `levelColor`, `hotColor`, `meterVariant=gradient` |
| `wavelinkmodern` (2×1) | WaveLink (+ MeterBridge parts) | | all: `source` (multi meter picker, `optionsFrom: wavelink`), `showReadout`, `showFader`, `showMixes`, `meterVariant`, `meterOrientation`, `meterBallistics`, `liveColor`, `muteColor`; data via `src/lib/wavelink.ts` |
| `networkmodern` (2×1) | NetworkThroughput | adapter auto = busiest | `view` speeds/totals, `showTotals`, `sparkline`, `downloadColor`, `uploadColor` |
| `vbz` (2×1, CARD surface default `theme`) | new `Departures` | | `showStatus`; rows time · line badge · destination; empty state |
| `bluetoothmodern` (2×1) | new `Bluetooth` | | `view` full/devices/status, `showStatus`, `showDevices`, `showBattery`, `batteryMidColor`, `batteryLowColor` |
| `notifications` (2×1, idle) | new `Notifications` | | `showHistory`, `maxLines` (1–200, 50); Error/Warning tones |
| `textfile` (2×1) | new `TextFile` | | `showMeta`; scrolling mono body |
| `streamdeck` (3×2) | new `StreamDeck` | | `showProfile`, `showLabels`; per-device 5/6-column icon grid |
| `webpage` (4×2, reduced style) | new `WebPage` (`bleed`) | | `url`, YouTube embed rewrite; only colours & surface, border & effects, advanced |
| `cards` (4×2) | SensorValue per unclaimed key | | grid of generic cards, theme surface default |

## Panel widgets (D4: renderers stay; skin-aware when a skin is set)
| Kind | With a skin set |
|---|---|
| stat, value | numerals via `Num` / `numFont` |
| bar | `Bar` (meter style); `inverted` pre-computed |
| gauge | `Ring` (thickness × `skin.ring`) |
| sparkline | `Spark` (graph style), `history` = length |
| table, text, image, clock, shape | numerals/fonts only; layout unchanged |
