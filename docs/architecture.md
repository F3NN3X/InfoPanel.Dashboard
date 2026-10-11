# Architecture

How sensor data reaches a zone, how a zone is rendered, and how the layout
config is stored and synced. Everything here is read from the code; file
paths are given so you can check.

```
InfoPanel Data API  (default http://127.0.0.1:3921)
   /events?prefix=…   /api/sensors   /api/sources   /api/images/…
        │  read straight from the browser (CORS)
        ▼
 browser page ──── /api/config, /events/config, /api/image-proxy ────▶ dashboard server
 (kiosk or studio)                                                      (server.mjs, 127.0.0.1:3922)
```

Sensor data never passes through the dashboard server. `server.mjs` serves
the build, stores the config and proxies cover-art images; the page talks to
the Data API directly.

## 1. The InfoPanel Data API

The base URL is the `dataApiUrl` setting of the config, default
`http://127.0.0.1:3921` (`src/lib/data-api.ts`). `normalizeApiBase` accepts
only http(s) URLs and trims trailing slashes; anything else falls back to the
default. `App` applies the saved value before the first connection and
follows later changes (`setApiBase`), so changing the URL in the studio
reconnects without a reload.

| Endpoint | Used for | Code |
|---|---|---|
| `/events?prefix=<ns>&interval=1000` | Live sensor values (one stream per namespace) | `sensor-store.ts` |
| `/events` | The unfiltered stream, a full snapshot every second (fallback, see below) | `sensor-store.ts` |
| `/events?prefix=plugins.wavelink-plugin.wavelink.&interval=100` | Wave Link meters, their own stream | `wavelink.ts` |
| `/api/sensors` | Discovery of top-level sources; one snapshot for the studio's pickers | `sensor-store.ts`, `catalog.ts` |
| `/api/sources` | Plugin, container and entry names and types for the studio's pickers | `catalog.ts`, `sources.ts` |
| `/api` | "Test connection" (`testApiBase` expects status 200) | `data-api.ts` |
| `/api/images/{pluginId}/{imageId}` | Images a plugin hands to InfoPanel | `image.ts` |

### Prefix streams (`src/lib/sensor-store.ts`, `sensor-stream.ts`)

`sensorStore` is the page's one connection to sensor values. It does not poll
and does not read the full snapshot; it opens a filtered change stream per
namespace that mounted widgets read.

- **Namespace.** `namespaceOf` maps a key prefix to its stream prefix:
  `plugins.<first id segment>.` for plugin keys (`plugins.spotify-plugin.`),
  otherwise the top-level source (`libre.`, `system.`, `hwinfo.`, `spotify.`).
- **Messages.** Each message is `{ timestamp, sensors?, removed? }`. The first
  message after every (re)connect is the full set under the prefix; later
  ones carry only changed keys and removed keys. `mergeEvent` merges them
  copy-on-write: unchanged readings keep their old object, and a message that
  changes nothing returns the previous map itself. After a (re)connect, keys
  under the prefix that the full set does not carry are dropped.
- **Reference counting.** `retain(prefixes)` returns a release function.
  A stream opens (in a microtask, so a grid mounting many zones is planned
  once) with its first reader and closes 2 s after its last reader goes
  (`CLOSE_DELAY_MS`), so a quick re-mount reuses it. When a stream closes,
  values only that stream kept current are dropped.
- **Connection limit.** Browsers allow six connections per host over plain
  HTTP. `MAX_STREAMS` is 4, leaving room for the Wave Link stream.
  `planStreams` handles more namespaces than that: first it folds all plugin
  namespaces into one `plugins.` stream; if that is still too many, it uses
  the single unfiltered `/events` stream. A `plugins.` stream already covers
  every plugin namespace, so narrower plugin streams are dropped when it is
  wanted.
- **Reconnection.** `EventSource` reconnects on its own after a dropped
  connection, and the next message is a full set again. If the server refuses
  a stream and the `EventSource` closes for good, the store reopens it after
  5 s while it is still wanted. The last values stay on screen meanwhile;
  `useSensorsConnected` is true only while every open stream is open (and
  vacuously true with none), which drives the header badge.
- **Discovery ("every sensor").** The "Other sensors" catch-all zone reads
  every key (`useSensors(null)`). While it is mounted the store opens the
  base namespaces `plugins.`, `libre.` and `system.`, fetches `/api/sensors`
  to list the top-level sources that exist, and re-lists every 30 s to catch
  sources that start late (retrying after 5 s on failure).
- **URL change.** `setBase` closes every stream, clears all values, notifies
  subscribers and reconnects against the new base.

### The studio's catalog (`src/lib/catalog.ts`)

The studio's pickers (sensor binding, the Sources view, a widget's source
select) do not use the streams. `useSensorCatalog` fetches `/api/sources` and
one `/api/sensors` snapshot together, reuses a copy younger than 10 s, shares
one in-flight fetch, and starts over when the Data API URL changes.

### Images

`isImageUrl` decides which text sensor values are images (a URL with an image
extension, a sensor key naming an image field, a known image CDN, or a Data
API image path). `resolveImageUrl` resolves a root-relative
`/api/images/…` path against the Data API URL rather than the dashboard
server. To sample colors from cover art, `ModernNowPlaying` fetches it through
`/api/image-proxy?url=` on the dashboard server (https anywhere, http only on
loopback).

## 2. Per-zone rendering

A zone only re-renders when one of the keys it reads changes.

- A module declares `prefixes` (keys it owns; the catch-all skips them, see
  `isClaimed`) and optionally `reads` (further prefixes it reads without
  owning). `moduleReads(mod)` is both (`src/modules/index.ts`).
- `placementPrefixes(placement)` returns what a placement subscribes to
  (`src/components/studio/placement-content.tsx`): `[]` for a blank zone,
  the bound sensor keys of the visible widgets for a custom panel,
  `null` (every sensor) for the "cards" catch-all, and `moduleReads` for a
  module. A module with no prefixes (Web Page; Wave Link, which reads its own
  stream) subscribes to nothing and opens no sensor stream.
- `LivePlacement` calls `useSensors(prefixes)` (`src/hooks/useSensors.ts`).
  That retains the namespaces for the lifetime of the component and wraps the
  store in `useSyncExternalStore`, notifying only when a changed key starts
  with one of its prefixes. The returned map holds every streamed key, so
  modules read it as a plain `SensorMap`.

The kiosk grid (`App.tsx`) and the studio canvas both render zones through
`LivePlacement`.

### The render pipeline of a module zone

```
Placement.settings
  → withProfileStyle(settings, profile.style)    placement value wins, then profile style
  → mod.render(sensors, settings)
       → effectiveSettings(mod, settings)         module defaults fill the rest
       → chromeOf(cfg)                            settings → the `chrome` prop
       → <Component chrome={…}>
            → <ModernChrome>                      zoom / auto-scale, --wp-* variables,
                                                  scoped custom CSS, background, header
                 → surfaceBox(sv, chrome)         surface, border, glow, opacity, blur
  → PlacementFrame                                grid position; studio chrome or kiosk plain
```

- `withProfileStyle` and `effectiveSettings` are in `src/modules/types.ts`,
  `chromeOf` in `src/modules/standard-settings.ts`, `ModernChrome` in
  `src/components/modern-chrome.tsx`, `surfaceBox` and the `--wp-*` helpers in
  `src/components/widget-style.ts`. The keys and their effects are in
  [widget-settings.md](widget-settings.md).
- `ModernChrome` zooms its content box (`zoom`), so text, rings and spacing
  scale together. The widget measures itself in the unzoomed space and picks
  its layout variant there.
- A `render` that returns `null` means "no data": the studio shows a
  placeholder, the kiosk leaves the zone empty (`PlacementFrame` renders
  nothing when `hasData` is false or the zone is blank).
- **Idle.** A module may define `isIdle(sensors, settings)`. When the
  placement's `hideWhenIdle` setting is on and `isIdle` is true,
  `placementContent` reports `idle: true`. The kiosk passes
  `hasData && !idle` to `PlacementFrame`, which then renders nothing; the
  studio keeps the zone and badges it "idle - hidden in kiosk".
- `Placement.design` (accent, background, title header) is applied by
  `PlacementFrame` around the content, separately from the widget settings.

## 3. Config

### Types (`src/lib/layout.ts`)

- `DashboardConfig` - `version: 2`, `activeProfile` (a profile id or `"auto"`),
  `profiles`, `theme`, `radius`, `dataApiUrl?`, `stylePresets?`, `sourcePrefs?`.
- `MonitorProfile` - `id`, `name`, design `width`/`height`, `cols`, `rows`,
  `fit` (`"scroll"` with fixed `SCROLL_ROW_H` = 120 px rows, or `"fill"` to
  fill the viewport), `placements`, optional `style` (profile style) and
  `sampleVersion`.
- `Placement` - `module` (a registry id, `cards`, `blank` or `panel`), the zone
  box (`colStart`, `rowStart`, `colSpan`, `rowSpan`), `visible`, `settings`,
  `design`, `panel`.
- `StylePreset` - `{ id, name, settings }`, a named set of look-only keys.

### Loading and migration

`mergeConfig` merges a stored or partial config over the defaults and is used
for both the local copy and the server copy:

- rewrites legacy asset URLs (`http://127.0.0.1:3921/assets/…`) and bindings
  to the retired DataBridge forecast keys to the yr plugin's forecast key;
- fills explicit zone boxes and row counts on old auto-flow profiles and
  clamps every zone into its grid;
- re-adds the shipped profiles `sample-1920x1080` and `arcv2` when missing,
  and replaces a saved copy whose `sampleVersion` differs from the shipped
  `SAMPLE_PROFILE_VERSION` / `ARCV2_PROFILE_VERSION`;
- falls back to `activeProfile: "auto"` when the pinned id no longer exists;
- merges `theme` over the default theme, and keeps `dataApiUrl` only when it
  is a valid http(s) URL.

### Where it is stored

| Copy | Location | Written by |
|---|---|---|
| Browser | `localStorage` key `infopanel-dashboard:config:v1` | every page, on each config change (`saveConfig`) |
| Server | `config.json` in the dashboard server's data directory | `POST /api/config` |

`server.mjs` writes the file as `<data dir>\config.json`, where the data
directory is `%LOCALAPPDATA%\InfoPanel\Dashboard`. If `LOCALAPPDATA` is not
set it uses `$HOME/.local/share/InfoPanel/Dashboard` (`./.local/share/…` when
`HOME` is unset too). It writes a temp file and renames it. A body must be a
JSON object and at most 5 MB, otherwise the server answers 400 or 413.
`GET /api/config` answers 404 until a config has been saved.

### Sync (`src/App.tsx`, `src/lib/dashboard-server.ts`, `server.mjs`)

- **Load first.** A page that is not in kiosk mode first reads `/api/config`
  (`fetchConfig`). If the server has a config, the page adopts it (merged and
  stored in its `localStorage`). Only then does it start pushing, so a fresh
  browser or stale storage never overwrites the shared config with its own
  copy or the defaults. If nothing is saved yet (404), the page's own config
  is pushed. If the server can't be read (offline or an error), the page keeps
  its local copy and does not auto-push; the Save button still posts.
- **Push.** After that first read, a non-kiosk page posts its whole config to
  `/api/config` 400 ms after each change. The studio's Save button posts
  immediately.
- **Version.** Every save bumps a version on the server and sends it to all
  subscribers of `GET /events/config` (server-sent events). A new subscriber
  gets the current version straight away; a 15 s keep-alive comment keeps the
  stream open.
- **Pull.** A kiosk page opens `/events/config`; every message, including
  the first, makes it fetch `/api/config`, run `mergeConfig`, store the result
  in its own `localStorage` (the offline fallback) and re-render. If the server
  is offline or has no config, the page keeps its local copy.

The Vite dev server (`npm run dev`) proxies `/api` and `/events/config` to
`http://127.0.0.1:3922`, so a dev page shares the config of the running
dashboard server (`vite.config.ts`).

## 4. Kiosk and studio

`src/App.tsx` reads these URL parameters:

| Parameter | Effect |
|---|---|
| `kiosk=1` | Kiosk mode: no header, no studio button, no config push, and the layout is pulled from the server (see Sync). Only the value `1` counts. |
| `profile=<id>` | Pins that profile when it exists in the config; an unknown id is ignored. Applies on load and after every kiosk pull. |
| `studio` (any value; the app itself writes `?studio=1`) | Opens the studio instead of the grid. |

The studio is loaded lazily (`React.lazy`), so kiosk pages that never open it
do not download it. The wrench button on a non-kiosk page enters the studio;
the studio's **Kiosk view** button leaves it and clears the query string.

**Profile selection** (`resolveProfile`): when `activeProfile` is a profile
id that exists, that profile is used. Otherwise (`"auto"`, or an unknown id)
the profile whose design size is closest to the window wins, with the score
`|width difference| + |height difference| / 4`, recomputed on window resize.
A `?profile=` parameter overrides `activeProfile` for that page.

The grid uses `profile.cols` equal columns and `profile.rows` rows. With
`fit: "fill"` the rows share the viewport height equally; with `"scroll"` each
row is `SCROLL_ROW_H` (120 px) and the page scrolls.

**Studio shell** (`src/components/studio/studio-view.tsx`). The studio is a
top bar over three columns: the left rail with its drawer, the canvas
(`studio-canvas.tsx`, or the sources manager in Sources mode) and the
inspector on the right. `studio-view.tsx` owns the UI state (selection,
open drawer, inspector tabs and search, zoom, dialogs) and turns every
control into a config change through the pure profile mutations in
`studio-actions.ts`; zone boxes are clamped by `zone-geometry.ts`
(`fitZoneRect`, `resizeZone`, `nudgeZone`), which never lets zones overlap
and keeps the old box when there is no room. App.tsx still owns the config,
its persistence and the server push.

**Studio inspector** (`src/components/studio/zone-inspector.tsx`,
`document-inspector.tsx`). With nothing selected, the side panel shows the
theme, the profile style and the Data API URL. With a zone selected, a fixed
header holds the widget title, hide / duplicate / remove, the zone box and a
settings search; below it a **Content** tab (widget picker button, panel editor,
content settings) and a **Style** tab (style tools, look settings, the zone
frame). `settings-model.ts` decides which tab a setting belongs to
(`isStyleSetting`) and filters the search (`filterSettings`); collapsible
sections remember their open state in localStorage (`studio.sections`). See
the [customization guide](customization-guide.md).

**Studio left rail** (`left-rail.tsx`). A 48 px icon rail opens one drawer
at a time, remembered in localStorage (`studio.drawer`): **Add**
(`insert-panel.tsx`; `filterInsertables` searches and filters by category,
and `InsertList` is reusable with an `onPick` callback), **Layers**
(`layers-panel.tsx`, zones in `sortZones` order) and **Profiles**
(`profiles-panel.tsx`: profile list, the Auto entry via `resolveProfile`,
and the active profile's name, size, grid and fit). **Sources** is not a
drawer: it swaps the canvas for `sources-panel.tsx`.

**Studio top bar and zone toolbar.** `studio-top-bar.tsx` holds the profile
switcher (a Base UI menu), the Design | Sources switch, Undo / Redo, Save,
Kiosk view and a "..." menu: Export / Import (`config-file.ts`), Copy
profile JSON, Command palette, Keyboard shortcuts, Reset everything (behind
`reset-config-dialog.tsx`) and the build id. The selected
zone gets `zone-toolbar.tsx`, rendered over the canvas viewport but outside
its CSS `zoom` so it keeps a constant size; `toolbarPosition`
(`zone-toolbar-position.ts`) puts it above the zone, below it, or inside a
zone taller than the view, and it re-measures on scroll, zoom and resize.
`widget-picker-dialog.tsx` reuses `InsertFilters` and `InsertList` to assign
a widget (`assignModule` / `assignPreset` / `clearWidget` in
`studio-actions.ts`).

**Undo history** (`src/hooks/use-config-history.ts`, `config-history.ts`).
The studio wraps App's `setConfig` in `useConfigHistory`, so every studio
edit records the previous config snapshot; undo and redo write snapshots
back through the same setter, which means persistence, the debounced server
push and the kiosk event stream treat them like any other edit. A change
can carry a key (`<zone>:setting:<key>`, `zone-drag:<id>`, `theme:<token>`
and so on): same-key changes less than 500 ms apart coalesce into one step.
The stacks hold 100 steps and live only while the studio is open; a config
replaced from outside (the server copy loaded on open) clears them. When an
undo removes the selected zone, the selection is cleared.

**Shortcuts and command palette.** `use-studio-shortcuts.ts` listens on the
window; the pure `shortcutAction` maps a key press to an action, ignoring
plain keys while focus is in a field or a dialog / menu is open. The
command palette (`command-palette.tsx`, Ctrl+K) lists `buildCommands` from
`commands.ts`, a pure function of the studio state whose entries carry an
action descriptor that `studio-view.tsx` carries out (the shortcuts share
that dispatcher); `rankCommands` orders matches prefix > word start >
substring. `shortcuts-dialog.tsx` is the cheat sheet.
