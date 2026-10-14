# Widget controls and customisation backlog

Date: 2026-10-13. Scope: the 50 template widgets registered in `src/widgets/registry/{a,b,c,d,e}.ts`.

## Method

A static read of every template (`src/widgets/<Id>.tsx`), its settings and `toProps` adapter
(`src/widgets/registry/*.ts`, `NowPlaying/settings.ts`, `fps-settings.ts`, `spotlight-settings.ts`,
`viz-settings.ts`, `hardware-settings.ts`, `audio-settings.ts`), and the shell (`module.tsx`, `core/Widget.tsx`, `core/look.ts`, `modules/standard-settings.ts`). Each setting was
traced from its definition to the render, and each template prop back to a setting. Nothing was run: no app, no tests,
no `?widget-qa` sweep, so overflow/fit claims are code reading only. No source file was changed.

Conventions: `file:line` are in the file named in the row (a registry file is named in full the first time).
Kinds: dead, gap, control, default, unfinished.
Effort: S under an hour, M a few hours, L a day or more.

Common shorthand: "a-settings" = `src/widgets/registry/a-settings.ts`; "b.ts", "c.ts", "d.ts", "e.ts" = `src/widgets/registry/`.

---

## Group A: system and hardware

### SystemOverview
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A1.1 | gap | Section labels exist for cpu/gpu/ram/disk/net but not vram, while vram has a colour: `LABEL_KEYS` omits it (`registry/system-overview.ts:58`, colours at :59, :185). | Add `vramLabel` to the template-only block (`OVERVIEW_ONLY`). | S |
| A1.2 | control | `vramWarn` is labelled "VRAM / drive full warning" and has no critical partner; capacity sections go red at the load `crit` (`SystemOverview.tsx:187`, :252; setting at `system-overview.ts:145`). Two different meanings share one critical value. | Add `capCrit`, or relabel and hint that critical comes from "Load critical". | S |
| A1.3 | gap | Net section scale is fixed at 2500 x 128 KB/s (`SystemOverview.tsx:242`) with no link-speed setting and no thresholds, so a gigabit link never fills the ring or sparkline. | Add `netMax` (Mbps, 0 = adapter speed), drive ring and sparkline from it. | M |
| A1.4 | gap | CPU "Clock" and "Max core" stats and GPU "Ctrl" are always on (`SystemOverview.tsx:205-206`, :237) while every other detail has a switch. | Add `showClockCpu`, `showMaxCore`, `showMemCtrl` to the `Detail` map. | S |
| A1.5 | control | `diskFilter` is free text of comma-separated name fragments (`system-overview.ts:83-89`). | Multi-select fed from the live disks (a `deviceSetting`-style `multiple` list). | M |
| A1.6 | control | `decimals` is a 0/1 select labelled "None"/"One" (`system-overview.ts:166-176`); label and values read as "decimals: None". | Rename options to "0 (73%)" / "1 (73.4%)" or use a number 0-1. | S |
| A1.7 | control | Device-colour, label and detail switches ignore `sections`: VRAM/Disks/Network colours and the GPU, Memory and Drive switches show even when that section is off (`system-overview.ts:68-82`, :177-185, no `visibleIf`). | `visibleIf` on `sections` for each group. | M |
| A1.8 | default | Load critical defaults differ: 92 for the template (`system-overview.ts:200`, `SystemOverview.tsx:166`) vs 95 in the legacy array (:133-141). Template and alias behave differently with identical stored values. | Intentional per comment; document in the hint, or unify through a migration note. | S |

### MenuBar
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A2.1 | gap | Network items read the literal `ethernet_*` adapter (`MenuBar.tsx:46-47`); no adapter picker, unlike NetworkThroughput. | `deviceSetting("adapter", ..., "adapter")`; fall back to the busiest adapter. | S |
| A2.2 | gap | Thresholds are fixed per item (`MenuBar.tsx:44-45`, :48) and the "Temp" item is GPU-only; no warn/crit settings and no units option. | Add `tempSource` (cpu/gpu/max) and warn/crit pair. | M |
| A2.3 | control | "Label placement" Auto/Stacked/Inline is a tri-state encoded as boolean `stacked` (`a-settings.ts:35`, :40). Fine, but the list of `items` has no hint that only as many as fit are shown (`MenuBar.tsx:71`). | Add hint: "Items that do not fit are dropped from the right". | S |

### KpiTiles
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A3.1 | unfinished | Demo hardware text is shipped: sub lines "Ryzen 9 9950X3D" and "RTX 5090" (`KpiTiles.tsx:39-40`) and "Ethernet" (:42). Every user sees the author's CPU. | Derive from `names`/`readSystemFlat` like SystemOverview does, or drop the sub line. | S |
| A3.2 | gap | Change figure always colours increase amber and decrease green (`KpiTiles.tsx:83`), wrong for FPS-like or free-space metrics; no threshold colouring of the value. | Add `deltaColors` (up-is-bad / up-is-good / neutral) and warn/crit. | M |
| A3.3 | gap | Net tile is download only, "Ethernet" fixed (`KpiTiles.tsx:42`); Power is CPU+GPU only. | Optional `adapter` setting; "Network" metric choice down/up/both. | M |

### StatusTracker
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A4.1 | dead | Legend is fixed text "50-80%" and "Above 80% / down" (`StatusTracker.tsx:108-109`) although warn/crit are editable per track. | Build the legend from the first threshold track, or label "Warning / Critical". | S |
| A4.2 | gap | Axis label `-{N}s` assumes one sample per second (`StatusTracker.tsx:101`); the sampling is per data change. | Show "oldest" / "now" or compute from the real tick. | S |
| A4.3 | control | Five fixed slots with fixed kind (threshold vs status) (`a-settings.ts:62-68`); you cannot switch slot 4 to a threshold, hide a track, or add a sixth. Values print as `%` regardless of the bound sensor (`StatusTracker.tsx:63`). | Per-slot `kind` select and `enabled` toggle; unit from the sensor. | M |
| A4.4 | control | Slot label sits in group "Tracks" while its sensor/thresholds sit in "Track n" (`a-settings.ts:74-75`); history is keyed by the label text (`StatusTracker.tsx:62`), so renaming a track clears its history and two equal labels merge. | Put each slot's label in its own group; key history by slot index. | S |

### SystemStatus
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A5.1 | gap | Only `warn`/`crit`, shared by CPU and RAM (`SystemStatus.tsx:29-30`); reads fixed `system.cpu.load`/`system.ram.load` (:23-25) with no choice. Near-duplicate of Vitals/MemoryUsage with fewer options. | Per-metric thresholds, or merge into Vitals as a preset. | M |

### Vitals
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A6.1 | gap | Tone thresholds are hard-coded 75/90 (`Vitals.tsx:33`); no thresholds group at all, unlike SystemStatus. | Add shared warn/crit via `warnCrit`. | S |
| A6.2 | gap | Net is the sum of all adapters, download only (`Vitals.tsx:64`), temperatures in the sub line are fixed °C (:66-67). | `netDirection` (down/up/both), use the global temp-unit option. | M |
| A6.3 | control | Metric labels differ from KpiTiles for the same keys ("RAM" `a-settings.ts:127` vs "Memory" :47). | Align labels. | S |

### ServiceHealth
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A7.1 | gap | Fixed list of ten services (`ServiceHealth.tsx:31-42`); no way to hide the ones the user does not run (Wave Link, Weather OWM, Yr). Offline noise is permanent. | Multi-select `services` setting, default all. | S |
| A7.2 | gap | Pills layout draws every pill with no fit (`ServiceHealth.tsx:59-66`) while the list uses `useFitRows` (:69). | Clip pills to the height. | S |
| A7.3 | control | The prop `layout` is stored as `healthLayout` because the standard `layout` exists (`a-settings.ts:114-116`); two "layout" controls (tier and list/pills) in different tabs. | Label the standard one "Size tier"; see Cross-cutting X9. | S |

### ProcessList
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A8.1 | dead | Sort option "CPU utility" is offered (`a-settings.ts:119`) but the header toggle only has CPU/Memory and maps utility to the CPU segment (`ProcessList.tsx:44`), so the UI misreports the active sort. | Add the third segment or show no toggle when utility is configured. | S |
| A8.2 | control | `rows` uses 0 as "fit the height" (`a-settings.ts:120`). Acceptable, but the summary stat blocks (Processes/Threads/CPU/Memory) cannot be hidden. | `showSummary` toggle. | S |

### Uptime
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A9.1 | gap | Only `showSeconds` (`a-settings.ts:105`); the xs layout ignores it (`Uptime.tsx:35-41`), the "d" cell is always accent (:48), labels fixed. | `compactFormat`, `showDays` (hide when zero), label style. | S |

### CpuMonitor
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A10.1 | gap | `heatRamp` offers accent/thermal only (`a-settings.ts:136`) while CoreHeatmap offers seven and `heat()` accepts all of them. | Reuse the `RAMPS` list. | S |
| A10.2 | control | `heatRamp`, `coreMetric` have no `visibleIf` on `coreView` (`a-settings.ts:134-136`); heat ramp is meaningless in Bars, both meaningless when Off. | `visibleIf` on `coreView`. | S |
| A10.3 | gap | Warn/crit colour the load ring only; temperature has none, °C only. VRM and CPU fan read `embedded_controller` keys (`CpuMonitor.tsx:42-43`) with no sensor binding and no hide switch. | Temp thresholds; `sensorSetting` for VRM and fan, or hide when absent. | M |

### CoreHeatmap
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A11.1 | dead | `hotOutline` is drawn only in the grid shape (`CoreHeatmap.tsx:199`), but is offered for all four (`a-settings.ts:155`, no `visibleIf`). | `visibleIf: shape === "grid"`; also compare against the selected metric, not load. | S |
| A11.2 | dead | `showValues` applies to grid and hex only (`CoreHeatmap.tsx:150`, :201); radial and waterfall ignore it (`a-settings.ts:153`). | `visibleIf` for grid/hex. | S |
| A11.3 | default | Title defaults to `Cores - load` using the raw metric key (`CoreHeatmap.tsx:105`), so "vid" shows as "vid". | Use the option label. | S |
| A11.4 | default | Outline colour is hard-coded `#F2665E` (`CoreHeatmap.tsx:199`); power/VID metrics are AMD SMU-specific (:61) and render NaN on Intel with no hint. | Use `TONES.crit`; hint "Power needs AMD SMU sensors". | S |

### GpuRings
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A12.1 | control | Outer and inner can both be the same metric (`a-settings.ts:175-176`); "Power" ring is board power as % of limit, labelled "Power" (`GpuRings.tsx:36`). | Exclude the other ring's choice; relabel "Board power (% of limit)". | S |
| A12.2 | gap | Centre value is always core temperature in °C (`GpuRings.tsx:55`); no warn thresholds, ring colours do not change by tone; inner default `hue(70)` (:42) not shown in the picker. | Centre-metric select, unit option, thresholds. | M |
| A12.3 | gap | The legend rows (clock, power, fans, junction, `GpuRings.tsx:43-50`) cannot be hidden or chosen. | `legend` multi-select. | S |

### GpuMonitor
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A13.1 | control | Temp thresholds sit in group "GPU monitor" (`a-settings.ts:186`) while every sibling uses "Thresholds". | Pass `THRESHOLDS` as the group. | S |
| A13.2 | gap | The load ring has no tone (`GpuMonitor.tsx:68`), unlike CpuMonitor's load warn/crit; only temperature is thresholded. | Add load warn/crit. | S |
| A13.3 | gap | D3D engine list is fixed (`GpuMonitor.tsx:33`); xs shows fan RPM etc. unconditionally. | Optional `engines` pick. | M |

### MemoryUsage
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A14.1 | gap | Only warn/crit (`a-settings.ts:99`); virtual memory row is always shown (`MemoryUsage.tsx:76`), no toggle, no unit choice. | `showVirtual`, `showAvailable`. | S |

### Thermals
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A15.1 | control | Warn/crit use 0 as "per sensor" inside a numeric slider (`a-settings.ts:193-194`); "Bar scale (°C)" also scales the gauge rings (`Thermals.tsx:86`). | Blank-able number or an "Override thresholds" toggle; relabel "Scale (°C)". | S |
| A15.2 | gap | Gauges view is capped at the hottest four sensors and four fans (`Thermals.tsx:78`, :83); no count, no °F. Fan colour is the only fan control. | `gaugeCount` (2-8), shared temp unit. | M |
| A15.3 | control | `sortBy` "Order: Hottest first / Fixed" sits in "Content" with view/discover (`a-settings.ts:191`); fine, but `discover` raises the default thresholds from per-sensor to 70/85 silently (`Thermals.tsx:48`). | Hint on `discover`. | S |

### PowerDraw
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A16.1 | gap | GPU colour is fixed `hue(70)` (`PowerDraw.tsx:31`) with no CPU/GPU colour settings, though GpuRings has them. | Two colour settings. | S |
| A16.2 | default | Bar widths are not clamped (`PowerDraw.tsx:53-54`): above the budget the bar overflows. Headroom has no tone (:63). | Clamp, tone by percent of budget. | S |

### Fans
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| A17.1 | gap | Reads GPU fans 1-3 and one embedded-controller CPU fan only (`Fans.tsx:32-33`); chassis fans, which Thermals can discover via `readings()`, are missing. | Reuse `readings()` kind "fan" with a source toggle. | M |
| A17.2 | dead | `maxRpm` only affects the lg bar and the studio/compact percentage (`Fans.tsx:57`, :35), so at md and sm it changes nothing. | Hint, or use it for icon speed/colour at every tier. | S |

---

## Group B: storage, network, info and generic

### DriveSpace
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B1.1 | default | Hint says "Blank = 92" for critical (`b.ts:33`) and the ring/xs tone uses 92 (`DriveSpace.tsx:37`), but row bars and the "n critical" pill use 90 (:40-41). Same widget, two thresholds. | One `crit` constant for all four sites. | S |
| B1.2 | control | Warn/crit are free-text fields via `optional()` (`b.ts:22`, :32-33). | Number settings with min/max/step and defaults 80/92. | S |
| B1.3 | dead | `neutral` only affects the list rows (`DriveSpace.tsx:39-40`), not the ring, xs bar or compact view (`tone()` at :50, :61, :67). `sort` is irrelevant when a drive is pinned (`b.ts:30`). | Apply neutral everywhere; `visibleIf: !drive` on sort. | S |

### StorageHealth
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B2.1 | gap | `prefixes` list only five vendors (`StorageHealth.tsx:9`); `module.tsx:120` renders nothing when no key matches, so an SSD from any other vendor hides the widget entirely. (Inferred from the code path, not tried on other hardware.) | Empty prefixes plus `readsAll`, or a broader set; keep `detect()` for the choice. | S |
| B2.2 | gap | Life thresholds 20/50 (`StorageHealth.tsx:66`), read/write colour `#a78bfa` (:26, :34, :40) and the temperature highlight `#fbbf24` (:74) are fixed; the only setting is `disk` (`b.ts:76`). | Life/temp thresholds and read/write colours. | M |
| B2.3 | control | The title always appends total capacity (`StorageHealth.tsx:71`), so a custom title is not the only text. | Hint or `showCapacity`. | S |

### DiskIO
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B3.1 | gap | No settings at all (`b.ts:77`): no disk selection (DriveSpace has `drive`, StorageHealth `disk`), no colours, no sort, no history toggle. | Disk multi-select, read/write colours, `showHistory`. | M |
| B3.2 | default | Bars are sqrt-scaled against the busiest disk (`DiskIO.tsx:27`, :48, :71), which is not stated anywhere. | Hint or a linear/sqrt option. | S |
| B3.3 | unfinished | The tall layout maps every disk with no fit (`DiskIO.tsx:56`), so many disks overflow (verify with `?widget-qa`). | `slice(0, fit)`. | S |

### NetworkThroughput
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B4.1 | control | `view` Speeds/Totals changes something only at size sm (`NetworkThroughput.tsx:100`) and overlaps `showTotals` (`network-modern.tsx:24-32`). | Drop `view` from the template list or make it meaningful at all tiers. | M |
| B4.2 | default | Upload colour defaults to violet in overlay mode (`UP`, :32) but `hue(70)` in mirrored mode (:91). | One default. | S |
| B4.3 | dead | `chart` (Overlay/Mirrored) shows while `sparkline` is off (`b.ts:84`, `network-modern.tsx:33` default false). Template prop default is on (`NetworkThroughput.tsx:63`). | `visibleIf: sparkline`; unify the default. | S |
| B4.4 | gap | Rates are bytes only; no Mbps option. The header utilisation percentage is fixed (:74). | `units` bytes/bits; `showUtilisation`. | M |

### NetworkAdapters
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B5.1 | control | `hideIp` hint says "addresses stay blurred" (`b.ts:94`) but the code unblurs on hover (`NetworkAdapters.tsx:44`). | Fix hint; consider a "never reveal" option for kiosks. | S |
| B5.2 | gap | The public IP is always shown (no toggle), adapters cannot be filtered (virtual/Hyper-V noise), description and link speed cannot be hidden. | `showPublicIp`, `hideVirtual`. | S |

### Clock
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B6.1 | unfinished | `SENSORLESS` says Clock uses the browser clock (`module.tsx:79-82`) but the template reads `plugins.clock-plugin.clock.*` (`Clock.tsx:55`), so without the plugin it shows 00:00 and `new Date(NaN)`. | Fall back to `new Date()` when the plugin is absent. | S |
| B6.2 | control | `format` (12h/24h) and `showDate` apply to the digital face only or partly (`Clock.tsx:78` hides the analog date at sm); no `visibleIf` on `face` (`b.ts:103-105`). | `visibleIf` on `face`. | S |
| B6.3 | gap | English-only weekday/month names and a fixed "Weekday, D Mon" format (`Clock.tsx:15-16`); the colon blink is hard-coded (:95) and ignores reduced motion. | `dateFormat`, locale, `blinkColon`. | M |

### Calendar
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B7.1 | gap | Only `weekStart` Mon/Sun (`b.ts:114`); no Saturday start, week numbers, or month/year label options. The "W{n}" value is days/7 rounded up, not ISO-8601 (`Calendar.tsx:38`). | `showWeekNumbers` with ISO calculation; Saturday option. | M |
| B7.2 | gap | English names fixed (`Calendar.tsx:15-16`). | Locale from the dashboard language. | S |

### Weather
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B8.1 | dead | The large-zone default of 7 forecast days (`Weather.tsx:109`) can never apply: `weatherToProps` always sends `days` (5) (`weather-modern.tsx:64`). | Send undefined when unset, or add "0 = fit" like Forecast. | S |
| B8.2 | dead | `location` (Yr) stays visible for provider OpenWeatherMap (`b.ts:67`, :123) where it does nothing. | `visibleIf: provider !== "owm"`. | S |
| B8.3 | gap | Wind (m/s), pressure (hPa) and precipitation (mm) are fixed (`Weather.tsx:125`, :129-132); only °C/°F is selectable. | A `units` system (metric/imperial) with km/h and mph. | M |
| B8.4 | control | View Full/Now/Forecast/Minimal duplicates the three toggles it bundles via `applies` (`weather-modern.tsx:21-38`); picking "Now" then toggling is confusing. `forecast` view hands off to the Forecast template, which has no OWM support (see B9.1). | Keep `view`, move toggles under "Custom" or hide when a view is chosen. | M |
| B8.5 | default | "Tmrw" label assumes the forecast starts tomorrow (`Weather.tsx:141`). | Derive from the date. | S |

### Forecast
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B9.1 | gap | Reads only `plugins.yr-weather-plugin.<loc>.forecast` (`Forecast.tsx:39`); no provider option though Weather supports OpenWeatherMap, so Weather's "Forecast" view is blank for OWM. | Add provider + OWM parsing, or hide the view when provider is OWM. | M |
| B9.2 | control | "Days" here vs "Forecast days" in Weather (`b.ts:131`, `weather-modern.tsx:47`); this one has "0 = as many as fit". | Align labels and semantics. | S |
| B9.3 | default | Range-bar colours `#60a5fa`/`#fbbf24` (`Forecast.tsx:54-55`) and the "Tmrw" label (:77, :91) are fixed; no rain/wind toggles. | Settings for colour mode and `showRain`. | S |

### SensorValue
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B10.1 | control | Decimals, Minimum, Maximum, Warn and Critical are free-text `optional()` fields (`b.ts:40-44`). | Number inputs (decimals as a 0-4 select); blank handling via a clear button. | S |
| B10.2 | control | Minimum/Maximum are shown for Value and Spark where they do nothing (`b.ts:41-42`, no `visibleIf` on `display`). | `visibleIf: display in gauge, bar`. | S |
| B10.3 | gap | Prop `source` ("where the value comes from") has no setting (`SensorValue.tsx` props, `b.ts:138`). | `textSetting("source")` or derive from the key. | S |
| B10.4 | default | Gauge defaults to 0 decimals (`SensorValue.tsx:79`) while Value/Bar default to 1 when under 10 (:85). Auto max is `1.1 x history` and drifts (:45). | One auto-decimals rule; steadier auto-scale. | S |
| B10.5 | gap | Thresholds only flag high values (`tone()`); no "lower is worse" (battery, free space). | `invert` toggle. | S |

### SensorGroup
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| B11.1 | unfinished | The sample list is the author's hardware: RTX 5090 and Kingston keys (`SensorGroup.tsx:27-32`) shown when `sensors` is empty ("Empty = the sample list", `b.ts:50`). | Show an empty state instead, or detect the user's own CPU/GPU. | S |
| B11.2 | dead | In "Auto-discover" mode `sensors`, `groupLayout`, `bars`, `groupMax`, decimals and warn/crit are ignored (`Discovered.tsx` reads only `maxRows`/colours), yet they stay visible (`b.ts:50-56`, no `visibleIf`); the inverse holds for `maxRows`. | `visibleIf: !auto` for the list group. | S |
| B11.3 | gap | `SensorItem` supports per-item label/max/warn/crit/decimals (`SensorGroup.tsx:16-24`) but settings expose one shared value (`b.ts:48-57`); labels cannot be edited at all. | A per-row editor (repeatable group) in the inspector. | L |
| B11.4 | control | `groupMax` blank means "no bar" while `bars` defaults on, so Bar per item does nothing until a max is typed (`b.ts:52-53`). | Auto max from the unit (as SensorValue), number control. | S |
| B11.5 | default | Grid mode maps all items with no fit (`SensorGroup.tsx:78`); values default to 0 decimals so 0.85 V reads 1 (:82). | Slice to fit; auto decimals. | S |

---

## Group C: media and audio

### NowPlaying
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C1.1 | dead | `showArt` is ignored by the vinyl and backdrop layouts, which always draw the cover (`NowPlaying.tsx:227`, :242); only card/wave honour it. | `visibleIf` per layout, or honour it. | S |
| C1.2 | dead | All visualiser settings (style, device, timeline, bar count, shape, colours, dynamics) show while Progress row is Bar (`NOW_PLAYING_OWN`, `NowPlaying/settings.ts:291-298`, no `visibleIf`); `liveSources` stays visible while `liveCapture` is off (:248-266; used only in `captureDeviceIdsOf`, :356-363). | `visibleIf: progress === "visualizer"` and `liveCapture`. | M |
| C1.3 | control | "Progress" (`showProgress`, :15) and "Progress row" (`progress`, :294) both live in "Now playing" and read as the same thing. `artBackground` ("Cover art background") overlaps the Backdrop layout. | Rename: "Show progress" / "Progress style"; merge or explain. | S |
| C1.4 | gap | Not hideable when idle: the template has no `isIdle`/`hideWhenIdle` (`c.ts:79-100`) while the legacy media modules do (`modules/modern-media.tsx:20`). | See Cross-cutting X2. | S |
| C1.5 | control | Source option "Pushed" has no hint (`settings.ts:292`); tint has no effect on the Theme surface (`NowPlaying.tsx:82`) without saying so. | Hints. | S |
| C1.6 | default | Sensitivity default 1 here (`settings.ts:58`), neutral 1.4 in Visualizer (`Visualizer.tsx:37`, `c.ts:171`); bar count 24 here (:82) vs bands 0=auto there. Same concept, two scales and names. | Unify via the shared viz settings. | M |

### AudioMeter
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C2.1 | dead | In bridge mode `meterStyle` and `segments` are ignored (bridge always draws LED ladders, `AudioMeter.tsx:115-188`), and `segments` applies to the LED style only (:283). `device` is unused in bridge mode. None are hidden (`c.ts:105-109`). | `visibleIf` on `mode`/`meterStyle`; or let the bridge honour the style. | S |
| C2.2 | dead | `ballisticsOf()` always returns a preset (`modules/audio-modern.tsx:103`), so the documented "unset draws the sensor value as is" branch (`AudioMeter.tsx:62-63`, :87) can never be reached from a template zone. | Return undefined when unset, or remove the dead branch and doc. | S |
| C2.3 | gap | The hot threshold is hard-coded 85% (`AudioMeter.tsx:223`, :275) and the floor -60 dB (:18), while MeterBridge offers warn/clip/floor settings. The bridge shows at most six devices (:162). | Share MeterBridge's dB settings; `maxDevices`. | M |
| C2.4 | control | Audio keys are split over three groups: "Content" (show*), "Meter" (response/colours) and "Audio meter" (own) (`modules/audio-modern.tsx:19-98`, `c.ts:105-110`). Bridge layout labels ("Columns"/"Rows") differ from MeterBridge's "Orientation". | Pass one group; harmonise labels. | S |

### VolumeMixer
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C3.1 | unfinished | `onSetVolume`/`onToggleMute` exist (`VolumeMixer.tsx` props) but nothing passes them: `c.ts:130` says the shell wires them, `module.tsx:128` does not, and a repo-wide grep finds no caller. The mute button and fader render but do nothing, and the "Show mute" toggle controls an inert control. | Wire them to the volume plugin's write path, or drop the interactive affordances and the setting. | L |
| C3.2 | dead | At xs/sm the widget always shows the default device and ignores the `device` pin (`VolumeMixer.tsx:68-81`, `def` from :41). | Use the first of `list`. | S |
| C3.3 | gap | The "Wave Link" chip in the header is hard-coded (`VolumeMixer.tsx:59-64`) and cannot be hidden. | `showWaveLink` toggle. | S |

### MeterBridge
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C4.1 | dead | `holdMs` can never apply: toProps always sets `ballistics` (`c.ts:161`), so peak hold comes from the preset (`MeterBridge.tsx:97`, :102 `l.held ?? holdOf(...)` never falls through). The setting sits in "Thresholds" although it is a time (`c.ts:144`). | Make `holdMs` override the preset hold, or remove it; move to a "Meter" group. | M |
| C4.2 | control | No ordering check on warn/clip (`c.ts:146-147`); `floor` range -120..-20 but the scale marks stop at -60 (`MeterBridge.tsx:21`). Rows of max channels are silently dropped to fit width (:183). | Clamp and cross-validate; hint. | S |
| C4.3 | gap | Overlaps AudioMeter bridge mode (`AudioMeter.tsx:159`) with different options. | Decide which one owns the bridge; cross-reference in descriptions. | M |

### Visualizer
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C5.1 | control | Colour 1 shows in Follow mode where it is unused (`viz-settings.ts:24`, no `visibleIf`); Bar shape/gap shows for non-bar modes (:34-35). | `visibleIf` on colour mode and mode. | S |
| C5.2 | control | "Sensitivity" (1.4 neutral) and "Auto gain" (`viz-settings.ts:43`) both scale the signal with no explanation of how they interact; Peak caps sits in "Visualizer" here, in the shape group in NowPlaying (`c.ts:172`, :73). | Hint; consistent group. | S |

### WaveLink
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| C6.1 | gap | `levelColor` is a template prop (`WaveLink.tsx` props) but only the alias passes it (`modules/wavelink-modern.tsx` alias toProps); the template module offers no meter colour (`c.ts:187`, `wavelinkToProps`). | Add `levelColor` setting and map it. | S |
| C6.2 | gap | Devices and mixes are shown only at lg (`WaveLink.tsx` layout: `size === "lg"` branches) with no toggle; columns capped at six, devices at four. | `showDevices`, `maxChannels`. | M |

---

## Group D: gaming

### FpsMonitor
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D1.1 | dead | The default view is "Frame-time graph", but `showMetrics`, `sparkline`, ring colour and sparkline colour apply only to Gauge/Trend (`FpsMonitor.tsx:195`, :223); all four stay visible (`d.ts:47-60`, `fps-settings.ts:12-17`). | `visibleIf: view !== "frametime"`. | S |
| D1.2 | dead | `target` drives tone only in the frame-time layout (`FpsMonitor.tsx:193-194`); the gauge colours by refresh rate (`gt`, :197-199), so the target setting does nothing in Gauge/Trend. | Use `target` for the gauge max/tone when set. | S |
| D1.3 | default | Three different FPS health scales: 0.9/0.5 here (:194), 0.9/0.6 for the gauge (:199), 0.5/0.75 in OsdStrip (`OsdStrip.tsx:40`). Fallback max is 144 Hz (:197). | One shared helper and optional thresholds. | M |
| D1.4 | gap | No idle hiding on the template (`d.ts:43-63` has no `isIdle`) while the alias has it (`fps-modern.tsx:40`). | See Cross-cutting X2. | S |

### GameSpotlight
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D2.1 | dead | `scrim` is ignored by the ticker and poster layouts (fixed gradients, `GameSpotlight.tsx:120`, :155) and `motion` by poster (:154 `on={false}`). | `visibleIf` per layout or honour them. | S |
| D2.2 | dead | Music card settings (music, progress, viz mode) apply to Combo only; Stats/News to Composite only (`d.ts:72-74`, `spotlight-settings.ts:36-39`); none gated. | `visibleIf` on `spotlightLayout`. | S |
| D2.3 | gap | Combo music uses `device="default-audio"` (`GameSpotlight.tsx:232`) with no device or look settings, and offers 5 visualiser modes where Visualizer offers 8 (`d.ts:74`). | Reuse the shared viz look/device settings. | M |
| D2.4 | control | Scrim is 0-1 (`d.ts:70`) while other opacity-like settings are percent (`surfaceOpacity`, `vizOpacity`); default 0.6 here vs 0.55 in SteamGame (`SteamGame.tsx:35`). | Percent 0-100; one default. | S |
| D2.5 | gap | No `hideWhenIdle` (`steam-modern.tsx:37` has it on the alias). | See X2. | S |

### OsdStrip
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D3.1 | dead | Cells beyond what fits (width/92) are dropped silently (`OsdStrip.tsx:63`), so ticking cells can have no visible effect. | Hint; wrap to a second row. | S |
| D3.2 | gap | Drop colours and thresholds are fixed (`OsdStrip.tsx:40`); no CPU/GPU thresholds; the "RTSS: window title" footer cannot be hidden (:84). | `showFooter`, thresholds. | S |
| D3.3 | control | Description says "fixed cell order" but the setting says the checklist order is the order (`d.ts:94-104`). | Align the description or hint. | S |

### FramePacing
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D4.1 | gap | RTSS only (`FramePacing.tsx:23`), no PresentMon fallback that FpsMonitor has (`FpsMonitor.tsx:181`). | Share the dual-source lookup. | S |
| D4.2 | control | Budget lines are comma-separated text (`d.ts:118`); the time axis assumes 4 samples/s (`FramePacing.tsx:105`). | Chip list input; compute from real tick. | M |

### PlaytimeShare
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D5.1 | gap | Settings are only six slice colours (`d.ts:126`); the title "Last 2 weeks" and the "Library" footer are fixed (`PlaytimeShare.tsx:43`, :82), no game-count cap. Colours repeat after six games (:66). | `maxGames`, `showFooter`; group colours as advanced. | S |
| D5.2 | control | Slice 6's default is `rgba(255,255,255,0.35)` (`PlaytimeShare.tsx:14`), which the colour picker cannot show. | Hint "default: neutral". | S |

### SteamProfile
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D6.1 | gap | No settings (`d.ts:129`): the friends list, stats box, level chip (`SteamProfile.tsx:30`) and online colour `#4ade80` are fixed. | `showFriends`, `showStats`, `maxFriends`. | S |

### SteamGame
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D7.1 | gap | Near-duplicate of GameSpotlight Hero with fewer options; no achievements/latest-unlock toggles (shown by tier, `SteamGame.tsx:62`, :75). | Merge as a GameSpotlight preset, or add the toggles. | M |
| D7.2 | gap | No `hideWhenIdle`. | See X2. | S |

### Achievements
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D8.1 | gap | Only ring/pips (`d.ts:142`); the latest-unlock block (`Achievements.tsx`) cannot be hidden, and `tot - un` wording ("left to 100%" / "still locked") is fixed. | `showLatest`. | S |

### SteamLibrary
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D9.1 | control | `showNews` is a tri-state select (Auto/On/Off, `d.ts:149`) while GameSpotlight's `showNews` is a boolean (`spotlight-settings.ts:38`). Recent-games count is height-derived (`SteamLibrary.tsx:31`) with no cap. | One convention; `recentCount`. | S |

### SteamNews
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| D10.1 | gap | Only `lines` (`d.ts:156`); item count, date and game-name rows are fixed (`SteamNews.tsx`). | `maxItems`, `showGame`, `showDate`. | S |

---

## Group E: plugin cards

### Bluetooth
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E1.1 | control | View plus three toggles that it bundles (`e.ts:74-87`); battery colours are raw `type: "color"` entries without the helper's style/advanced filing (`e.ts:88-89`). | Use `colorSetting`; collapse view into the toggles. | S |
| E1.2 | gap | Battery thresholds 50/20 (`Bluetooth.tsx:64`) and the six-device cap (:109) are fixed; the high colour is the accent with no setting. | Thresholds, `maxDevices`, high colour. | S |

### Departures
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E2.1 | gap | Only `showStatus` (`e.ts:63`); no row cap, relative times ("in 4 min") or line-chip colour. | `maxRows`, `timeFormat`. | S |

### Notifications
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E3.1 | control | `maxLines` (1-200, default 50, `e.ts:48`) is capped again by what fits; effectively a data limit rather than a display one. Type colours are fixed (`Notifications.tsx:33`). | Hint; `minLevel` filter (errors/warnings only). | S |

### StreamDeck
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E4.1 | unfinished | Each key's column and row are parsed (`StreamDeck.tsx:43-47`) but the grid uses 5 columns for up to 15 keys else 6 (:79), so a 3x2 Mini, a 4x2 or an 8x4 XL deck is laid out wrongly. | Grid columns from max col + 1. | S |
| E4.2 | gap | Only profile/labels toggles (`e.ts:105-108`); no icon fit, key gap, or per-device choice for multi-deck setups. | `device` select, `gap`. | S |

### TextFile
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E5.1 | gap | Only `showMeta` (`e.ts:37`). No font size, wrapping, max lines or "show the end" for logs; the body scrolls (`TextFile.tsx:87`), which a kiosk cannot do. | `fontSize`, `wrap`, `tail`, `maxLines`. | M |

### WebPage
| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| E6.1 | control | URL is a plain text field with no hint about X-Frame-Options blocking or YouTube conversion (`e.ts:23`, `WebPage.tsx:73-80`). | Hint; a "page refuses embedding" state. | S |
| E6.2 | gap | No refresh interval, scroll/interaction lock, or zoom independent of the widget size; the iframe has broad `allow` and no `sandbox` (`WebPage.tsx:77-79`). | `refreshSeconds`, `interactive`, and a restrictive sandbox default. | M |

---

## Cross-cutting

| # | Kind | Finding | Suggested fix | Effort |
|---|---|---|---|---|
| X1 | dead | Standard `alignX`/`alignY`, `labelCase` and `gap` mostly do nothing on templates. The shell sets `--wp-x`, `--wp-y`, `--wp-text-align`, `--wp-label-case` and `--wp-gap` (`components/widget-style.ts:120-140`), but no file in `src/widgets` uses `flow()`, `textAlign()` or `ws.gap`; only the shell header reads label case and gap (`core/views.tsx:302`, :309). The 3x3 Alignment picker and "Gap between items" therefore have no visible effect on the body of any template. | Wire the variables into the shared primitives (`Metric`, `Stat`, list rows) so the body honours them, or hide those controls on template widgets. | L |
| X2 | gap | `hideWhenIdle` is offered only on Notifications among templates (`e.ts:49`, :60). NowPlaying, FpsMonitor, GameSpotlight and SteamGame have no `isIdle`, while their legacy aliases do (`fps-modern.tsx:40`, `modern-media.tsx:20`, `steam-modern.tsx:37`) and `docs/widget-settings.md` lists media, FPS and Steam as idle-aware. | Add `IDLE_SETTING` plus `isIdle` to the four templates. | M |
| X3 | control | Threshold handling is uneven. Number controls with min/max exist in a-settings (`warnCrit`), free text in b.ts (`optional()`, :22), and group names vary ("Thresholds", "GPU monitor", "CPU monitor"). Defaults disagree inside one widget (B1.1). Widgets with a gauge/ring and no thresholds: Vitals, KpiTiles, MenuBar, GpuRings, PowerDraw, StorageHealth, Fans, AudioMeter, FPS. No "lower is worse" mode anywhere. | One `thresholdSettings(opts)` builder with number controls, a fixed group and a shared default table. | M |
| X4 | control | Settings that depend on another setting are rarely gated. `visibleIf` is used only in a handful of places (CoreHeatmap `history`, AudioMeter `orientation`, Thermals fans, SensorGroup auto, viz colours). Missing: A10.2, A11.1, A11.2, B4.3, B8.2, B10.2, B11.2, C1.1, C1.2, C2.1, C5.1, D1.1, D2.1, D2.2. | A sweep adding `visibleIf`; add a schema test that flags settings with no consumer for the default mode. | M |
| X5 | gap | Temperature and speed units are not global. Only SystemOverview and Weather have a unit option; °C is hard-coded in MenuBar, Vitals, CpuMonitor, GpuMonitor, GpuRings, Thermals, StorageHealth and OsdStrip; network rates are bytes only. | A shared `tempUnit`/`rateUnit` in the profile style or the standard block. | M |
| X6 | gap | Colours are hard-coded with no setting: violet `#a78bfa` (StorageHealth, DiskIO, NetworkThroughput), `hue(70)` (GpuRings, PowerDraw, NetworkThroughput mirrored), `#F2665E`/`#EDB232`/`#3CC97F` literals in KpiTiles, OsdStrip, CoreHeatmap, and `#60a5fa`/`#fbbf24` in Forecast. Some siblings do offer colours (NetworkThroughput, GpuRings). | Read/write/upload/CPU/GPU colour settings through `colorSettings`, defaulting to the current values. | M |
| X7 | unfinished | Placeholder data and hardware assumptions: KpiTiles sub lines (A3.1), SensorGroup sample list (B11.1), Fans/CpuMonitor/MenuBar use `ethernet_*` and `embedded_controller_*` keys (A2.1, A10.3, A17.1), StorageHealth vendor prefixes (B2.1). | Detect or let the user bind; show empty states rather than the author's hardware. | M |
| X8 | gap | `showHeader` is never exposed: `shellProps` does not set it (`module.tsx:51-64`), and eight templates force it off (Calendar, GameSpotlight, KpiTiles, MenuBar, OsdStrip, SteamGame, Vitals, WebPage) while Clock and SystemOverview tie it to a custom title. A header cannot be toggled per widget. | A standard `showHeader` boolean (auto/on/off) in the Widget category. | M |
| X9 | control | Naming collisions on "Layout": the standard `layout` (tier) vs `healthLayout`, `groupLayout`, `playerLayout`, `spotlightLayout`, `orientation`/`meterOrientation`/`bridge layout` (mixed vocabularies for the same horizontal/vertical choice). | Rename the standard control "Size tier"; one vocabulary for orientation. | S |
| X10 | control | Inconsistent unit and convention choices for the same idea: scrim 0-1 vs opacity percent (D2.4), tri-state select vs boolean for show/hide (D9.1, `showIpv6`, B8.4), sensitivity 1 vs 1.4 and bar-count vs bands (C1.6), "Days" vs "Forecast days" (B9.2), RAM vs Memory (A6.3). | A short settings style guide in `docs/widget-settings.md` and a lint-style schema test. | M |
| X11 | dead | `ballisticsOf()` never returns undefined (`modules/audio-modern.tsx:103`), which makes unset-behaviour branches in AudioMeter and MeterBridge unreachable (C2.2, C4.1). | Return undefined for unset, or delete the branches. | S |
| X12 | gap | Hard-coded English strings and assumptions about sampling rate: "Tmrw", month/weekday names, "Last 2 weeks", `-{N}s` axes (A4.2, D4.2, B6.3, B7.2). | One strings/locale helper; compute axes from the real tick. | M |
| X13 | control | Filing is inconsistent: some widgets keep all options in "Content", others in a widget-named group; Audio keys are split across three groups (C2.4); `holdMs` sits in "Thresholds" (C4.1). Colour-only groups are auto-moved to Style (`inspector-categories.ts`), but mixed groups such as "GPU rings" keep colours with content (`a-settings.ts:173-178`). | Decide a rule (Content / Data / Style / Thresholds) and apply it. | M |
| X14 | unfinished | Fit and overflow risks found by reading, to confirm with `?widget-qa`: DiskIO (B3.3), SensorGroup grid (B11.5), ServiceHealth pills (A7.2), Bluetooth six-device cap, AudioMeter six-device cap, WaveLink six columns. | Run the full sweep (`docs/redesign/phase9/qa.md`) after fixes. | S |

---

## Top 10 priorities

1. **X1** Standard alignment, label case and gap have no effect on template bodies (visible in every widget; L).
2. **C3.1** VolumeMixer controls are inert; the mute toggle and fader do nothing (unfinished; L, or S to remove).
3. **D1.1 / D1.2** FpsMonitor's default view hides four dead settings and `target` is dead in the gauge (S).
4. **A3.1 / B11.1** Author hardware leaks into KpiTiles and the SensorGroup sample list (S, user-visible).
5. **X2** Add hide-when-idle to NowPlaying, FpsMonitor, GameSpotlight and SteamGame to match the docs (M).
6. **B1.1 / B1.2 / B10.1 / B10.2** DriveSpace critical mismatch (90 vs 92), and numeric free-text inputs in DriveSpace and SensorValue (S).
7. **B11.2 / B11.3** SensorGroup: auto mode leaves five dead settings and per-item options are not editable (S to gate, L for the editor).
8. **B2.1 / B3.1** StorageHealth is hidden for unlisted SSD vendors, DiskIO has no settings (S to M).
9. **C4.1 / C2.1** MeterBridge `holdMs` can never apply and AudioMeter bridge ignores style/segments (M).
10. **X4** One `visibleIf` sweep over the dependent settings listed under Cross-cutting X4, with a schema test to keep them honest (M).
