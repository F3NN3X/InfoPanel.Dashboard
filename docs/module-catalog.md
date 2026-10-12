# Widget (Module) Catalog

Status: **reference** — the source of truth for what the studio's widget
picker shows and what the kiosk can render. The design decisions live in
`studio-redesign-zones-widgets.md`; this file is the plain index of the
`modules/` registry (`src/modules/index.ts`).

## How the picker works

- The picker lists modules by their **`title`** — that is what the user sees
  and searches for. The **`id`** is what the config stores
  (`Placement.module`), and what tools like `swap-*.ps1` use.
- Every module claims a set of sensor keys via `matches(key)`; keys no
  module claims fall through to the **Other sensors** catch-all (the `CARDS`
  panel).
- The picker shows each module's **min footprint** (`minCols × minRows`
  grid cells); a zone larger than the minimum gets the fluid-fill treatment
  (spec, Decision 5).

## All modules

| id | Picker name | Min | Data source (sensor key prefix) | Options |
|---|---|---|---|---|
| `systemmodern` | [System (modern)](system-widget.md) | 2×1 | `system.cpu.*`, `system.ram.*`, `libre.*` | modern set + Devices (CPU/GPU/RAM/Disks) · VRAM · Temperatures · Power · GPU clock · Memory used/total · Hardware names · GPU hotspot · GPU fans · GPU memory clock · GPU power % of limit · RAM page file · CPU threads (heatmap/bars) · Drive temperature / read-write / life · Drive filter · Trend sparklines · Sparkline length · Thresholds (temperature warn/critical, load warn/critical, VRAM/drive-full warn) · Units & labels (°C/°F, decimals, per-device labels) · per-device colors |
| `spotifymodern` | Spotify (modern) | 2×1 | `spotify.*`, `plugins.spotify-plugin.*` | modern set + Tint · Times · Progress |
| `mediamodern` | Media (modern) | 2×1 | `plugins.media-plugin.*` | modern set + Tint · Times · Progress |
| `steammodern` | Steam (modern) | 2×1 | `plugins.InfoPanel.SteamAPI.*` | modern set + Dim banner · Stats · News line |
| `weathermodern` | Weather (modern) | 3×1 | `plugins.yr-weather-plugin.*` | modern set + Tint · Stats · Forecast · Feels-like · Forecast days · View (full/now/forecast/minimal) |
| `fpsmodern` | FPS (modern) | 2×1 | `plugins.InfoPanel.RTSS.*`, `plugins.fps-plugin.*` | modern set + Extra metrics · Trend sparkline · View (gauge/trend) |
| `hardwaremodern` | Hardware (modern) | 2×1 | `libre.*`, `hwinfo.*` | modern set + Max rows (0 = all) · View (list/temps) · Fan readings |
| `audiomodern` | Audio (modern) | 2×1 | `plugins.audio-level-meter.*` | modern set + Details · Source (device) · Volume · Mute · View (meter/audiometer/volume) |
| `wavelinkmodern` | Wave Link (modern) | 2×1 | none (reads `plugins.wavelink-plugin.wavelink.*` through the shared `wavelink` client) | modern set + Meters to show · Meter style · Meter orientation · Meter response · dB readouts & scale · Fader level · Mixes · Live / muted colors |
| `bluetoothmodern` | Bluetooth (modern) | 2×1 | `plugins.bluetooth-battery-plugin.*` | modern set + Status · Devices · Battery · View (full/devices/status) |
| `networkmodern` | Network (modern) | 2×1 | `libre.ethernet_*` | modern set + Session totals · Trend sparkline · View (speeds/totals) |
| `vbz` | Departures | 2×1 | `plugins.InfoPanel.VBZ.*` | Status line |
| `notifications` | Notifications | 2×1 | `plugins.InfoPanel.Notifications.*` | History list · Max history lines |
| `textfile` | Text File | 2×1 | `plugins.InfoPanel.TextFile.*` | Size / lines / status header |
| `streamdeck` | Stream Deck | 3×2 | `plugins.InfoPanel.StreamDeck.*` | Active profile · Button labels |
| `webpage` | Web Page | 4×2 | none (config only) | URL (embedded in an iframe) |
| (catch-all) | Other sensors | 4×2 | any key no module claims | — (generic cards) |

"modern set" = the **standard block** every adaptive widget below adopts
(preset / layout / surface / custom title / icon / accent / background
image + use-as-background — see `widget-settings.md`), plus the widget's
own options.

## The modern widget family

Eleven adaptive modules: `spotifymodern`, `mediamodern`, `weathermodern`,
`steammodern`, `systemmodern`, `fpsmodern`, `hardwaremodern`, `audiomodern`,
`bluetoothmodern`, `networkmodern`, `wavelinkmodern` — each is the sole version of its
widget (the classic counterparts were retired in the 2026-10-09 cleanup).

Shared design system (helpers exported from
`components/ModernNowPlaying.tsx`: `makeSurface`, `useArtTint`, `RGB`,
`Surface`; `useElementSize` lives in `hooks/use-element-size.ts` and is
re-exported there; style helpers are in `components/widget-style.ts`):

- **Adaptive layout.** Each component measures its zone (ResizeObserver) and
  `pickVariant` picks one of four:
  1. `h ≤ 72` → **compact** (one pill)
  2. `w < 300 && h < 150` → **simple**
  3. `h ≥ w × 0.72` → **card** (tall/portrait)
  4. else → **standard** (wide)

  (`Layout = auto` is the default; forcing a layout is a per-placement
  option, and a forced layout skips the measurement.)
- **Surfaces.** `glass` (default, translucent blur) / `matte-light` /
  `matte-dark`, via `makeSurface`.
- **Tinting.** Media/spotify tint the surface from the cover art's dominant
  color (`useArtTint`, sampled on a tiny canvas; cross-origin art degrades
  to an untinted surface); weather tints from the current condition; steam
  uses the game banner as the background instead.
- **Options.** Every module declares a `settings` schema
  (`ModuleSetting[]`); values are stored **per placement**
  (`Placement.settings`) and merged over the defaults at render time via
  `effectiveSettings`. The studio's inspector renders the schema
  generically (`SettingsPanel`). The modern family all spreads the shared
  `STANDARD_SETTINGS` block (preset / layout / surface / custom title /
  icon / accent / background image + use-as-background) and renders it with
  the shared `ModernChrome` layer — full reference in `widget-settings.md`.
- **No-data behavior.** A module whose sensors are all empty renders
  `null` — the zone stays blank, no placeholder.

### Data keys read by each modern widget

- **systemmodern** (`ModernSystem`) — loads from `system.cpu.load` and
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
- **fpsmodern** (`ModernFps`) — RTSS: `fps`, `1% low fps`, `current frame
  time`, `gpu-name`, `resolution`, `refreshrate`, `windowtitle`,
  `graphics-api`, `display-mode`, `benchmark-mode`; fps-plugin: `fps`,
  `1% low fps` / `1% low`, `0.1% low`, `current frame time` / `frame time`,
  `gpu-name`, `gpu utilization`, `gpu busy`, `cpu busy`, `display latency`,
  `refreshrate`, `resolution`, `windowtitle`.
- **hardwaremodern** (`ModernHardware`) — every live `libre.*` / `hwinfo.*`
  entry (LibreHardwareMonitor / HWiNFO exports); rows are kind-dotted
  (temp / fan / power first), capped by the `maxRows` option. The "temps"
  view renders the top four temperature readings as 270° arc gauges
  (`ArcGauge` / `tempColor` / `tempWord`) plus a fan-reading chip row.
- **networkmodern** (`NetworkThroughput` template) — `libre.ethernet_*`
  (LibreHardwareMonitor): `download_speed` / `upload_speed` (bytes/s →
  formatted rate), `data_downloaded` / `data_uploaded` (session totals),
  `network_utilization` (0–100). Optional rolling speed sparklines.
- **audiomodern** (`ModernAudio`) — `plugins.audio-level-meter.*`,
  grouped by container (device). Entries are resolved by **stable key
  suffix** — `audio-level`, `peak-level`, `rms-level`, `left-channel`,
  `right-channel`, `device-name` — because the plugin decorates its display
  names ("🎵 {device} · Level"), so name lookups miss; legacy plain names
  (`Level`, `Peak`, …) are the fallback. `Level` is a bar (red > 85%),
  peak/RMS are dB. The `default-audio` container (the active default
  device) is labelled "Default device" so it doesn't read as a duplicate of
  that device's own container. The optional `source` setting binds the
  widget to one device (`""` = show all).
- **bluetoothmodern** (`ModernBluetooth`) —
  `plugins.bluetooth-battery-plugin.*`: the status container (the one with
  a `.bt_status` key) gives the status line; every other container is a
  paired device (`Name`, `Status`, `Battery Level` → green/amber/red bar).
- **spotifymodern** (`ModernNowPlaying`) — `spotify.track` /
  `spotify.artist` / `spotify.art` / `spotify.progress` /
  `spotify.playing`, falling back to `plugins.spotify-plugin.spotify.*`
  equivalents.
- **mediamodern** (`ModernNowPlaying`) — `plugins.media-plugin.media.*`:
  `current-track`, `artist`, `cover-art`, `track-progress`,
  `elapsed-time`, `remaining-time`, `playback-state` (= 2 → playing).
- **weathermodern** (`ModernWeather`) — `plugins.yr-weather-plugin.*`:
  `name`, `temp`, `feels_like`, `weather_desc`/`weather`, `humidity`,
  `pressure`, `wind_speed`, `wind_gust`, `wind_deg`, `rain`, `snow`,
  `last_refreshed`, `weather_icon`; forecast from the yr
  plugin's `forecast` (multi-day lines, starting tomorrow).
- **steammodern** (`ModernSteam`) — `plugins.InfoPanel.SteamAPI.`:
  Profile (`player-name`, `online-status`, `steam-level`,
  `profile_image_url`, `current_game_banner_url`, `game_logo_url`,
  `game_icon_url`), Session (`current-game`, `current-game-playtime`,
  `current-session-time`, `session-start-time`), Library (`total-games`),
  Achievements (`current-achievements`, `latest-achievement`,
  `latest-achievement-icon`), Social (`friends-online`,
  `total-friends`), News (`current_game_news_title`). Image keys are
  validated with `isImageUrl` before use.

## Naming conventions

- Modern modules: `<name>modern` id, picker title "**Name (modern)**".
- Exception: `fpsmodern` is titled **"FPS (modern)"** (was
  "Performance (modern)") so the FPS widget is findable in the picker —
  picker search is by title (2026-10-08, commit `49084f8`).
- New data-source modules are built modern-first: spread
  `STANDARD_SETTINGS` into `settings` and adopt the shared `ModernChrome`
  surface (see "Adding a new *modern* (adaptive) module" below).

## Adding a new module

1. Create `src/modules/<name>.tsx`: `id`, `title`,
   `minCols` / `minRows`, `matches(key)` (the sensor-key claim), optional
   `settings` schema, `render(sensors, settings)` returning the component
   (or `null` when there is no live data).
2. Register it in `modules/index.ts` — the studio picker, the kiosk, and
   `claimedKeys` pick it up from there.
3. Typecheck, test and build (see `development.md`); verify in the studio
   picker, then in a real zone via the kiosk.

### Adding a new *modern* (adaptive) module

For a new adaptive widget, on top of the above:

1. Spread `STANDARD_SETTINGS` into `settings` (preset / layout / surface /
   custom title / icon / accent / background), then the module's own options.
2. Build the component's `chrome` prop from resolved settings with
   `chromeOf(cfg)` and wrap the body in `<ModernChrome chrome={chrome}>`
   (keep the measuring `ref` on the outer div).
3. Opt accent-sensitive elements in with `var(--wp-accent, <default>)`.

That gives the widget the full standard advanced-settings surface for free.
The three steps in detail: `widget-settings.md` → "Adopting the standard
block".
