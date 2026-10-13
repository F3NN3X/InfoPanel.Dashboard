# Settings inventory (Phase 0 of the studio redesign)

Every setting the studio edits today, read from the code at commit `6c465bf`. It is the checklist
the Phase 2 registry must cover: **each row appears exactly once in the new inspector, with the same
key and default.** The prototype was not used as a source.

Companion docs: `docs/redesign/DATA_MODEL.md` (what exists), `docs/redesign/FEATURE_MAP.md` (where
it lives), `docs/redesign/IMPLEMENTATION_PLAN.md` (Phase 2).

## How to read this

**Stored at** (the "Level" column):

| Level | Where it is stored |
|---|---|
| **Zone** | `Placement.settings[key]` (a widget's or panel's look and content settings) |
| **Zone field** | A field of the `Placement` itself, outside `settings` (`visible`, box, `design`, `styleMode`, `module`) |
| **Panel** | `Placement.panel` (`PanelDef`) |
| **Panel widget** | One entry of `Placement.panel.widgets` (`Widget`) |
| **Profile** | `MonitorProfile` (`profiles[]`) |
| **Dashboard** | `DashboardConfig` top level |
| **General** | `DashboardConfig.general` (`GeneralSettings`, only changed keys stored) |
| **Browser** | `localStorage`, not in the config (studio UI preferences) |

**Target** = tab › section in the redesigned inspector, per DATA_MODEL §2–3 and §7 and FEATURE_MAP
§9–12. Tabs: **C** Content, **S** Style, **D** Data (zone inspector); **Dash** = nothing selected
(tabs Profile · Appearance · Global style · General). **Adv** = hidden until "Advanced settings" is
on. A target marked **(proposed)** is not stated in the spec; those are repeated in "Open placement
questions" at the end.

**Controls** follow `setting-control.tsx`: `boolean` Toggle; `number` Slider with value box (min /
max / step); `select` Segmented when it has 1–4 options, otherwise Select; `select` + `multiple`
checkbox list (stored as a comma-separated string, `""` = none); `color` color field (`""` = unset);
`text` single-line field (or textarea when multiline); `icon` icon grid; `image` URL field with
upload, drop and library; `align` one 3×3 grid that writes two keys.

**Defaults**: `auto` for px/enum selects means "the widget's own value"; `""` means unset. A setting
at its default is normally *not stored* (sparse); `effectiveSettings` fills defaults at read time.

**Visibility**: today the inspector shows every setting a module declares, with no per-row
conditions (nothing is hidden by another setting's value). Conditions below are the ones the spec
adds or that come from which block a module spreads.

**Style resolution** (`src/lib/style-resolve.ts`): module default → `DashboardConfig.style` →
`MonitorProfile.style` → the zone's own `settings`. Only the look keys (`PROFILE_STYLE_KEYS`, §1.5)
are layered. `Placement.styleMode = "follow"` (or `styleEnforce` on the dashboard/profile) ignores
the zone's own look values but keeps them stored. Source-dot states today: default, dashboard,
profile, own, own-overriding-global; follow/enforce locks the rows (shown read-only).

---

## 1. Shared general settings (`src/modules/standard-settings.ts`)

Which block each zone type spreads (the inspector builds the general cards from it):

| Zone type | Settings it gets |
|---|---|
| 11 "modern" widgets (System, Spotify, Media, Steam, Hardware, Weather, FPS, Audio, Wave Link, Bluetooth, Network) | `STANDARD_SETTINGS` (all of §1.1–1.4) |
| Departures (`vbz`), Notifications, Text File, Stream Deck, and **Other sensors** (`cards`) | `CARD_SETTINGS`: `surface` (default **Theme**), `accent`, all of `STYLE_SETTINGS`, all of `SURFACE_SETTINGS`. No `label`, `icon`, `preset`, `layout`, `background`, `backgroundOn` |
| Web Page | only `scale`, `radius`, `accent`, `borderWidth`, `borderColor`, `glow`, `glowColor` (see §2.15) |
| Custom panel | `PANEL_SETTINGS` (§1.6) |
| Blank zone | none (no settings; the Widget card has only the type picker and Visible) |
| `hideWhenIdle` (`IDLE_SETTING`) | Spotify, Media, Steam, FPS, Notifications only |

### 1.1 Widget identity (`STANDARD_SETTINGS`, not look keys)

| Key | Label | Control | Options | Default | Visible when | Level | Target |
|---|---|---|---|---|---|---|---|
| `label` | Custom title | text | | `""` | modern widgets (not CARD widgets, not Web Page) | Zone | C › Widget |
| `icon` | Icon | icon grid | none + 18 icons: activity, bluetooth, brain, cpu, gauge, gamepad, headphones, heart, leaf, monitor, moon, music, radio, snowflake, sun, thermometer, wifi, zap | `""` | modern widgets | Zone | C › Widget |
| `hideWhenIdle` | Hide when idle | toggle | | `false` | the 5 idle-capable widgets | Zone | C › Widget |
| *(zone field)* `visible` | Visible | toggle | | `true` | every zone | Zone field | C › Widget, plus header eye / `H` |
| *(zone field)* `module` | Type (Change / Pick a widget) | picker button (opens the widget picker) | the 16 modules + Other sensors + Custom panel | n/a | every zone; blank shows "Pick" | Zone field | C › Widget › Widget type |

### 1.2 Size, alignment, spacing, typography (`STYLE_SETTINGS`; all are look keys)

| Key | Label | Control | Options | Default | Level | Target |
|---|---|---|---|---|---|---|
| `autoScale` | Scale with the zone | toggle | | `true` | Zone, Profile style, Dashboard style | S › Size & alignment (Adv) |
| `scale` | Size (%) | slider 50–200 step 5 | | `100` | same | S › Size & alignment |
| `alignX` + `alignY` | Alignment | 3×3 align grid (+ Spread toggle: `alignX = between`) | X: auto, start, center, end, between. Y: auto, start, center, end | `auto` / `auto` | same | S › Size & alignment |
| `padding` | Inner padding | select | auto, 0, 4, 8, 12, 16, 20, 24, 32, 48 px | `auto` | same | S › Spacing & shape |
| `gap` | Gap between items | select | auto, 0, 4, 8, 12, 16, 24, 32, 48 px | `auto` | same | S › Spacing & shape |
| `radius` | Corner radius | select | auto, 0, 4, 8, 12, 16, 20, 28 px, Pill (`999`) | `auto` | same | S › Spacing & shape |
| `stroke` | Ring / bar thickness (%) | slider 50–250 step 10 | | `100` | same | S › Spacing & shape |
| `textColor` | Text color | color | | `""` | same | S › Typography |
| `mutedColor` | Secondary text color | color | | `""` | same | S › Typography |
| `font` | Font | select | auto (Theme), sans, rounded, serif, mono | `auto` | same | S › Typography |
| `fontWeight` | Value weight | select | auto, 400 Regular, 500 Medium, 600 Semibold, 700 Bold, 800 Heavy | `auto` | same | S › Typography |
| `labelCase` | Label case | segmented | auto, uppercase, none (As written), capitalize | `auto` | same | S › Typography |
| `customCss` | Custom CSS (scoped to this widget; `:scope` = its root) | textarea | | `""` | same (also editable as the global style) | S › Advanced (Adv) |

### 1.3 Surface and effects (`SURFACE_SETTINGS`; look keys, "surfaced" widgets only)

| Key | Label | Control | Options | Default | Visible when | Level | Target |
|---|---|---|---|---|---|---|---|
| `borderWidth` | Border width | select | auto, 0, 1, 2, 3, 4, 6 px | `auto` | surfaced widgets (not Web Page's non-edge keys) | Zone, Profile style, Dashboard style | S › Border & effects |
| `borderColor` | Border color | color | | `""` | same | same | S › Border & effects |
| `glow` | Edge glow | segmented | none, soft, strong | `none` | same | same | S › Border & effects |
| `glowColor` | Glow color (empty = accent) | color | | `""` | today always; spec: only when `glow` is not none | same | S › Border & effects |
| `surfaceOpacity` | Surface opacity (%) | slider 0–100 step 5 | | `100` | surfaced widgets | same | S › Colors & surface |
| `blur` | Background blur | select | auto, 0, 4, 8, 16, 24, 40 px | `auto` | surfaced widgets | same | S › Colors & surface |

### 1.4 Preset, layout, surface, accent, background (`STANDARD_SETTINGS`)

| Key | Label | Control | Options | Default | Level | Look key? | Target |
|---|---|---|---|---|---|---|---|
| `preset` | Preset | select | default; dark (applies `surface=matte-dark`, `tint=false`); light (`matte-light`, `tint=false`); vivid (`glass`, `tint=true`); mono (`matte-dark`, `tint=false`, `accent=#fafafa`) | `default` | Zone | no | S › Colors & surface (proposed, see questions) |
| `layout` | Layout | select | auto (Auto, fit to zone), card, standard, compact (Compact bar), simple | `auto` | Zone | no | S › Size & alignment |
| `surface` | Surface | segmented (modern: 4 options) | glass, matte-light, matte-dark, theme | `glass` (CARD widgets and Departures etc.: `theme`) | Zone, Profile style, Dashboard style | yes | S › Colors & surface › Surface |
| `accent` | Accent color | color | | `""` | Zone, Profile style, Dashboard style | yes | S › Colors & surface |
| `background` | Background image | image field (URL / upload / drop / library) | | `""` | Zone | no | S › Colors & surface (Adv) |
| `backgroundOn` | Use as background | toggle | | `false` | Zone | no | S › Colors & surface (Adv) |

`applies` bundles: choosing a `preset` also writes the listed extra keys (`surface`, `tint`,
`accent`) into the zone's settings.

### 1.5 The look-key set

`PROFILE_STYLE_KEYS` = `surface`, `accent`, and every key of §1.2 and §1.3: `autoScale`, `scale`,
`alignX`, `alignY`, `padding`, `gap`, `radius`, `textColor`, `mutedColor`, `font`, `fontWeight`,
`labelCase`, `stroke`, `customCss`, `borderWidth`, `borderColor`, `glow`, `glowColor`,
`surfaceOpacity`, `blur` (22 keys). Exactly these are copied by Copy style, saved in style presets
and appearance presets, and editable at dashboard / profile level (Dash › Global style). `preset`,
`layout`, `label`, `icon`, `background`, `backgroundOn`, `hideWhenIdle` and all content keys are
per zone only.

### 1.6 Custom panel look (`PANEL_SETTINGS`)

`STANDARD_SETTINGS` minus `preset`, `layout`, `autoScale`, `stroke`, with two changes. Stored in the
panel zone's `settings` like any widget.

| Key | Change for panels | Target |
|---|---|---|
| `label` | Label becomes "Title (empty = hidden)"; empty hides the title | C › Widget |
| `surface` | Default `panel`; options none (None), panel (Card), bordered (Bordered card), then glass, matte-light, matte-dark, theme (7 options, so a Select) | S › Colors & surface |

All other keys (`icon`, `accent`, `background`, `backgroundOn`, §1.2 and §1.3 minus the removed
ones) behave as in §1.2 to §1.4. A panel has no `hideWhenIdle`. Legacy fallback: `PanelDef.title`,
`titleVisible`, `accent` and `background` are read when the matching setting is absent
(`panelSettings`, `panelLegacyLook`), never written by the new UI.

### 1.7 Zone-level fields handled outside `settings`

| Field | Label (today) | Control | Options | Default | Level | Target |
|---|---|---|---|---|---|---|
| `Placement.colStart`, `rowStart`, `colSpan`, `rowSpan` | Zone box Col / Row / W / H | 4 number fields (min 1, max = grid size) | | set when drawn or added | Zone field | placement row (COL / ROW / W / H) |
| `Placement.design.accent` | Frame accent | color | | unset | Zone field | S › Border & effects › Zone frame (Adv) |
| `Placement.design.background` | Frame background | segmented | none, panel (Panel), bordered (Bordered) | `none` | Zone field | S › Border & effects › Zone frame (Adv). Hidden for panels (they have their own card) |
| `Placement.design.header` | Frame title header | toggle | | `false` | Zone field | S › Border & effects › Zone frame (Adv) |
| `Placement.styleMode` | Follow global / Custom | segmented | follow, custom | unset (= custom, own values win key by key) | Zone field | S › Colors & surface › Look. Shown only when the zone has look keys |
| `Placement.visible` | Visible / eye | toggle | | `true` | Zone field | C › Widget and header |
| Custom CSS | `customCss` in `settings` (§1.2) | | | | Zone | S › Advanced (Adv) |

### 1.8 Zone style tools (actions, not stored settings)

Copy style, Paste style (replaces the zone's look keys; session clipboard), Use as global (All
profiles / This profile; writes `DashboardConfig.style` or `MonitorProfile.style`), Style presets
(Apply, Save as preset…, Delete; stored in `DashboardConfig.stylePresets`), the "N changed" badge and
Reset per card. Target: Colors & surface, plus the context menu (FEATURE_MAP §9).

---

## 2. Widget-own settings

The following tables list only each module's own keys, after the blocks in §1. `Cond.` = visibility
beyond "the module declares it". Min size is the module's `minCols×minRows`.

### 2.1 System (`systemmodern`, min 2×1, claims `system.cpu.`, `system.ram.`; reads `libre.`)

| Key | Label | Control | Options | Default | Section (module group) | Target |
|---|---|---|---|---|---|---|
| `devices` | Devices | checkbox list | cpu CPU, gpu GPU, ram RAM, disk Disks | `cpu,gpu,ram` | Devices | C › Devices |
| `showNames` | Hardware names | toggle | | `false` | Devices | C › Devices |
| `showTemps` | Temperatures | toggle | | `true` | Devices | C › Devices |
| `showPower` | Power draw | toggle | | `true` | Devices | C › Devices |
| `showCores` | CPU threads | toggle | | `false` | CPU | C › CPU |
| `coreStyle` | Thread style | segmented | heatmap, bars | `heatmap` | CPU | C › CPU |
| `showVram` | GPU memory (VRAM) | toggle | | `true` | GPU | C › GPU |
| `showClock` | GPU clock | toggle | | `false` | GPU | C › GPU |
| `showHotspot` | GPU hotspot (memory junction) | toggle | | `false` | GPU | C › GPU |
| `showFans` | GPU fans | toggle | | `false` | GPU | C › GPU |
| `showMemClock` | GPU memory clock | toggle | | `false` | GPU | C › GPU |
| `showPowerLimit` | GPU power (% of limit) | toggle | | `false` | GPU | C › GPU |
| `showMemory` | Memory used / total | toggle | | `true` | Memory | C › Memory |
| `showPageFile` | RAM page file | toggle | | `false` | Memory | C › Memory |
| `showDiskTemp` | Drive temperature | toggle | | `true` | Drives | C › Drives |
| `showDiskIo` | Drive read / write rate | toggle | | `true` | Drives | C › Drives |
| `showDiskLife` | Drive life remaining | toggle | | `false` | Drives | C › Drives |
| `diskFilter` | Drives to show (names, comma-separated; empty = all) | text | | `""` | Drives | C › Drives |
| `sparkline` | Trend sparklines | toggle | | `false` | Trends | C › Trends |
| `historyLength` | Sparkline length (samples) | slider 12–120 step 12 | | `48` | Trends | C › Trends |
| `tempWarn` | Temperature warning (°C) | slider 50–100 step 5 | | `80` | Thresholds | C › Thresholds |
| `tempCrit` | Temperature critical (°C) | slider 50–110 step 5 | | `90` | Thresholds | C › Thresholds |
| `loadWarn` | Load warning (%) | slider 10–100 step 5 | | `80` | Thresholds | C › Thresholds |
| `loadCrit` | Load critical (%) | slider 10–100 step 5 | | `95` | Thresholds | C › Thresholds |
| `vramWarn` | VRAM / drive full warning (%) | slider 10–100 step 5 | | `90` | Thresholds | C › Thresholds |
| `tempUnit` | Temperature unit | segmented | c Celsius (°C), f Fahrenheit (°F) | `c` | Units & labels | C › Units & labels |
| `decimals` | Decimals | segmented | 0 None, 1 One | `0` | Units & labels | C › Units & labels |
| `cpuLabel` | CPU label | text | | `""` | Units & labels | C › Units & labels |
| `gpuLabel` | GPU label | text | | `""` | Units & labels | C › Units & labels |
| `ramLabel` | RAM label | text | | `""` | Units & labels | C › Units & labels |
| `diskLabel` | Disks label | text | | `""` | Units & labels | C › Units & labels |
| `cpuColor` | CPU color | color | | `""` | Device colors | S › Device colors (Adv) |
| `gpuColor` | GPU color | color | | `""` | Device colors | S › Device colors (Adv) |
| `ramColor` | RAM color | color | | `""` | Device colors | S › Device colors (Adv) |
| `diskColor` | Disks color | color | | `""` | Device colors | S › Device colors (Adv) |
| `vramColor` | VRAM color | color | | `""` | Device colors | S › Device colors (Adv) |

### 2.2 Spotify (`spotifymodern`) and Media (`mediamodern`), identical settings

Spotify: min 2×1, claims `spotify.`, `plugins.spotify-plugin.`, reads `plugins.audio-level-meter.`.
Media: min 2×1, claims `plugins.media-plugin.`, reads the same. Both: `STANDARD_SETTINGS` + `hideWhenIdle`
(idle = nothing playing).

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `showTimes` | Times | toggle | | `true` | Now playing | C › Now playing |
| `showProgress` | Progress | toggle | | `true` | Now playing | C › Now playing |
| `tint` | Tint from cover art | toggle | | `true` | Cover art | C › Cover art |
| `artBackground` | Cover art background (blurred) | toggle | | `false` | Cover art | C › Cover art |
| `waveform` | Live waveform (audiocn) | toggle | | `false` | Waveform | C › Waveform |
| `waveformVariant` | Waveform style | segmented | bars, line, mirror | `bars` | Waveform | C › Waveform |
| `waveformMode` | Waveform mode | segmented | scrolling (Scrolling, level history), static (Static, current bands) | `scrolling` | Waveform | C › Waveform |
| `waveformSensitivity` | Waveform sensitivity (gain) | slider 0.1–4 step 0.1 | | `1` | Waveform | C › Waveform |
| `waveformActive` | Waveform active (off = idle dotted line) | toggle | | `true` | Waveform | C › Waveform |
| `visualizer` | Bar visualizer (audiocn) | toggle | | `false` | Visualizer | C › Visualizer |
| `visualizerBarCount` | Visualizer bar count | slider 4–64 step 2 | | `24` | Visualizer | C › Visualizer |
| `visualizerAlign` | Visualizer alignment | segmented | center, start, end | `center` | Visualizer | C › Visualizer |
| `visualizerMirrored` | Visualizer mirrored | toggle | | `false` | Visualizer | C › Visualizer (Adv) |
| `visualizerMinLevel` | Visualizer resting bar size | slider 0–0.5 step 0.02 | | `0.08` | Visualizer | C › Visualizer (Adv) |
| `visualizerIdle` | Visualizer idle behavior | segmented | static, pulse, wave | `static` | Visualizer | C › Visualizer |
| `visualizerLoading` | Visualizer loading sweep | toggle | | `false` | Visualizer | C › Visualizer (Adv) |
| `visualizerOrientation` | Visualizer orientation | segmented | horizontal, vertical | `horizontal` | Visualizer | C › Visualizer (Adv) |
| `waveformBarWidth` | Waveform bar width (px) | slider 1–12 step 1 | | `3` | Waveform shape | C › Waveform shape (Adv) |
| `waveformBarGap` | Waveform bar gap (px) | slider 0–8 step 1 | | `1` | Waveform shape | C › Waveform shape (Adv) |
| `waveformBarRadius` | Waveform bar radius (px) | slider 0–8 step 0.5 | | `1.5` | Waveform shape | C › Waveform shape (Adv) |
| `waveformMinBarHeight` | Waveform min bar height (px) | slider 0–40 step 1 | | `4` | Waveform shape | C › Waveform shape (Adv) |
| `waveformLineWidth` | Waveform line width (px) | slider 0.5–6 step 0.5 | | `1.5` | Waveform shape | C › Waveform shape (Adv) |
| `waveformFadeEdges` | Waveform edge fade | toggle | | `true` | Waveform shape | C › Waveform shape (Adv) |
| `waveformFadeWidth` | Waveform fade width (px) | slider 0–200 step 4 | | `24` | Waveform shape | C › Waveform shape (Adv) |
| `liveSource` | Live level source (audio device) | select, options from `/api/sources` of `plugins.audio-level-meter.` | live | `""` | Audio source | D › Audio source |
| `liveCapture` | Live capture (Web Audio, real-time) | toggle | | `false` | Audio source | D › Audio source |
| `liveSources` | Capture devices (one visualizer row each) | checkbox list from `enumerateDevices()` (audio inputs; microphone-access prompt) | live | `""` | Audio source | D › Audio source |

### 2.3 Steam (`steammodern`, min 2×1, claims `plugins.InfoPanel.SteamAPI.`; has `hideWhenIdle`: no game running)

| Key | Label | Control | Default | Group | Target |
|---|---|---|---|---|---|
| `dimBanner` | Dim banner for text | toggle | `true` | Content | C › Content |
| `showStats` | Stats | toggle | `true` | Content | C › Content |
| `showNews` | News line | toggle | `true` | Content | C › Content |

### 2.4 Hardware (`hardwaremodern`, min 2×1, claims `libre.`, `hwinfo.`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `view` | View | segmented | list (Reading list), temps (Temp gauges) | `list` | Content | C › Content |
| `maxRows` | Max rows (0 = all) | slider 0–100 step 2 | | `12` | Content | C › Content |
| `showFans` | Fan readings | toggle | | `true` | Content | C › Content |
| `tempColor` | Temperature dot color | color | | `""` | Dot colors | S › Dot colors (Adv) |
| `fanColor` | Fan dot color | color | | `""` | Dot colors | S › Dot colors (Adv) |
| `powerColor` | Power dot color | color | | `""` | Dot colors | S › Dot colors (Adv) |

### 2.5 Weather (`weathermodern`, min 3×1, claims `plugins.yr-weather-plugin.`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `view` | View | segmented | full, now, forecast, minimal | `full` | Display | C › Display |
| `tint` | Tint from conditions | toggle | | `true` | Display | C › Display |
| `showStats` | Stats row | toggle | | `true` | Current conditions | C › Current conditions |
| `showFeels` | Feels-like | toggle | | `true` | Current conditions | C › Current conditions |
| `showForecast` | Forecast strip | toggle | | `true` | Forecast | C › Forecast |
| `forecastDays` | Forecast days | slider 1–7 step 1 | | `5` | Forecast | C › Forecast |

### 2.6 FPS (`fpsmodern`, min 2×1, claims `plugins.InfoPanel.RTSS.`, `plugins.fps-plugin.`; has `hideWhenIdle`: no frames counted, no game running)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `view` | View | segmented | gauge, trend | `gauge` | Content | C › Content |
| `showMetrics` | Extra metrics | toggle | | `true` | Content | C › Content |
| `sparkline` | Trend sparkline | toggle | | `false` | Content | C › Content |
| `ringColor` | Ring color | color | | `""` | Gauge colors | S › Gauge colors (Adv) |
| `sparkColor` | Trend sparkline color | color | | `""` | Gauge colors | S › Gauge colors (Adv) |

### 2.7 Audio (`audiomodern`, min 2×1, claims `plugins.audio-level-meter.`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `source` | Source (device) | select, options from `/api/sources` of `plugins.audio-level-meter.` | live | `""` (all) | Content | C › Content (proposed, also the target of Sources-mode Bind/Unbind) |
| `view` | View | segmented | meter (Level meter), audiometer (Pro level meter, dB), volume (Volume control) | `meter` | Content | C › Content |
| `showDevice` | Device name | toggle | | `true` | Content | C › Content |
| `showDetails` | Peak / RMS & L/R/volume details | toggle | | `true` | Content | C › Content |
| `showVolume` | Volume bar | toggle | | `false` | Content | C › Content |
| `showMute` | Mute indicator | toggle | | `true` | Content | C › Content |
| `meterVariant` | Meter style | segmented | solid, segmented, gradient | `solid` | Meter | C › Meter |
| `meterOrientation` | Meter orientation | segmented | horizontal, vertical | `horizontal` | Meter | C › Meter |
| `meterBallistics` | Meter response | select (3) | peak (Peak, fast attack, peak-hold), vu (VU, slow), instant | `peak` | Meter | C › Meter |
| `levelColor` | Level bar color | color | | `""` | Meter | C › Meter (Adv) per FEATURE_MAP; S (Adv) per DATA_MODEL rule |
| `hotColor` | Hot level color | color | | `""` | Meter | same |

### 2.8 Wave Link (`wavelinkmodern`, min 2×1, no claimed prefixes; reads meters via `src/lib/wavelink.ts`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `source` | Meters to show | dedicated multi meter picker over the Wave Link inventory (channels + output devices) | live; `""` = all | `""` | Content | C › Content |
| `showReadout` | dB readouts & scale | toggle | | `true` | Content | C › Content |
| `showFader` | Fader level | toggle | | `true` | Content | C › Content |
| `showMixes` | Mixes (routes & output mixers) | toggle | | `true` | Content | C › Content |
| `meterVariant` | Meter style | segmented | solid, segmented, gradient | `solid` | Meter | C › Meter |
| `meterOrientation` | Meter orientation | segmented | vertical, horizontal | `vertical` | Meter | C › Meter |
| `meterBallistics` | Meter response | select | peak, vu, instant | `peak` | Meter | C › Meter |
| `liveColor` | Live indicator color | color | | `""` | Meter | C › Meter (Adv) / S (Adv) |
| `muteColor` | Muted / offline color | color | | `""` | Meter | same |

### 2.9 Departures (`vbz`, min 2×1, claims `plugins.InfoPanel.VBZ.`)

Block: `CARD_SETTINGS` (surface default `theme`).

| Key | Label | Control | Default | Group | Target |
|---|---|---|---|---|---|
| `showStatus` | Status line | toggle | `true` | Content | C › Content |

### 2.10 Bluetooth (`bluetoothmodern`, min 2×1, claims `plugins.bluetooth-battery-plugin.`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `view` | View | select (3) | full (Status + devices), devices (Devices + battery), status (Status only) | `full` | Content | C › Content |
| `showStatus` | Bluetooth status | toggle | | `true` | Content | C › Content |
| `showDevices` | Paired devices | toggle | | `true` | Content | C › Content |
| `showBattery` | Battery levels | toggle | | `true` | Content | C › Content |
| `batteryMidColor` | Battery medium color | color | | `""` | Battery colors | S › Battery colors (Adv) |
| `batteryLowColor` | Battery low color | color | | `""` | Battery colors | S › Battery colors (Adv) |

### 2.11 Network (`networkmodern`, min 2×1, claims `libre.ethernet_`)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `view` | View | segmented | speeds, totals | `speeds` | Content | C › Content |
| `showTotals` | Session totals | toggle | | `true` | Content | C › Content |
| `sparkline` | Trend sparkline | toggle | | `false` | Content | C › Content |
| `downloadColor` | Download color | color | | `""` | Speed colors | S › Speed colors (Adv) |
| `uploadColor` | Upload color | color | | `""` | Speed colors | S › Speed colors (Adv) |

### 2.12 Notifications (`notifications`, min 2×1, claims `plugins.InfoPanel.Notifications.`)

Block: `CARD_SETTINGS` + `hideWhenIdle` (idle = notification count is 0).

| Key | Label | Control | Default | Group | Target |
|---|---|---|---|---|---|
| `showHistory` | History list | toggle | `true` | Content | C › Content |
| `maxLines` | Max history lines | slider 1–200 step 5 | `50` | Content | C › Content |

### 2.13 Text File (`textfile`, min 2×1, claims `plugins.InfoPanel.TextFile.`)

Block: `CARD_SETTINGS`.

| Key | Label | Control | Default | Group | Target |
|---|---|---|---|---|---|
| `showMeta` | Size / lines / status header | toggle | `true` | Content | C › Content |

### 2.14 Stream Deck (`streamdeck`, min 3×2, claims `plugins.InfoPanel.StreamDeck.`)

Block: `CARD_SETTINGS`.

| Key | Label | Control | Default | Group | Target |
|---|---|---|---|---|---|
| `showProfile` | Active profile | toggle | `true` | Content | C › Content |
| `showLabels` | Button labels | toggle | `true` | Content | C › Content |

### 2.15 Web Page (`webpage`, min 4×2, no claimed prefixes)

| Key | Label | Control | Options | Default | Group | Target |
|---|---|---|---|---|---|---|
| `url` | URL | text | YouTube watch / share / shorts / live links are rewritten to `/embed/` | `""` | Page | C › Page |
| `scale` | Size (%) | slider 50–200 step 5 | | `100` | (Size & alignment) | S › Size & alignment |
| `radius` | Corner radius | select | as §1.2 | `auto` | (Spacing & shape) | S › Spacing & shape |
| `accent` | Accent color | color | | `""` | (Colors & surface) | S › Colors & surface |
| `borderWidth`, `borderColor`, `glow`, `glowColor` | as §1.3 | | | | (Border & effects) | S › Border & effects |

Web Page declares none of the other STYLE keys, no `surface`, no `customCss`, no `label`/`icon`.
Because the edge keys are the only effects, `surfaceOpacity` and `blur` are absent.

### 2.16 Other sensors (`cards`, no module settings)

Zone type for every sensor no module claims. Block: `CARD_SETTINGS` (surface default `theme`,
`accent`, all of §1.2, all of §1.3). No own keys. No `label`, `icon`, `hideWhenIdle`.

---

## 3. Custom panels (`Placement.panel`, `src/lib/panel-model.ts`)

The panel's look (title, accent, surface, spacing, colors, CSS) is `PANEL_SETTINGS` in the zone's
`settings` (§1.6). Its arrangement is `PanelDef`, below. Field edits coalesce per field into one
undo step (`panel:<field>`).

### 3.1 Panel fields (`PanelDef`)

| Field | Label | Control | Options / range | Default | Visible when | Target |
|---|---|---|---|---|---|---|
| view toggle (UI only) | Visual / Code | segmented | visual, code | visual | always | C › Panel › Editor |
| *(whole panel as JSON)* | Code | textarea; Apply, Revert, Ctrl+Enter applies; parse errors inline; one undo step | | | Code view | C › Panel › Code |
| `fit` | Fit in zone | segmented | fill, hug | `fill` (unset) | always | C › Panel (Size) |
| `gap` | Gap (px) | number, empty = auto | 0–200 | unset (auto: the Style gap, else the layout's own) | always | C › Panel |
| `padding` | Padding (px) | number, empty = auto | 0–200 | unset (auto) | always | C › Panel |
| `layout` | Layout | segmented | stack, grid, overlay (legacy `wrap` loads as a wrapping row stack; no value = stack) | `stack` | always | C › Layout |
| `direction` | Direction | segmented | row, column | `row` | stack | C › Layout |
| `wrap` | Wrap | toggle | | `true` | stack | C › Layout |
| `justify` + `align` | Alignment | one 3×3 grid. Stack: along the axis start/center/end/Spread (`between`); across start/center/end/stretch. Grid: cell alignment, no Spread | `justify`: start, center, end, between. `align`: start, center, end, stretch | unset (stack `align` start, grid `stretch`) | stack, grid | C › Layout |
| `columns` | Columns | stepper | 1–12 | `3` | grid | C › Layout |
| `gridCols` | Column sizes | track chips (any CSS track: `1fr`, `auto`, `120px`, `minmax(0, 1fr)`) + add/remove | | unset (equal split of `columns`) | grid | C › Layout |
| `gridRows` | Row sizes | track chips | | unset (equal rows) | grid | C › Layout |
| `overlayAlign` | Band alignment (Top / Middle / Bottom) | 3 segmented | start, center, end, between | `start` each | overlay | C › Layout |
| `bottomGridCols` | Bottom band columns | number, empty = a flex row | 1–12 | unset | overlay | C › Layout |
| `scrim` | Dark scrim over the image | toggle | | `true` (stored only when `false`) | overlay | C › Background |
| background image | Background image | select of the panel's image widgets; writes `asBackground` on the chosen one | first image widget / none | first image widget | overlay | C › Background |
| `css` | (panel CSS, scoped to the zone; travels with the panel in presets) | no dedicated control today (reached through the panel's Custom CSS, `customCss` §1.2, and the Code view) | | | | S › Advanced (Adv) |
| `title`, `titleVisible`, `accent`, `background`, `visible`, `id` | legacy / identity | not edited directly; kept in step with the Title / Accent / Surface settings, and editable in Code | | | | none (see questions) |

Also on the Panel card: **Save as panel preset…** (the card's "…" menu, name input, writes
`DashboardConfig.panelPresets`).

### 3.2 Widget list (the "Widgets" card)

| Action | Control | Notes | Target |
|---|---|---|---|
| Add widget | menu of the 10 kinds | new widget = `{ id, kind, visible: true }`, a shape gets `shape: vbar`, `thickness: 4` | C › Widgets |
| Select | row click; Up/Down arrows with the list focused | | C › Widgets |
| Reorder | drag a row; Alt+Up/Down | | C › Widgets |
| Hide / show | eye | `Widget.visible` | C › Widgets |
| Row menu | Duplicate, Copy, Paste after, Change kind (submenu), Remove | Change kind keeps `id`, `kind`, `visible`, `label`, `sensor`, `unit`, `color`, `span`, `rowSpan`, `overlayZone`, `box`, `css`, `className` and the fields the new kind reads | C › Widgets |
| Delete key on the list | removes the selected widget | | C › Widgets |

### 3.3 Panel-widget fields, by section (`Widget`, `src/components/studio/widget-editor/`)

The selected widget's cards appear after the panel cards. Section ids: widget:data, widget:display,
widget:layout, widget:typography, widget:colors, widget:advanced.

**Common to every kind (stored on the `Widget`):**

| Field | Label | Control | Default | Applies to | Target |
|---|---|---|---|---|---|
| `label` | Label | text | unset | all kinds with data (not shape) | C › Display (spec) / Selected · kind card |
| `sensor` | Sensor | sensor picker (single mode); warns "not in the live sensor list" | unset | stat, value, bar, gauge, sparkline, table, text, image (not clock, not shape) | C › Display (opens the data picker) |
| `visible` | (eye in the list) | toggle | `true` | all | C › Widgets |
| `box.w` | Width | segmented Hug / Fill / Fixed (+ px 1–4000); in a grid Cell / Fixed | stack: `fill` for bar, table, image, sparkline, else `hug`; grid: `fill` | stack, grid | C › Size & placement |
| `box.h` | Height | same | `hug` (stack) / `fill` (grid) | stack, grid | C › Size & placement |
| `box.self` | Align self | 3-cell align (cross axis; vertical in row stacks and grids, horizontal in column stacks) | unset (panel `align`) | stack, grid | C › Size & placement |
| `span`, `rowSpan` | Column span, Row span | number, empty = auto | 1–12, unset | grid | C › Size & placement |
| `box.col`, `box.row` | Column, Row (start) | number, empty = auto | 1–24, unset | grid | C › Size & placement |
| `overlayZone` | Band | segmented Top / Middle / Bottom | `top` | overlay | C › Size & placement |
| `asBackground` | Use as panel background | toggle | unset | image kind in overlay | C › Size & placement (also set by the panel's Background select) |
| `className` | Class names (hooks for panel CSS) | monospace text | unset | all | C › Selected · Advanced (Adv) |
| `css` | Custom CSS (scoped to this widget; `:scope`, `.wp-label`, `.wp-value`, `.wp-unit`, `.wp-bar-fill`) | monospace textarea | unset | all | C › Selected · Advanced (Adv) |

**Kind-specific fields:**

| Kind | Field | Label | Control | Range / options | Default | Target |
|---|---|---|---|---|---|---|
| stat, value | `subSensor` | Sub sensor (below the value) | sensor picker | | unset | C › Display |
| stat, value, bar, gauge, sparkline, text | `unit` | Unit | text | | unset (placeholder `%`) | C › Display |
| stat, value, bar, gauge, sparkline, text | `decimals` | Decimals | number | 0–6 | `0` | C › Display |
| stat, value, bar, gauge, sparkline, text | `scale` | Scale × | number (float), empty = 1 | | unset | C › Display |
| bar, gauge | `max` | Max (denominator) | number (float) | min 0 | `100` | C › Display |
| bar, gauge | `inverted` | Invert fill | toggle | | `false` | C › Display |
| stat, value, table, text, clock | `align` | Text alignment | segmented | left, center, right | `left` | C › Display |
| text | `text` | Static text | text | | unset | C › Display |
| image | `text` | Image URL | text (or bind a sensor with a URL) | | unset | C › Display |
| image | `height` | Max height (px) | number, empty = auto | 24–600 | unset | C › Display |
| table | `rows` | Rows | number | 1–20 | `7` | C › Display |
| table | `columns` | Columns (split on ", ") | number, empty = auto | 0–12 | unset | C › Display |
| table | `header` | Header (comma-separated) | text | | unset | C › Display |
| sparkline | `history` | History samples | number | 5–200 | `40` | C › Display |
| clock | `clock` | Show | segmented | both (Time + date), time, date | `both` | C › Display |
| shape | `shape` | Shape | segmented | vbar (V-bar), hbar (H-bar), rect (Rect), circle (Circle) | `vbar` | C › Display |
| shape | `thickness` | Thickness / diameter (px) | number | 1–120 | `4` | C › Display |
| stat, value, table, text, clock | `fontSize` | Font size (px) | number, empty = auto | 8–200 | unset | C › Typography & colors |
| gauge | `fontSize` | Ring size (px) | number, empty = auto | 8–200 | unset | C › Typography & colors |
| stat, value, bar, gauge, sparkline, text, clock, shape | `color` | Color | color | | unset (global style overrides it when Force global style is on; fills take the accent) | C › Typography & colors |

Kinds not listed for a field do not show it (`hasData`, `hasDisplay`, `hasTypography`, `hasColor`
in the editor): a shape has no data card (only a note), clock has no Sensor, image/table have no
Color.

---

## 4. Profile (`MonitorProfile`)

| Field | Label | Control | Range / options | Default | Level | Target |
|---|---|---|---|---|---|---|
| `name` | Name | text | | new: `<window W>×<H>` | Profile | Dash › Profile |
| `width`, `height` | W, H (design size, px) | 2 number fields | whole px | new: the window size | Profile | Dash › Profile |
| `cols` | Cols | stepper −/+ | 2–24 (clamps zones into the grid) | new: 6 when width ≤ 1280, else 12 | Profile | Dash › Profile |
| `rows` | Rows | stepper −/+ | 1–24 | new: 4 when height ≤ 700, else 6 | Profile | Dash › Profile |
| `fit` | Scroll / Fill viewport | segmented | scroll, fill | new: fill when height ≤ 700 and width ≥ 1600, else scroll | Profile | Dash › Profile |
| `gap` | Gap px | number, empty = default | 0–200 | `12` (`DEFAULT_GRID_GAP`) | Profile | Dash › Profile |
| `padding` | Padding px | number, empty = default | 0–200 | 0 for a fill kiosk page, 12 for fill in the studio, 24 for scroll | Profile | Dash › Profile |
| `style` | This profile › Style | scope switch "This profile" on the global style cards (§5.2) | look keys | unset (inherits) | Profile | Dash › Profile › This profile, edited in Dash › Global style |
| `styleEnforce` | Force global style | Inherit / On / Off | | unset (= the dashboard's) | Profile | Dash › Appearance › Scope |
| `background` | Background | Inherit / Custom / None + editor (§5.5) | | unset (inherit) | Profile | Dash › Profile › This profile; editor in Dash › Appearance › Page background |
| `theme`, `radius` | Theme colors, corner radius | Inherit / Custom + theme editor (§5.4) | | unset (inherit) | Profile | Dash › Profile › This profile; editor in Dash › Appearance › Theme |
| `id`, `sampleVersion`, `placements` | identity, shipped-profile version, zones | not editable fields | | | Profile | none |

Profile actions: New profile, Delete active profile (disabled with one profile left), switch to a
pinned profile or **Auto (match window)**; `DashboardConfig.activeProfile` holds the pinned id or
`"auto"`. Target: Profiles panel, top-bar switcher, Dash › Profile › Profile selection.

---

## 5. Dashboard config (`DashboardConfig`)

### 5.1 Overview

| Field | What | Default | Target |
|---|---|---|---|
| `version` | config schema, always `2` | `2` | none |
| `activeProfile` | pinned profile id or `auto` | `auto` | see §4 |
| `profiles` | see §4 | shipped five (Sample 1920×550, ARCv2, Main display, Kiosk strip 1920×550, Small 1024×600) | Profiles panel |
| `theme`, `radius` | dashboard theme (§5.4) | `DEFAULT_THEME`, `0.5` rem | Dash › Appearance › Theme |
| `style`, `styleEnforce` | dashboard style (§5.2) | unset, unset (off) | Dash › Global style, Appearance › Scope |
| `background` | page background (§5.5) | unset (the theme background shows) | Dash › Appearance › Page background |
| `general` | §5.6 | unset (defaults) | Dash › General |
| `dataApiUrl` | §5.7 | unset (`http://127.0.0.1:3921`) | Dash › General › Connection |
| `sourcePrefs` | §5.8 | unset | Sources mode |
| `stylePresets`, `appearancePresets`, `panelPresets` | §6 | unset | see §6 |

### 5.2 Global style (Dash › Global style)

Edits `DashboardConfig.style` (scope All profiles) or `MonitorProfile.style` (scope This profile)
with the look keys of §1.5, rendered from `PROFILE_STYLE_SETTINGS`: the same rows and categories as
a widget (Size & alignment, Typography, Spacing & shape, Colors & surface, Border & effects,
Advanced), without Follow/Custom, Preset, Layout and the title / icon / background-image rows.
Cards show "N changed" and a per-card Reset.

| Control | Key | Label | Control | Options | Default | Level | Target |
|---|---|---|---|---|---|---|---|
| Scope | (UI) | All profiles / This profile | segmented | | All profiles (This profile if the profile already has its own style) | UI state | Dash › Appearance › Scope |
| Force global style (dashboard) | `styleEnforce` | Force global style on every widget | toggle | | `false` | Dashboard | Dash › Appearance › Scope |
| Force global style (profile) | `styleEnforce` | Force global style on every widget | segmented | Inherit, On, Off | Inherit (unset) | Profile | Dash › Appearance › Scope |
| Make all widgets follow global style | (action) | sets `styleMode = follow` on every zone of the profile | | | | Zone field | Dash › Appearance (also in the command palette) |

### 5.3 Appearance presets (Dash › Appearance › Appearance presets)

See §6.1.

### 5.4 Theme (`ThemeTokens`, `src/lib/theme.ts`; `src/components/studio/theme-panel.tsx`)

All values are `"h s% l%"` triplets edited with a native color input (converted to hex and back).
Defaults are `DEFAULT_THEME` (the Zinc preset). Stored at **Dashboard** (`theme`, `radius`), or per
**Profile** (`theme` partial, `radius`) when the profile is Custom.

| Key | Label in the editor | In the editor today | Default (Zinc) | Target |
|---|---|---|---|---|
| `background` | Background | yes | `240 10% 3.9%` | Dash › Appearance › Theme |
| `foreground` | Foreground | yes | `0 0% 98%` | same |
| `card` | Card | yes | `240 10% 3.9%` | same |
| `card-foreground` | Card text | yes | `0 0% 98%` | same |
| `primary` | Primary | yes | `0 0% 98%` | same (spec: primary/accent visible, other tokens Adv) |
| `primary-foreground` | Primary text | yes | `240 5.9% 10%` | same (Adv) |
| `secondary` | Secondary | yes | `240 3.7% 15.9%` | same (Adv) |
| `muted` | Muted | yes | `240 3.7% 15.9%` | same (Adv) |
| `muted-foreground` | Muted text | yes | `240 5% 64.9%` | same (Adv) |
| `accent` | Accent | yes | `240 3.7% 15.9%` | same |
| `destructive` | Destructive | yes | `0 62.8% 30.6%` | same (Adv) |
| `border` | Border | yes | `240 3.7% 15.9%` | same (Adv) |
| `ring` | Ring | yes | `240 4.9% 83.9%` | same (Adv) |
| `popover`, `popover-foreground`, `secondary-foreground`, `accent-foreground`, `destructive-foreground`, `input` | not in the editor | **no** (set only by theme presets) | `240 10% 3.9%`, `0 0% 98%`, `0 0% 98%`, `0 0% 98%`, `0 0% 98%`, `240 3.7% 15.9%` | none today (see questions) |
| `radius` | Corner radius | slider 0–1.25 rem step 0.25 | `0.5` | Dash › Appearance › Theme |
| theme preset | Colours only | 6 swatches: Zinc, Neutral, Slate, Ocean, Forest, Paper (light); changes colors only, not radius | Zinc | Dash › Appearance › Theme |

The editor shows 13 of the 19 tokens (the 6 others exist in the type and presets). The "Custom
colours" block is a collapsed section; an "edited" tag shows when the tokens match no preset. This
profile: **Inherit / Custom** (Custom starts as a copy of the dashboard theme); Inherit shows a
note.

### 5.5 Page background (`PageBackground`, `src/lib/appearance.ts`; `background-editor.tsx`, `background-panel.tsx`, `background-video.tsx`)

Stored at **Dashboard** (`background`) and per **Profile** (`background`; `{ type: "none" }` =
explicitly none; unset = inherit). Sparse; unset fields use the defaults below.

| Field | Label | Control | Options / range | Default | Visible when | Target |
|---|---|---|---|---|---|---|
| scope | All profiles / This profile | segmented | | All profiles (This profile when the profile has its own) | always | Dash › Appearance › Page background |
| profile mode | Inherit / Custom / None | segmented | | Inherit | This profile | same |
| `type` | (None / Color / Gradient / Image / Video) | segmented | none, color, gradient, image, video (a profile's Custom omits None) | `none` (dashboard) | always | same |
| `color` | Color / Fill (behind the image or video) | color | | `#0b0b0f` | color; image/video (letterbox fill) | same |
| `gradient.from`, `gradient.to` | From, To | 2 colors | | `#1e1b4b`, `#0b0b0f` | gradient | same |
| `gradient.angle` | Angle | slider 0–359 ° | | `160` | gradient | same |
| `src` | Image / Video | URL field with Upload…, drop, Library (uploaded files; delete; clean up unused) and a preview | http(s), server path, `data:` image/video | unset (an image/video with no file shows its fill color) | image, video | same |
| `poster` | Poster image | media field | | unset | video | same |
| `loop` | Loop | toggle | | `true` | video | same |
| `muted` | Muted | toggle | | `true` | video | same |
| `rate` | Speed | segmented | 0.5×, 0.75×, 1×, 1.25×, 1.5×, 2× (any stored rate in 0.25–4 is added) | `1` | video | same |
| `fit` | Fit | segmented | cover, contain, stretch, center, tile (video: no tile) | `cover` | image, video | same |
| `position.x`, `position.y` | Position | 3×3 align grid | start / center / end | `center` / `center` | image, video, when `fit` is not stretch | same |
| `dim` | Dim | slider 0–100 % | | `0` | gradient, image, video (Effects) | same |
| `tint` | Tint | color | | `#000000`; setting it sets `tintOpacity` to 30 when it is 0 | same | same |
| `tintOpacity` | Tint opacity | slider 0–100 % | | `0` | same | same |
| `blur` | Blur | slider 0–40 px | | `0` | same | same |

Behaviours that are not settings: a video pauses when the page is hidden and shows only its poster
under reduced motion (General › Motion).

### 5.6 General (`DashboardConfig.general`; `src/lib/general.ts`; `general-panel.tsx`)

Only changed keys are stored; each card counts what it sets and resets only its own keys.

| Key | Label | Control | Options | Default | Level | Target |
|---|---|---|---|---|---|---|
| `font` | Font | select (5) | system (System), sans, rounded, serif, mono | `system` | General | Dash › General › Type |
| `hour12` | Clock | segmented | auto (Locale), 24 (24 h), 12 (12 h) | `auto` (unset) | General | Dash › General › Clock & date |
| `showSeconds` | Show seconds | toggle | | `true` | General | Dash › General › Clock & date |
| `locale` | Date & time locale | select | System (`""`), plus en-US, en-GB, de-DE, de-CH, fr-FR, it-IT, es-ES, nl-NL, sv-SE, nb-NO, pl-PL, pt-BR, ja-JP, zh-CN; a saved unknown locale is added as an option | `""` | General | Dash › General › Clock & date |
| `motion` | Motion | segmented | system (System), reduce (Reduce), full (Full) | `system` | General | Dash › General › Display |
| `hideCursor` | Hide cursor in kiosk | toggle | | `false` | General | Dash › General › Display |
| `kioskPageNav` | Page dots and swipe | toggle | | `false` | General | Dash › General › Display |

The "Studio" section of the spec (inspector position) has no stored setting in the config: see §7.

### 5.7 Connection (`dataApiUrl`; `data-api-panel.tsx`)

| Field | Label | Control | Notes | Default | Level | Target |
|---|---|---|---|---|---|---|
| `dataApiUrl` | Data API URL | text; commits on Enter or blur; red border and "Enter an http(s) URL." when invalid | `normalizeApiBase`; stored only when changed | `http://127.0.0.1:3921` | Dashboard | Dash › General › Connection |
| (action) | Test connection | button, shows testing / connected / not reachable | | | UI | same |
| (link) | Open API index | link to `<base>/` | | | UI | same |

### 5.8 Source preferences (`sourcePrefs`; `sources-panel.tsx`)

Key = `{plugin}::{container}` (`""` container for flat sources). Stored at **Dashboard**.

| Field | Label | Control | Default | Target |
|---|---|---|---|---|
| `enabled` | Show in dashboard (also the eye on each source row) | checkbox / icon toggle | `true` (stored only when changed) | Sources mode (source row and detail) |
| `displayName` | Display name | text, placeholder = the source label | unset | Sources mode (source detail) |
| bind / unbind | Bind to widget / Unbind | per-widget button; writes `settings.source` (value = the container id) on a placement whose module declares a `source` setting for this plugin | n/a | Sources mode; Data tab › Bound data |

---

## 6. Presets and saved items

### 6.1 Appearance presets (`appearancePresets`, built-ins in `src/lib/appearance-presets.ts`)

Shape: `{ id, name, description, theme (tokens or preset name), radius, style (look keys),
background? }`. User presets live in `DashboardConfig.appearancePresets`; the 9 built-ins (Dark,
Light, Glass, Frosted, Matte, Neon, Minimal, Ocean, Forest) ship in code (ids `builtin:*`) and
cannot be edited. Stored: **Dashboard**.

| Control | Label | Control type | Default | Target |
|---|---|---|---|---|
| Gallery card | (preview, name, description, image icon when it brings a background) | click applies to the current scope | | Dash › Appearance › Appearance presets |
| Replace the page background | checkbox | | off: the preset background is used only where none is set | same |
| Save current as preset… | name input, Enter saves | | | same |
| Saved look menu | Rename…, Delete | | | same |
| Overrides banner | "N widgets keep their own style · N profiles have their own look", Make them follow, Dismiss | | | same |

An apply is one undo step.

### 6.2 Style presets (`stylePresets`: `{ id, name, settings }`)

Look keys only (§1.5). Stored: **Dashboard**. Controls: zone Colors & surface › "…" menu: Apply
preset (submenu), Save as preset… (name input), Delete preset (submenu). Target: S › Colors &
surface.

### 6.3 Saved panels (`panelPresets`: `UserPanelPreset`)

`{ id, name, panel (PanelDef), settings? (the panel look), colSpan?, rowSpan? }`. Stored:
**Dashboard**; shared by all profiles; exported with the config; each use is a fresh copy. Controls:
Save as panel preset… (Panel card), Add › My panels (Rename…, Delete on each row). Target: context
menu "Save to My panels"; Add › My panels.

### 6.4 Built-in panel presets and layout starters (code, not config)

Panel presets (`src/lib/panelPresets.ts`): Blank panel, System, RAM, CPU, GPU, FPS gauges, Steam,
Weather, Network, Clock. Layout starters (`src/lib/panel-starters.ts`): Row of stats, 2×2 stats, Hero
overlay, Gauge row, Clock + date, Label / value list.

---

## 7. Studio UI preferences (Browser, `localStorage`, not exported)

| Key | What | Values | Default | Target |
|---|---|---|---|---|
| `studio.layout` | Inspector position | auto, side, bottom | `auto` | Zoom bar dock button; Dash › General › Studio |
| `studio.dockHeight` | Dock height set by the splitter | px | unset | Dock splitter |
| `studio.dockCollapsed` | Bottom dock collapsed (Ctrl+\) | boolean | `false` | Same |
| `studio.drawer` | Open left drawer | add, layers, profiles, none | `add` | Rail |
| `studio.sections` | Which inspector cards are open | map | closed except defaults | Section state |
| session only | Style clipboard (Copy style), widget clipboard (Copy widget), settings search text | | | Not persisted |

---

## 8. Open placement questions

1. **`preset` (Default / Dark / Light / Vivid / Mono).** A per-widget quick look that bundles
   `surface`, `tint` and `accent`. FEATURE_MAP lists "Style preset" (the saved named styles), not
   this key. Proposed: S › Colors & surface, next to Surface. It is not a look key, so it is not
   available in Global style.
2. **`layout` on non-adaptive widgets.** The spec says Layout appears only for adaptive widgets
   (Spotify, Media, Hardware, Audio, Bluetooth). In the code all 11 modern widgets declare it and all
   11 read `cfg.layout`. Either keep it on all 11 (no feature loss) or restrict it (a behaviour change).
3. **Audio `source` and Wave Link `source`.** They are data selections (device, meters), but
   FEATURE_MAP puts Audio "Content (device, ...)" and Wave Link "Content (meters to show, ...)". Sources
   mode also writes Audio's `source` through Bind. Candidates: C › Content, or D › Bound data. The
   inventory follows FEATURE_MAP (C) and flags it.
4. **Colour pickers inside a Content category.** Audio's Meter colours (`levelColor`, `hotColor`) and
   Wave Link's (`liveColor`, `muteColor`) sit in the same "Meter" group as non-colour settings.
   FEATURE_MAP says "Meter (...; colours Adv) → C"; DATA_MODEL §2 says colour-picker categories go to
   S (Adv). The five other colour groups (Device, Dot, Gauge, Battery, Speed) are unambiguous.
5. **Web Page style.** The spec says the style tab is reduced to Colors & surface, Border & effects
   and Advanced. The code exposes `scale` (Size & alignment), `radius` (Spacing & shape), `accent`,
   and the four edge keys, and no `customCss` (so no Advanced section). Decide whether Size and
   corner radius stay (no feature loss) and whether to add `customCss`.
6. **Panel `css`, `PanelDef.title`/`titleVisible`/`accent`/`background`/`visible`.** There is no
   dedicated field for `PanelDef.css` today; it is only reachable in the Code view, and panel CSS is
   scoped with the zone's `customCss` otherwise. The legacy fields are kept for old builds. Proposed:
   leave them to the Code view; expose a panel CSS field under S › Advanced only if wanted.
7. **Theme tokens not in the editor.** `popover`, `popover-foreground`, `secondary-foreground`,
   `accent-foreground`, `destructive-foreground`, `input` are in the config and presets but have no
   editor row. Keep unreachable (as today) or add them under Adv.
8. **Which theme tokens are Adv.** The spec says "primary/accent visible, other tokens under
   Advanced". The inventory marks `background`, `foreground`, `card`, `card-foreground`, `primary`,
   `accent` as visible and the rest of the 13 as Adv; adjust if "Background" and "Foreground" should
   also be Adv.
9. **Zone frame for panels.** `design.background` is hidden for panels; accent and title header
   remain. Panels already have `accent`, `title` and `surface`, so the zone frame accent and header may
   duplicate them. Kept (no feature loss), under S › Border & effects › Zone frame (Adv).
10. **Follow vs edit.** DATA_MODEL says editing a look value on Follow switches the zone to Custom.
    The code locks the rows (read-only) and offers "Customize" / the Custom segment instead. The
    registry needs to pick one.
11. **`glowColor` visibility.** Spec: shown only when glow is not none. Code: always shown. Treat as
    a `visibleIf` added in Phase 2.
12. **`sourcePrefs`.** `enabled` ("Show in dashboard") and `displayName` are stored but nothing outside
    the Sources panel reads them today (no kiosk or widget consumer). The redesign keeps them in
    Sources mode; confirm whether they should start to take effect.
13. **Hide when idle for panels and CARD widgets.** Only five widgets have it. No other zone type can
    gain it without a new `isIdle` rule.
14. **Magic wand.** FEATURE_MAP §5 lists a zoom-bar "Magic wand" with "same action". The only wand in
    the code is the **Auto** layout-mode icon (and the Auto profile entry); there is no canvas
    auto-arrange action. Confirm the intended action before building it.
15. **Dock "Studio" setting.** DATA_MODEL §7 puts "Studio (inspector position)" under General. It
    is a `localStorage` preference (`studio.layout`), not a config field: keep it Browser-level.
