# Widget (Module) Catalog

Status: **reference** — the source of truth for what the studio's widget
picker shows and what the kiosk can render. The design decisions live in
`studio-redesign-zones-widgets.md`; this file is the plain index of the
`modules/` registry (`src/modules/index.ts`).

## How the picker works

- The picker (the studio's Library) lists modules by their **`title`** — that
  is what the user sees and searches for — filed under a category chip:
  System, Hardware, Storage, Network, Media, Audio, Info, Gaming or Generic
  (plus Layouts and My panels for panels). The **`id`** is what the config
  stores (`Placement.module`), and what tools like `swap-*.ps1` use.
- The Library lists the 50 **template widgets** below. The legacy ids in "All
  modules" keep loading and rendering, but each is hidden from the Library
  (`libraryHidden`): the template that draws it is what a new zone gets.
- Every module claims a set of sensor keys via `matches(key)`; keys no
  module claims fall through to the **Other sensors** catch-all (the `CARDS`
  panel).
- The picker shows each module's **min footprint** (`minCols × minRows`
  grid cells); a zone larger than the minimum gets the fluid-fill treatment
  (spec, Decision 5).

## Library widgets (templates)

Every template widget is a component in `src/widgets/` drawn inside the shared
shell and registered through `templateModule` (`src/widgets/registry/a.ts` –
`e.ts`, one group per category family). The id is the template's name; the
minimum footprint comes from its `meta.minSize`. All of them take the standard
block and the Look keys (skin, variant, graph, meter, compact view), listed
in [widget-settings.md](widget-settings.md); the options of each are in the
inspector's Content tab.

| Category | Widgets (id · minimum) |
|---|---|
| System | `SystemOverview` 1×1, `SystemStatus` 1×1, `Vitals` 1×1, `KpiTiles` 1×1, `Uptime` 1×1, `ProcessList` 1×1, `ServiceHealth` 1×1, `MenuBar` 2×1, `StatusTracker` 2×1 |
| Hardware | `CpuMonitor`, `CoreHeatmap`, `GpuMonitor`, `GpuRings`, `MemoryUsage`, `Thermals`, `PowerDraw`, `Fans` (all 1×1) |
| Storage | `DriveSpace`, `StorageHealth`, `DiskIO` (all 1×1) |
| Network | `NetworkThroughput`, `NetworkAdapters` (both 1×1) |
| Media | `NowPlaying` 1×1 |
| Audio | `AudioMeter`, `MeterBridge`, `VolumeMixer`, `Visualizer`, `WaveLink` (all 1×1) |
| Info | `Clock`, `Calendar`, `Weather`, `Forecast` (all 1×1); `Departures`, `Notifications`, `TextFile` (all 2×1) |
| Gaming | `FpsMonitor`, `GameSpotlight`, `PlaytimeShare`, `SteamProfile`, `Achievements`, `SteamLibrary`, `SteamNews` (all 1×1); `FramePacing`, `OsdStrip`, `SteamGame` (all 2×1) |
| Generic | `SensorValue`, `SensorGroup` (both 1×1), `Bluetooth` 2×1, `StreamDeck` 3×2, `WebPage` 4×2 |

44 of these came from the widget handoff (`docs/redesign/widgets/`);
`Departures`, `Notifications`, `TextFile`, `Bluetooth`, `StreamDeck` and
`WebPage` were written for the plugin cards that had no template, in the same
style. The Other sensors zone (below) draws one `SensorValue` card per unclaimed key. A template reads its sensors
through the data adapter (below). `Clock`, `Calendar`, `WebPage` and
`WaveLink` need no sensor key; the others render nothing until a key under
their prefixes exists (the kiosk then hides the zone) and show their own
empty state when only some readings are missing.

## Legacy modules (saved zones)

Each id below is a stored widget type from before the library. It keeps its
id, title, minimum size, its own settings array (key for key) and its
defaults, and renders through the template in the last column.

| id | Picker name | Min | Data source (sensor key prefix) | Options | Template |
|---|---|---|---|---|---|
| `systemmodern` | [System (modern)](system-widget.md) | 2×1 | `system.cpu.*`, `system.ram.*`, `libre.*` | standard block + Devices (CPU/GPU/RAM/Disks) · VRAM · Temperatures · Power · GPU clock · Memory used/total · Hardware names · GPU hotspot · GPU fans · GPU memory clock · GPU power % of limit · RAM page file · CPU threads (heatmap/bars) · Drive temperature / read-write / life · Drive filter · Trend sparklines · Sparkline length · Thresholds (temperature warn/critical, load warn/critical, VRAM/drive-full warn) · Units & labels (°C/°F, decimals, per-device labels) · per-device colors |
| `spotifymodern` | Spotify (modern) | 2×1 | `spotify.*`, `plugins.spotify-plugin.*` | standard block + Tint · Times · Progress |
| `mediamodern` | Media (modern) | 2×1 | `plugins.media-plugin.*` | standard block + Tint · Times · Progress |
| `steammodern` | Steam (modern) | 2×1 | `plugins.InfoPanel.SteamAPI.*` | standard block + Dim banner · Stats · News line |
| `weathermodern` | Weather (modern) | 3×1 | `plugins.yr-weather-plugin.*` | standard block + Tint · Stats · Forecast · Feels-like · Forecast days · View (full/now/forecast/minimal) |
| `fpsmodern` | FPS (modern) | 2×1 | `plugins.InfoPanel.RTSS.*`, `plugins.fps-plugin.*` | standard block + Extra metrics · Trend sparkline · View (gauge/trend) |
| `hardwaremodern` | Hardware (modern) | 2×1 | `libre.*`, `hwinfo.*` | standard block + Max rows (0 = all) · View (list/temps) · Fan readings |
| `audiomodern` | Audio (modern) | 2×1 | `plugins.audio-level-meter.*` | standard block + Details · Source (device) · Volume · Mute · View (meter/audiometer/volume) |
| `wavelinkmodern` | Wave Link (modern) | 2×1 | none (reads `plugins.wavelink-plugin.wavelink.*` through the shared `wavelink` client) | standard block + Meters to show · Meter style · Meter orientation · Meter response · dB readouts & scale · Fader level · Mixes · Live / muted colors |
| `bluetoothmodern` | Bluetooth (modern) | 2×1 | `plugins.bluetooth-battery-plugin.*` | standard block + Status · Devices · Battery · View (full/devices/status) |
| `networkmodern` | Network (modern) | 2×1 | `libre.ethernet_*` | standard block + Session totals · Trend sparkline · View (speeds/totals) |
| `vbz` | Departures | 2×1 | `plugins.InfoPanel.VBZ.*` | Status line |
| `notifications` | Notifications | 2×1 | `plugins.InfoPanel.Notifications.*` | History list · Max history lines |
| `textfile` | Text File | 2×1 | `plugins.InfoPanel.TextFile.*` | Size / lines / status header |
| `streamdeck` | Stream Deck | 3×2 | `plugins.InfoPanel.StreamDeck.*` | Active profile · Button labels |
| `webpage` | Web Page | 4×2 | none (config only) | URL (embedded in an iframe) |
| (catch-all) | Other sensors | 4×2 | any key no module claims | — (generic cards) | SensorValue per key |

"standard block" = what every widget adopts (preset / layout / surface /
custom title / icon / accent / background image + use-as-background, size,
spacing, type, border and effects, and the Look keys — see
`widget-settings.md`), plus the widget's own options. The Template column is
read from the code: `hardwaremodern` shows `Thermals` in its temps view and
`SensorGroup` in the list view.

## The widget shell

Eleven of the legacy ids are the adaptive "modern" widgets: `spotifymodern`,
`mediamodern`, `weathermodern`, `steammodern`, `systemmodern`, `fpsmodern`,
`hardwaremodern`, `audiomodern`, `bluetoothmodern`, `networkmodern`,
`wavelinkmodern` — each is the sole version of its widget (the classic
counterparts were retired in the 2026-10-09 cleanup) and now a thin alias of a
template. The whole library shares one design system, in `src/widgets/core/`:

- **Adaptive layout.** The `<Widget>` shell measures its zone (ResizeObserver)
  and gives the widget a size tier — `xs` under 220×140 px, `sm` under 340×210,
  `md` under 500×320, `lg` above — and a shape from the grid span: `tile`
  (1×1), `strip` (wide and short), `column` (narrow and tall) or `box`. Each
  widget lays itself out from the tier, the shape and its inner size.
  (`layout = auto` is the default; forcing card / standard / compact / simple
  fixes the tier to `lg` / `md` / `sm` / `xs`, and the shape stays measured.)
- **Compact views.** Most widgets supply a compact summary for a tile, strip or
  column, so a 1×1 zone shows one headline value, not a squeezed layout. The
  `compactView: off` look key keeps the full layout. The **studio** variant is
  a second, denser summary of the same data.
- **Skins and surfaces.** 14 skins and a surface registry. `glass`
  (default, translucent blur), `matte-light`, `matte-dark` and `theme` are the
  app's materials and mean what they always did; the registry adds the skins'
  own. A skin chosen with no saved surface brings its own.
- **Tinting.** Now Playing tints the surface from the cover art's dominant
  color (`useArtTint`, sampled on a tiny canvas; cross-origin art degrades to
  an untinted surface); weather tints from the current condition; Game
  Spotlight uses the game banner as the background.
- **Data adapter.** A template reads `Record<string, string>`; the module
  factory builds it from the sensor map (`toFlat`, `src/widgets/data-adapter.ts`)
  on the page's one shared stream. Sensor display names come with it (`toNames`),
  so auto-discovered rows are labelled by the sensor, not its key.
- **Options.** Every module declares a `settings` schema
  (`ModuleSetting[]`); values are stored **per placement**
  (`Placement.settings`) and merged over the defaults at render time via
  `effectiveSettings`. The studio's inspector renders the schema generically.
  Each template's own options sit after `STANDARD_SETTINGS` (preset / layout /
  surface / custom title / icon / accent / background image, size, spacing,
  type, border and effects, Look); full reference in `widget-settings.md`.
  A template's stored keys are the legacy ones where a legacy widget had them.
- **No-data behavior.** A template whose sensors are all missing renders
  nothing (`templateModule` checks the prefixes), so the kiosk hides the zone
  and the studio says there is no live data yet; once a key exists the widget
  draws its own empty state.

### Data keys read by each legacy widget

- **systemmodern** (`SystemOverview` template) — loads from `system.cpu.load` and
  `system.ram.load`; the rest from LibreHardwareMonitor, found by key suffix
  and unit because the keys carry the hardware name
  (`src/lib/system-metrics.ts`): GPU `_gpu_core_load`, `_gpu_core` (°C),
  `_gpu_package` (W), `_gpu_core_clock`, VRAM `_gpu_memory` (%),
  `_gpu_memory_used` / `_gpu_memory_total` (MB); CPU `_cpu_total`,
  `_core__tctl_tdie` or `_cpu_package` (°C), `_package` (W); RAM
  `total_memory_memory_used` / `_available` (GB). Extras: per-thread CPU load
  `_cpu_core__N` (%), GPU `_gpu_memory_junction` (hotspot), `_gpu_fan_N` (RPM) /
  `_gpu_fan_N_control` (%), `_gpu_memory_clock`, `_gpu_power` (% of limit), page
  file `virtual_memory_memory_used` / `_available` / `virtual_memory_memory`.
  Drives, one per `<drive>_used_space` (%): `_temperature__N` (else
  `_composite_temperature`), `_read_rate` / `_write_rate` (KB/s), `_life`,
  `_total_space` / `_free_space` (GB); the doubled `_load` / `_data` variants
  are ignored. Temperatures and power that read 0 count as unreadable and are
  hidden; the first GPU wins.
- **fpsmodern** (`FpsMonitor` template) — RTSS: `fps`, `1% low fps`, `current frame
  time`, `gpu-name`, `resolution`, `refreshrate`, `windowtitle`,
  `graphics-api`, `display-mode`, `benchmark-mode`; fps-plugin: `fps`,
  `1% low fps` / `1% low`, `0.1% low`, `current frame time` / `frame time`,
  `gpu-name`, `gpu utilization`, `gpu busy`, `cpu busy`, `display latency`,
  `refreshrate`, `resolution`, `windowtitle`.
- **hardwaremodern** (`SensorGroup` auto / `Thermals` templates) — every live `libre.*` / `hwinfo.*`
  entry (LibreHardwareMonitor / HWiNFO exports); rows are kind-dotted
  (temp / fan / power first), capped by the `maxRows` option. The "temps"
  view is the `Thermals` template: the top four temperature readings as arc
  gauges plus a fan-reading chip row.
- **networkmodern** (`NetworkThroughput` template) — `libre.ethernet_*`
  (LibreHardwareMonitor): `download_speed` / `upload_speed` (bytes/s →
  formatted rate), `data_downloaded` / `data_uploaded` (session totals),
  `network_utilization` (0–100). Optional rolling speed sparklines.
- **audiomodern** (`AudioModern`: AudioMeter / MeterBridge / VolumeMixer by `view`) — `plugins.audio-level-meter.*`,
  grouped by container (device). Entries are resolved by **stable key
  suffix** — `audio-level`, `peak-level`, `rms-level`, `left-channel`,
  `right-channel`, `device-name` — because the plugin decorates its display
  names ("🎵 {device} · Level"), so name lookups miss; legacy plain names
  (`Level`, `Peak`, …) are the fallback. `Level` is a bar (red > 85%),
  peak/RMS are dB. The `default-audio` container (the active default
  device) is labelled "Default device" so it doesn't read as a duplicate of
  that device's own container. The optional `source` setting binds the
  widget to one device (`""` = show all).
- **bluetoothmodern** (`Bluetooth` template, `src/widgets/Bluetooth.tsx`) —
  `plugins.bluetooth-battery-plugin.*`: the status container (the one with
  a `.bt_status` key) gives the status line; every other container is a
  paired device (`Name`, `Status`, `Battery Level` → green/amber/red bar).
- **spotifymodern** (`NowPlaying` template) — `spotify.track` /
  `spotify.artist` / `spotify.art` / `spotify.progress` /
  `spotify.playing`, falling back to `plugins.spotify-plugin.spotify.*`
  equivalents.
- **mediamodern** (`NowPlaying` template) — `plugins.media-plugin.media.*`:
  `current-track`, `artist`, `cover-art`, `track-progress`,
  `elapsed-time`, `remaining-time`, `playback-state` (= 2 → playing).
- **weathermodern** (`Weather` template) — `plugins.yr-weather-plugin.*`:
  `name`, `temp`, `feels_like`, `weather_desc`/`weather`, `humidity`,
  `pressure`, `wind_speed`, `wind_gust`, `wind_deg`, `rain`, `snow`,
  `last_refreshed`, `weather_icon`; forecast from the yr
  plugin's `forecast` (multi-day lines, starting tomorrow).
- **steammodern** (`GameSpotlight` template, composite mode) — `plugins.InfoPanel.SteamAPI.`:
  Profile (`player-name`, `online-status`, `steam-level`,
  `profile_image_url`, `current_game_banner_url`, `game_logo_url`,
  `game_icon_url`), Session (`current-game`, `current-game-playtime`,
  `current-session-time`, `session-start-time`), Library (`total-games`),
  Achievements (`current-achievements`, `latest-achievement`,
  `latest-achievement-icon`), Social (`friends-online`,
  `total-friends`), News (`current_game_news_title`). Image keys are
  validated with `isImageUrl` before use.

## Naming conventions

- Template widgets: the id is the PascalCase template name (`CpuMonitor`), the
  picker title its `meta.name` ("CPU Monitor").
- Legacy modules keep `<name>modern` ids and the picker title "**Name
  (modern)**"; they are hidden from the Library.
- Exception: `fpsmodern` is titled **"FPS (modern)"** (was
  "Performance (modern)") so the FPS widget is findable in the picker —
  picker search is by title (2026-10-08, commit `49084f8`).
- New data-source widgets are built as templates: a component over flat data
  plus a `templateModule` registration (see below).

## Adding a new module

1. Create the component in `src/widgets/<Name>.tsx`: export `meta`
   (`id`, `name`, `category`, `icon`, `prefixes`, `defaultSize`, `minSize`,
   `description`) and a component that renders `<Widget {...shell(p)}>` over
   the flat `data` it receives. Take sizes from the tier, shape and inner box
   the shell passes; supply `compact` and `studio` descriptors for the small
   views.
2. Register it in the matching group in `src/widgets/registry/` with
   `templateModule({ meta, Component, settings, toProps })`: `settings` are
   the widget's own options after the standard block, `toProps` maps the
   stored settings to props. `src/widgets/registry.ts` collects the groups and
   `modules/index.ts` appends them to the registry — the studio Library, the
   kiosk, and the claimed-key rules pick them up from there.
3. Add a test next to the registry group and typecheck, test and build (see
   `development.md`); then look at it in `?widget-qa` (see
   [architecture.md](architecture.md#qa-harness)) and in a real zone via the
   kiosk.

A module outside the library (a plain `DashboardModule` with its own
`render(sensors, settings)` returning a component) is still possible, but
nothing in the repo is built that way any more: the shell is what gives a
widget skins, variants and the standard look.

For a template, the standard block and the Look keys come for free;
`widget-settings.md` → "Adopting the standard block" has the details.
