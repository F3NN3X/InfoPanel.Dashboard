# Studio Redesign — One Studio, Draw Zones, Fill with Widgets

> Historical: these notes predate the current studio layout (top bar, left rail and drawers, tabbed inspectors, undo, shortcuts) — see the [customization guide](customization-guide.md) and [architecture](architecture.md#4-kiosk-and-studio) for how it works now.

Status: **implemented** (phases 1–3 landed 2026-10-08, see Decisions at the
bottom). This document is the spec for the zone-based studio; the fluid-fill
and widget-options rules below were added as the work landed.
Supersedes the "unified StudioView dispatcher" design (commit `45e9787`), which
left two full editors (grid + free-canvas) side by side.

Note: the decisions below record the state as it landed. The classic
(non-modern) widget modules have since been retired (2026-10-09 cleanup) —
the modern modules are now the sole version of each widget.

Related: `module-catalog.md` is the plain index of the widget registry
(every module's id, picker name, min footprint, data source, options) —
this document is the *why*, the catalog is the *what*.

## Why simplify

We now have two studio apps:

- **Grid studio** — a `MonitorProfile` (size + columns) with placements that
  *auto-flow* into the grid; modules/panels are appended or dragged in.
- **Free-canvas studio** — the 1:1 InfoPanel model (`IPProfile`): absolute
  coordinates, 14 item kinds, groups, per-item typography, its own inspector,
  ops (mapInList, z-order, detach…), its own chrome/selection layer.

Two data models, two editors, two inspects, two sets of ops. The free-canvas
model was built to *recreate* the InfoPanel app 1:1 — but the grid model's
`arcv2` profile already delivers that look (dark cards, panels, live data),
and the kiosk renders it fine. The second model costs real maintenance for
little gained.

**Goal: ONE studio.** Building a dashboard is a four-step flow:

1. **New** — click New, set the size (e.g. 1920×550).
2. **Blank canvas** — a grid canvas (columns × rows), nothing else.
3. **Draw zones** — drag a rectangle over the grid to carve out a region
   (biomes-style: you draw areas, then assign things to them — we assign
   *widgets* instead of apps).
4. **Fill zones** — select a zone, pick a predefined widget (a 3×2 zone fits
   a Media/Spotify widget; resize the zone to 2×2 or 1×1 and the widget
   reflows to fit).

Plus a **Simple / Advanced** split: Simple offers the pre-designed widgets and
zone drawing only; Advanced adds per-widget editing.

## Core model

```
Profile  = width × height (px), cols, rows, fit ("fill" | "scroll")
Zone     = { id, colStart, rowStart, colSpan, rowSpan, visible, widget }
Widget   = module (registry) | panel (group of atomic widgets) | blank
```

Mapping to code that already exists:

| Concept  | Existing code                                   | Change needed |
|---|---|---|
| Profile | `MonitorProfile` (`layout.ts`)                  | add `rows: number` |
| Zone    | `Placement` (`colStart/rowStart/colSpan/rowSpan` already exist) | make explicit position/size *required*; stop auto-flow |
| Widget  | `Placement.module` (registry id) + `Placement.panel` (`PanelDef`) | nothing — widgets already fill their container (wrap / grid / overlay layouts) |
| Catalog | `modules/` (14 modules) + `panelPresets` (System, RAM, CPU, GPU, FPS, Steam, Weather, Network, Clock) | add a **min footprint** per widget (`minCols × minRows`) |
| Data    | sensor binding per widget (`Widget.sensor`), bridge SSE | unchanged |

A zone is a `Placement` with an explicit grid box; a widget is its content.
Resizing a zone just changes the box — the widget re-renders to fit (panels
already flow/grid/overlay inside their container, modules scale to their cell).
That is exactly the "3×2 → 2×2 → 1×1 and the widget transforms" behavior.

### Grid cells

- `cols` (existing, e.g. 12) + **`rows` (new, e.g. 4)** → uniform cell size
  `width/cols × height/rows` (1920×550/12×4 → 160×137).
- Studio canvas renders the grid explicitly (`repeat(cols, 1fr) × repeat(rows, 1fr)`);
  rulers stay on the edges.
- `fit: "fill"` = canvas is exactly the viewport (kiosk strip); `fit: "scroll"`
  = fixed cell height, page scrolls (normal displays).
- Row count is a profile setting, not derived magic — the user can change it
  (zones are clamped into the new bounds on change).

### Zone rules

- Zones are **drawn** by dragging over cells (biomes-style), then moved and
  resized by dragging handles — no auto-flow, no append button.
- **No overlap** (decided): a draw/move/resize that collides is clamped
  to the free cells. Overlap is a layout bug in a dashboard, not a feature.
- A zone can be **blank** (no widget) — drawing the region first, filling
  later.

## Simple vs Advanced

One data model, one editor; the modes gate *what is exposed*:

| Capability | Simple | Advanced |
|---|---|---|
| New profile (size, cols, rows) | ✓ | ✓ |
| Draw / move / resize / delete zones | ✓ | ✓ |
| Widget palette (pre-designed widgets, min footprint shown) | ✓ | ✓ |
| Assign / unassign widget to a zone | ✓ | ✓ |
| Theme presets + colors | ✓ | ✓ |
| Kiosk pin (which profile the borderless window opens) | ✓ | ✓ |
| Per-widget editing (widgets inside a panel, sensor binding, fonts, colors, layout, decimals…) | — | ✓ |
| Module-level settings (e.g. Steam library limits) | — | ✓ |

A toggle in the studio header. Simple mode is what a user who "just wants a
dashboard" touches; Advanced is where power users tune individual widgets.

## Widget catalog (pre-designed)

Start from what exists, curated. Each entry gets a **min footprint**
(`minCols × minRows`) and a default widget/panel seeded for it:

| Widget | Min | Seed |
|---|---|---|
| Clock | 1×1 | panel preset `clock` |
| Stat / value | 1×1 | single `stat` widget (bind a sensor) |
| Media / Spotify | 2×1 | module `spotify` (or `media`) |
| RAM | 2×2 | panel preset `ram` |
| CPU | 2×2 | panel preset `cpu` |
| GPU | 3×2 | panel preset `gpu` |
| FPS gauges | 3×2 | panel preset `fps` |
| Steam | 3×2 | panel preset `steam` |
| Weather | 4×2 | panel preset `weather` |
| Network | 2×2 | panel preset `network` |
| System | 4×2 | panel preset `system` |
| Now Playing / Audio / Bluetooth / Departures / Notifications / Text file / Stream Deck / Other sensors | 2×1–3×2 | registry modules, as today |

Rules: a widget renders in *any* zone ≥ its min. **Fluid fill** (the zone
border is the truth): the widget's container stretches to fill the whole zone
— content uses the space (cards center their content, lists scroll inside the
zone, cover art scales with the zone height), with no empty padding and no
down-scaling. If the content is bigger than the zone, it clips at the zone's
edge (the accepted trade-off of zone-borders-as-truth). At min footprint the
widget is the reference design; larger zones get proportionally more space.
Widgets are the *same* widget regardless of mode; Advanced just lets you open
them up.

## Widget options (per-element show / hide)

Each module can declare a `settings` schema (`ModuleSetting[]` on
`DashboardModule`): labeled options with a type (`boolean` toggle, `number`
slider/field, `select`/segmented, `color`, `text`), a default, and — for
selects/numbers — bounds/options. The studio's Advanced inspector renders the
schema generically (`SettingsPanel`), and values are stored **per placement**
(`Placement.settings`), merged over the module's defaults at render time via
`effectiveSettings` — so two zones with the same widget can carry different
options.

The options exist to show/hide a widget's elements, not to restyle it:

| Module | Options |
|---|---|
| system | System load card · RAM card · Bridge status card |
| systemmodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Bridge status |
| spotify | Compact bar · Cover art · Album line |
| spotifymodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Tint from cover art · Times · Progress |
| media | Cover art · Playback details · Source app |
| mediamodern | same as spotifymodern (adds elapsed/remaining times) |
| steam | Profile · Current game · Library & social · News |
| steammodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Dim banner for text · Stats · News line |
| weather | Conditions card · Forecast card · Forecast days (1–7) |
| weathermodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Tint from conditions · Stats row · Forecast strip · Forecast days (1–7) |
| fps | Layout (cards / gauges) · Extra metrics |
| fpsmodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Extra metrics |
| audio | Peak / RMS & L/R/volume details |
| audiomodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Peak / RMS & L/R/volume details |
| bluetooth | Bluetooth status |
| bluetoothmodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Bluetooth status |
| hardware | Max rows (0 = all) |
| hardwaremodern | Layout (auto / card / standard / compact / simple) · Surface (glass / matte light / matte dark) · Max rows (0 = all) |
| streamdeck | Active profile · Button labels |
| textfile | Size / lines / status header |
| notifications | History list · Max history lines |
| vbz | Status line |

Custom-panel widgets have their own per-widget options in `PanelInspector`
(visible/hide, sensor binding, layout zones, decimals, colors), and the
`CARDS` catch-all renders the remaining unclaimed sensors as generic cards.

### Modern now-playing widgets (`spotifymodern` / `mediamodern`)

A fresh take on Now Playing / Media built to the fluid-fill rule instead of
retro-fitting the classic cards. One component (`ModernNowPlaying`) measures
its zone (ResizeObserver) and picks the layout that fits:

- **card** — tall/portrait zones: big cover art on top, centered title/artist,
  progress bar with times at the bottom
- **standard** — wide zones: art on the left, title/artist, progress row
  with elapsed/remaining
- **compact** — very short zones: full-width pill whose fill *is* the
  progress, play/pause state, title + artist on one line
- **simple** — small zones: small art + stacked title/artist/times

The surface tints from the cover art's dominant color (sampled on a tiny
canvas; cross-origin art degrades gracefully to an untinted surface) with
three finishes: glass (default), matte light, matte dark. `Layout = auto`
adapts to the zone; forcing a layout is a per-placement option. The classic
`spotify` / `media` modules stay available.

### Modern weather widget (`weathermodern`)

Same treatment for weather (`ModernWeather`, reusing the media widget's
surface builder + size hook). Four layouts picked from the measured zone:

- **card** — tall/portrait zones: location + condition header, big
  temperature with condition glyph centered, stats row (wind ± gust,
  humidity, pressure, precip), day-forecast strip, "updated" line
- **standard** — wide zones: current conditions on the left, horizontal
  day-forecast strip on the right (scrolls when it overflows)
- **compact** — very short zones: one pill (glyph · temp · condition ·
  wind/precip)
- **simple** — small zones: glyph + temp + condition

The surface tints from the **current condition** (sun → amber, rain → blue,
snow → icy, thunder → violet; no canvas involved) in the same three
finishes. The forecast strip parses the yr plugin's multi-day
lines (`"Thu 8 Oct, Light rain, 12 °C / 4 °C, 8.1mm, 4.5 m/s N"`); zero
precipitation is hidden from the stats. The classic `weather` module stays
available.

### Modern Steam widget (`steammodern`)

Same treatment for the SteamAPI data (`ModernSteam`, reusing the media
widget's surface builder + size hook). The **game banner is the widget
background** (object-cover, dimmed with a per-layout gradient for
legibility) and the **transparent game logo is overlaid** on top — the
"last played" card look. Four layouts picked from the measured zone:

- **card** — tall/portrait zones: profile header (avatar · name ·
  status · level), the game logo centered over the banner, big
  total-playtime + session line at the bottom, achievements / friends
  on the right, optional news line
- **standard** — wide zones: profile + logo on the left, big
  total-playtime in the middle, stats (games · friends · achievements)
  on the right
- **compact** — very short zones: one pill (avatar · name · in game ·
  total playtime · key stats)
- **simple** — small zones: avatar + name + game

Image priority: banner (background) → transparent logo → square app
icon (fallback, over the surface finish) → plain title text. When a
game has no banner the surface finish (glass / matte light / matte
dark) is the background. The classic `steam` module stays available.

### Modern data widgets (`systemmodern` / `fpsmodern` / `hardwaremodern` / `audiomodern` / `bluetoothmodern`)

The same adaptive treatment (one component, four layouts picked from
the zone's measured size, glass / matte-light / matte-dark surfaces)
applied to the remaining data modules:

- **systemmodern** (`ModernSystem`) — CPU / RAM ring gauges (value
  inside the ring, colored arcs: CPU blue, RAM green) + the bridge
  status chip. card = two rings side by side, standard = rings +
  status chip, compact = one pill, simple = two mini rings
- **fpsmodern** (`ModernFps`) — a single FPS ring vs. the refresh rate
  (green / amber / red by ratio) with 1% low + frame time around it.
  Reads the same RTSS / PresentMon sources as the classic `fps` module
- **hardwaremodern** (`ModernHardware`) — key `libre.*` / `hwinfo.*`
  readings as a list with kind-colored dots (temp / fan / power),
  temps · fans · power sorted first; card = two columns, standard =
  three, compact = top-4 strip, simple = two rows, a "Max rows" option
  caps the list
- **audiomodern** (`ModernAudio`) — per-device level metering: name +
  big level % + level bar (red when >85%) + peak / L/R / volume
  details; card = stacked rows, standard = side by side, compact /
  simple = inline
- **bluetoothmodern** (`ModernBluetooth`) — the BTData plugin's status
  + paired devices with battery bars (green / amber / red by level);
  card = stacked device rows, standard = status left + device grid,
  compact / simple = inline

All five keep their classic counterparts (`system`, `fps`,
`hardware`, `audio`, `bluetooth`) untouched.

## What happens to the rest

| Piece | Fate |
|---|---|
| Grid studio | **becomes** the studio (renamed concept: "zones"). |
| `FreeCanvasStudio`, `free-inspector.tsx` group manager, `chromeItems`, IP ops (`mapInList`, `detachFromGroup`, `zOrderItem`, …) | **retired** (deleted) |
| `IPProfile` / `IPCanvas` / `.infopanel` import | **retired entirely** (deleted — no read-only import) |
| Kiosk pin (`kiosk.json` = `arcv2-ip`) | re-pin to the `arcv2` grid profile (done — `kiosk.json` now holds `arcv2`) |
| Shipped `arcv2` grid profile + sample profile | kept; they become the "pre-designed dashboards" (the user can also start from one instead of a blank canvas) |
| Two-studio dispatcher (`StudioView` → `GridStudio` / `FreeCanvasStudio`) | collapses to one studio, no dispatch |

## Migration (config v2)

- `config.version: 2`.
- `MonitorProfile` gains `rows` (default 4 for ≤600p strips, 6 for 1080p).
- Existing `placements` (auto-flowed) → keep as zones; their `colStart/rowStart`
  are filled in from the current auto-flow so nothing moves.
- `freeProfiles` (IPProfile) → **dropped** from the saved config (the
  `arcv2-ip` design is already mirrored as the `arcv2` grid profile; the 1:1
  item model is retired entirely — no import path).
- `activeProfile` / `kioskProfileId` pointing at a dropped free profile →
  repoint to `arcv2`.

## Phases (small, verified steps)

1. **Zones**: explicit `rows`, draw/move/resize on the canvas, no auto-flow.
   One studio (grid only) — free-canvas editor removed, dispatcher removed.
2. **Widgets**: min-footprint metadata, widget palette (presets + modules),
   assign to zone, content reflow. Simple/Advanced toggle (Advanced = the
   existing panel inspector, shown only for zones with a panel widget).
3. **Cutovers**: config v2 migration, kiosk re-pin to `arcv2`, delete
   free-canvas + 1:1 IP code paths. Verify kiosk, verify `arcv2` look, run the
   round-trip harnesses.

## Decisions (2026-10-08)

1. **Overlap**: no-overlap — collisions clamp to the free cells (layout tool,
   not a scene editor).
2. **`.infopanel` / 1:1 IP canvas**: retired entirely. No read-only import
   path; the grid `arcv2` profile covers the InfoPanel look.
3. **Kiosk pin**: re-pin to the `arcv2` grid profile; drop the `arcv2-ip` pin
   from `kiosk.json`.
4. **Rows**: a plain user-set `rows` number on the profile (default 4 for
   ≤600p strips, 6 for 1080p); zones clamp when it changes.
5. **Fluid fill**: the zone border is the truth. A widget stretches to fill
   its zone (container fills, content uses the space — cards center, lists
   scroll, art scales); content smaller than the zone is centered, content
   bigger clips at the edge. No down-scaling, no empty padding.
6. **Widget options**: every module declares a `settings` schema (show/hide
   its elements); values are per-placement and rendered schema-driven in the
       Advanced inspector (Simple shows zones + palette only).
7. **Modern now-playing**: new adaptive `spotifymodern` / `mediamodern`
    modules (`ModernNowPlaying`) pick card / standard / compact / simple from
    the measured zone size, with a cover-art-tinted surface (glass / matte
    light / matte dark); the classic `spotify` / `media` modules are kept.
 8. **Modern weather**: new adaptive `weathermodern` module
     (`ModernWeather`), same four layouts, surface tinted from the current
     condition (not cover art) plus a day-forecast strip from the open-meteo
     lines; the classic `weather` module is kept.
 9. **Modern Steam**: new adaptive `steammodern` module (`ModernSteam`),
     same four layouts, the game banner as the widget background with the
     transparent game logo overlaid (icon / title fallbacks), big
     total-playtime + stats; the classic `steam` module is kept.
 10. **Modern data widgets**: new adaptive `systemmodern` / `fpsmodern` /
     `hardwaremodern` / `audiomodern` / `bluetoothmodern` modules
     (`ModernSystem` / `ModernFps` / `ModernHardware` / `ModernAudio` /
     `ModernBluetooth`), same four layouts + surfaces — CPU/RAM rings,
     an FPS ring vs. refresh, kind-dotted hardware readings, per-device
     audio level bars, and BT device battery bars; all classic modules
     are kept.
  11. **Picker names**: the studio widget picker lists modules by their
      `title` (what the user sees), not their `id` (what the config stores).
      `fpsmodern` was therefore renamed from "Performance (modern)" to
      "FPS (modern)" (commit `49084f8`) so the FPS widget is findable in the
      list — the classic `fps` module keeps its "Performance" title. Full
      index of ids / names / data sources: `module-catalog.md`.
   12. **Standardized advanced settings**: every modern widget adopts a
       shared standard block (`STANDARD_SETTINGS`: preset / layout /
       surface / custom title / icon / accent / background image + use-as-
       background), rendered by one shared chrome layer (`ModernChrome`:
       background image behind the surface, icon+title header, `--wp-accent`
       variable). The setting schema gained two control types — `icon`
       (icon grid) and `image` (URL + thumbnail) — and `select` options can
       carry an `applies` bundle, which is how one-click style presets work.
       Full reference: `widget-settings.md`.

   13. **View presets + new primitives**: each modern widget that offers more
       than one layout now gets its own module-specific `view` select (the
       standard `preset` select stays style-only). A `view` option's `applies`
       bundle targets the module's own option keys, so one click sets a
       complete layout (e.g. Hardware `list`/`temps`, FPS `gauge`/`trend`,
       Audio `meter`/`volume`, Bluetooth `full`/`devices`/`status`, Weather
       `full`/`now`/`forecast`/`minimal`, Network `speeds`/`totals`). Two
       shared primitives back the reference "history"/"temps" looks:
       `lib/sparkline.tsx` (`useHistory` rolling window + `Sparkline` SVG
       trend) and `lib/gauge.tsx` (`ArcGauge` 270° arc + `tempColor` /
       `tempWord`). A new `networkmodern` module (`ModernNetwork`) renders the
       `libre.ethernet_*` keys (DL/UL speed + session totals + utilization,
       optional sparklines); it has no classic counterpart. Disk free / I/O,
       ping / jitter, per-core, and top-processes views from the reference
       dashboards are intentionally **not** built — the bridge exposes no
       such sensor keys, and no option is wired to dead data.

## Related

- `module-catalog.md` — the registry index: every module's id, picker name,
  min footprint, data-source keys, options.
- `widget-settings.md` — the standardized advanced-settings system: schema
  types, the standard block, presets, the chrome layer, adoption steps.
