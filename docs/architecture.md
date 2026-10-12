# Architecture

How sensor data reaches a zone, how a zone is rendered, and how the layout
config is stored and synced. Everything here is read from the code; file
paths are given so you can check.

```
InfoPanel Data API  (default http://127.0.0.1:3921)
   /events?prefix=…   /api/sensors   /api/sources   /api/images/…
        │  read straight from the browser (CORS)
        ▼
 browser page ──── /api/config, /events/config, /api/image-proxy, /api/assets ────▶ dashboard server
 (kiosk or studio)                                                                   (server.mjs, 127.0.0.1:3922)
```

Sensor data never passes through the dashboard server. `server.mjs` serves
the build, stores the config and uploaded media, and proxies cover-art
images; the page talks to the Data API directly.

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

### Style resolution (`src/lib/style-resolve.ts`)

Every zone's look is resolved before it renders. Only the look keys
(`PROFILE_STYLE_KEYS`) are layered, lowest first:

```
module default            (a panel: its legacy PanelDef accent / background)
  → dashboard style       DashboardConfig.style
  → profile style         MonitorProfile.style
  → the widget's own      Placement.settings - skipped when Placement.styleMode is
                          "follow" or the global style is forced
```

`resolveStyle({ moduleDefaults, dashboard, profile, own, mode, enforce })`
returns the settings (content keys always from `own`) and a per-key
`source` (`default` / `dashboard` / `profile` / `own`) that the
inspector's dots show. `appearanceOf(config, profile)` collects the two
style layers and the force switch (`profile.styleEnforce ?? config.styleEnforce`)
into an `Appearance`; `App.tsx` and the studio canvas pass it to
`LivePlacement`, and `placementContent` resolves each zone with
`resolveWith(appearance, own, placement.styleMode, moduleDefaults)`. A
`styleMode` of `"custom"` or none keeps the per-key order; `"follow"`
ignores the widget's own look values but keeps them stored.

### Where each setting comes from

Every layered setting resolves the same way, lowest first; the first level
that sets a value wins from the right:

| Setting | App default | Dashboard (`DashboardConfig`) | Profile (`MonitorProfile`) | Widget (`Placement`) | Resolved by |
|---|---|---|---|---|---|
| Look keys (surface, accent, font, …) | the module's defaults | `style` | `style` | `settings` (unless `styleMode: "follow"` or forced) | `resolveStyle` (style-resolve.ts) |
| Force global style | off | `styleEnforce` | `styleEnforce` | - | `isEnforced` |
| Theme colours, corner radius | `DEFAULT_THEME`, 0.5 rem | `theme`, `radius` | `theme` (partial, over the dashboard's), `radius` | - | `resolveTheme` (theme.ts) |
| Page background | none (the theme's page colour) | `background` | `background` (`{ type: "none" }` turns it off) | - (a widget's own background image is a look key) | `resolveBackground` (appearance.ts) |
| Grid gap, padding | 12 px; padding per mode (`profilePadding`) | - | `gap`, `padding` | - | `profileGap` / `profilePadding` (profile-grid.ts) |
| General (font, clock, locale, motion, cursor) | `GENERAL_DEFAULTS` | `general` | - | - (a widget's Font look key beats the page font) | `resolveGeneral` (general.ts) |

### The render pipeline of a module zone

```
Placement.settings
  → resolveWith(appearance, settings, styleMode) dashboard → profile → own (see above)
  → mod.render(sensors, settings)
       → effectiveSettings(mod, settings)         module defaults fill the rest
       → chromeOf(cfg)                            settings → the `chrome` prop
       → <Component chrome={…}>
            → <ModernChrome>                      zoom / auto-scale, --wp-* variables and the
                                                  re-scoped theme tokens (tokenScope), scoped
                                                  custom CSS, background, header
                 → surfaceBox(sv, chrome)         surface, border, glow, opacity, blur
  → PlacementFrame                                grid position, the zone's re-scoped tokens
                                                  (PlacementRender.scope); studio chrome or kiosk plain
```

- `effectiveSettings` is in `src/modules/types.ts`,
  `chromeOf` in `src/modules/standard-settings.ts`, `ModernChrome` in
  `src/components/modern-chrome.tsx`, `surfaceBox`, `tokenScope` and the
  `--wp-*` helpers in `src/components/widget-style.ts`, the surfaces
  (`makeSurface`, the theme surface, `surfaceColors` / `surfaceTokens` for
  the plain cards) in `src/components/surfaces.ts`, and `StyledCard` (the
  legacy modules' and the catch-all cards' box) in
  `src/components/styled-card.tsx`. The keys and their effects are in
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

### The render pipeline of a panel zone

A custom panel (`module: "panel"`) carries its own widget tree in
`Placement.panel`; there is no module `render`. The model is
`src/lib/panel-model.ts`: `PanelDef` (the arrangement - `layout` stack /
grid / overlay, `direction`, `wrap`, `justify`, `align`, `gap`, `padding`,
`columns` / `gridCols` / `gridRows`, `overlayAlign`, `scrim`,
`bottomGridCols`, `fit` fill / hug, `css` - and the ordered `widgets`),
`Widget` (one bindable item of a `WidgetKind`, with a `box` for its size
and placement), the pure list edits the studio uses (`moveWidget`,
`insertAfter`, `duplicateWidget`, `convertKind`, `withLayout`) and the Code
view's guard (`parsePanelJson`).

```
Placement.panel + Placement.settings
  → panelOwnSettings(placement)                  own settings; legacy title as the label fallback
  → resolveWith(appearance, …, styleMode, panelLegacyLook(placement))
                                                 legacy accent / background as the lowest layer
  → <PanelView enforced>                         src/components/widgets/PanelView.tsx; forced:
                                                 enforcedPanel drops the widgets' own colors
       → chromeOf(cfg) → <ModernChrome>          no design size: Size %, --wp-* variables,
                                                  custom CSS + panel.css, background image
            → div                                 places a hugging panel (fit: "hug") by alignX / alignY
                 → .wp-panel                      panelCardStyle (surface box, padding, radius),
                                                  panelVars (--panel-*); the tokens are re-scoped
                                                  on the ModernChrome root
                      → <PanelStack>              stack or grid: panelLayoutStyle, widgetBoxStyle per cell
                      → <PanelOverlay>            overlay: background image, scrim, three bands
                           → <WidgetCell>         .wp-widget.wp-widget--{kind}, data-widget-*, scoped
                                                  widget CSS, studio selection outline
                                → <WidgetView>    the kind's renderer (studio: "pick a sensor" when unbound)
```

`src/components/widgets/panel-layout.ts` turns a `PanelDef` into CSS. The
panel's own fields become `--panel-*` variables on `.wp-panel`
(`panelVars`); the stack / grid container and the cells read them as
`var(--panel-gap, <Spacing & shape --wp-gap>, <built-in px>)`, so a panel that sets
nothing keeps the old literal spacing, and panel CSS can set the variables
too. `widgetBoxStyle` maps a widget's `box` (hug / fill / px per axis,
`self`, grid `col` / `row`) and its `span` / `rowSpan` to flex or grid item
styles. The CSS hook tree is in the [customization
guide](customization-guide.md#styling-panels-with-css).

`placementPrefixes` subscribes a panel zone to the sensor keys of its
visible widgets, and a panel "has data" (renders in the kiosk) when at
least one widget is visible.

## 3. Config

### Types (`src/lib/layout.ts`)

- `DashboardConfig` - `version: 2`, `activeProfile` (a profile id or `"auto"`),
  `profiles`, `theme`, `radius`, `dataApiUrl?`, `stylePresets?`,
  `panelPresets?`, `sourcePrefs?`, `background?` (the page background),
  `style?` (the dashboard style, every profile), `styleEnforce?`
  (force the global style on every widget), `appearancePresets?` (the
  user's saved appearance presets) and `general?` (see below).
- `MonitorProfile` - `id`, `name`, design `width`/`height`, `cols`, `rows`,
  `fit` (`"scroll"` with fixed `SCROLL_ROW_H` = 120 px rows, or `"fill"` to
  fill the viewport), `placements`, optional `style` (profile style, over
  the dashboard's), `styleEnforce` (overrides the dashboard's when set),
  `background` (replaces the dashboard's; `{ type: "none" }` turns it off
  for the profile), `theme` (a partial `ThemeTokens` over the dashboard's
  theme) and `radius` (rem), `gap` and `padding` (px, see `profile-grid.ts`)
  and `sampleVersion`.
- `Placement` - `module` (a registry id, `cards`, `blank` or `panel`), the zone
  box (`colStart`, `rowStart`, `colSpan`, `rowSpan`), `visible`, `settings`,
  `design`, `panel`, `styleMode?` (`"follow"` / `"custom"`, see [Style
  resolution](#style-resolution-srclibstyle-resolvets)).
- `StylePreset` - `{ id, name, settings }`, a named set of look-only keys.
- `GeneralSettings` (`src/lib/general.ts`) - `font?` (`system`, `sans`,
  `rounded`, `serif`, `mono`), `hour12?` (unset = the locale's choice),
  `showSeconds?`, `locale?` (a BCP 47 tag, `""` = the system's), `motion?`
  (`system`, `reduce`, `full`) and `hideCursor?`. Stored sparse;
  `resolveGeneral` fills `GENERAL_DEFAULTS`.
- `PageBackground` (`src/lib/appearance.ts`) - `type` (`none`, `color`,
  `gradient`, `image`, `video`), `color` (the color, or the fill behind an
  image), `gradient` `{ from, to, angle }`, `src`, `fit` (`cover`,
  `contain`, `stretch`, `center`, `tile`), `position` `{ x, y }` (each
  `start` / `center` / `end`), `dim` and `tintOpacity` (0-100), `tint`,
  `blur` (px); for video also `poster` (an image URL), `loop` and `muted`
  (both default on) and `rate` (0.25-4, default 1).
  Stored sparse: unset fields use `BACKGROUND_DEFAULTS` when drawn.
- `UserPanelPreset` (`src/lib/panel-model.ts`) - a panel the user saved
  (Add > My panels): `{ id, name, panel, settings?, colSpan?, rowSpan? }`,
  where `settings` is the panel's look (its `PANEL_SETTINGS` keys). The
  built-in presets and the sensor-free layout starters are code
  (`src/lib/panelPresets.ts`, `src/lib/panel-starters.ts`);
  `allPanelPresets(config.panelPresets)` / `findPanelPreset` list and find
  all three, and `userPanelPreset` adapts a saved one (every use clones its
  panel with fresh ids). Saving, renaming and deleting are the pure config
  edits in `src/components/studio/panel-preset-actions.ts`.
- `AppearancePreset` (`src/lib/appearance-presets.ts`) - a whole look:
  `{ id, name, description, theme, radius, style, background? }`, where
  `theme` is a `ThemeTokens` object or a theme preset name (`"paper"`, …),
  `radius` the theme radius in rem, `style` look keys only
  (`PROFILE_STYLE_KEYS`) and `background` a complete `PageBackground`. The
  built-ins (`BUILTIN_APPEARANCE_PRESETS`, ids `builtin:*`) are code; the
  user's live in `config.appearancePresets`. Not to be confused with
  `StylePreset`, which restyles one widget.

### Appearance presets (`src/lib/appearance-preset-apply.ts`)

`applyAppearancePreset(config, preset, scope, { includeBackground })` is
pure config → config, and the studio sets its result in one `setConfig`
call without a coalescing key, so one undo step reverts a whole preset:

- scope `{ kind: "all" }` writes `theme` (the preset's tokens), `radius`
  and `style` (replaced wholesale);
- scope `{ kind: "profile" }` writes the profile's `theme` (the preset's
  full tokens), `radius` and `style`; the dashboard and the other profiles
  are untouched. Look keys the dashboard style sets but the preset doesn't
  are written as their setting defaults, so the profile shows the preset
  rather than a blend;
- the preset's `background` goes to the same scope when `includeBackground`
  is true or, when it is unset, only if the scope has none yet (unset, an
  empty media background, or the dashboard's `"none"`; a profile's `"none"`
  is a choice and stays). A preset without a background never clears one;
- placements (and with them all content keys) are never touched.

`countOverrides(config, scope)` counts the widgets whose own look keys show
over the global style (not following, not forced); `countProfileOverrides`
counts, for "all", profiles with their own look (style, theme or radius).
`clearOverrides` sets those widgets to `styleMode: "follow"` (their values
stay) and, for "all", drops the profiles' styles, themes and radii.
`presetFromCurrent` captures the resolved theme of the scope (a profile's
own colours over the dashboard's). `saveAppearancePreset`, `renameAppearancePreset` and
`deleteAppearancePreset` manage the user's list. The studio wires them through `useAppearancePresets`
(`src/components/studio/use-appearance-presets.ts`); the palette's
**Apply appearance: …** commands apply to "all".

`isValidStyleValue` / `invalidStyleKeys` check look values against the
options of `PROFILE_STYLE_SETTINGS` (select options, number bounds, CSS
colours); the tests run every built-in through it.

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
  is a valid http(s) URL;
- migrates every panel placement (`normalizePanelPlacement`): the panel is
  normalized (`normalizePanel`: the legacy `"wrap"` or a missing layout
  becomes a wrapping row stack, full-row kinds get `box.w: "fill"`;
  idempotent) and the legacy `title` / `titleVisible` are copied into the
  placement's settings as `label`. The legacy `accent` / `background`
  stay render-time fallbacks below the global style (`panelLegacyLook`);
  panels migrated by older builds keep the `accent` / `surface` copies
  they hold until they follow the global style (the PanelDef fields stay
  for older builds);
- keeps `style` when it is an object and `styleEnforce` when it is a
  boolean;
- keeps `general` through `normalizeGeneral` (known fonts and motion
  values, booleans, and a locale only when
  `Intl.DateTimeFormat.supportedLocalesOf` accepts it), and per profile a
  `theme` of token strings (`normalizeThemePatch`), a finite `radius`, and
  `gap` / `padding` rounded and clamped to 0-200 px (`normalizeSpacing`);
- keeps the dashboard's and each profile's `background` only when
  `normalizeBackground` accepts it (an object with a known `type`); invalid
  fields are dropped, numbers clamped, and a `src` must be http(s), a path or
  a `data:` image or video;
- keeps only usable saved panels (`normalizePanelPresets`, a hand-written
  guard: id, name, a panel with a widget list, object settings, whole-number
  spans) and normalizes their panels;
- keeps only usable appearance presets (`normalizeAppearancePresets`, a
  hand-written guard: a non-empty id that isn't `builtin:*`, a name, a
  known theme preset name or a token object (merged over the default
  theme, unknown tokens dropped); look values that aren't valid options are
  dropped, `radius` is clamped to 0-2 and `background` goes through
  `normalizeBackground`).

A panel added in the studio (`addPresetPlacement` / `assignPreset` in
`studio-actions.ts`) goes through the same `normalizePanelPlacement`, so it
has the current shape straight away; a saved panel brings its own settings.

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

### Uploaded media (`server/assets.mjs`, `src/lib/assets.ts`)

Images and videos uploaded in the studio are stored by the dashboard server
in `<data dir>\assets`, next to `config.json` (created on the first upload).
A file is named by its content, `<sha256 hex>.<ext>`, so the same file
uploaded twice is stored once and an asset URL never changes meaning. The
config refers to an asset by its same-origin URL, `/api/assets/<id>`, in the
same fields that take any other URL (`background.src` / `poster`, a widget's
`background` setting). The kiosk loads it from the server like the page
itself, so InfoPanel's WebView2, which has its own browser storage, shows the
same files as the studio.

| Route | Answer |
|---|---|
| `POST /api/assets` | Raw file body with its `Content-Type`. `200 { id, url, type, size }` (also for a file already stored); 403, 413, 415, 400 for an empty or aborted body |
| `GET /api/assets` | `[{ id, url, type, kind, size, mtime }]`, newest first |
| `GET /api/assets?unused=1` | The same, minus every id the saved `config.json` text contains as `/api/assets/<id>` |
| `GET` / `HEAD /api/assets/<id>` | The file: its sniffed type, `Cache-Control: public, max-age=31536000, immutable`, `X-Content-Type-Options: nosniff`, `Accept-Ranges: bytes`; a `Range: bytes=…` header gets 206 with `Content-Range`, or 416 past the end |
| `DELETE /api/assets/<id>` | 204, or 404 when it is not there |

Rules the server enforces:

- **Type by content.** The first bytes decide the type (`sniffType`): PNG,
  JPEG, GIF, WebP, AVIF, MP4 (ISO-BMFF video brands) and WebM. Any Matroska
  EBML header counts as WebM (DocType `webm` or `matroska`: tools write the
  latter into `.webm` files, and Chromium plays both), and `video/x-matroska`
  is declared WebM. SVG, HTML, HEIC, QuickTime and anything else are refused
  (415), and the declared `Content-Type` must name the same type.
- **Size.** Images up to 25 MB, videos up to 300 MB (413). A `Content-Length`
  over the limit is refused before reading; otherwise the body is streamed to
  a temp file while it is hashed (never held in memory) and the upload stops
  at the limit. The temp file is deleted on any refusal and renamed to the id
  on success; temp files left by a restart are removed when the server
  starts.
- **Paths.** A file path is only built from an id matching
  `^[a-f0-9]{64}\.(png|jpg|gif|webp|avif|mp4|webm)$`; anything else under
  `/api/assets/` is 404. There is no directory listing other than the JSON
  list.
- **Writes.** `POST` and `DELETE` need the header `X-Dashboard-Asset: 1`
  (403 without it). A custom header makes a browser preflight a cross-site
  request, and the server never answers preflights with CORS headers, so
  another website can't upload or delete through a visitor's browser. Writes
  are accepted from loopback addresses only, unless the server runs with
  `ALLOW_REMOTE_UPLOAD=1` (403 otherwise).
- **Quotas.** At most 2 uploads run at once (429), and the stored media
  (the whole `assets` folder, temp files included) plus the incoming
  `Content-Length` (the type's limit when it is missing) may not pass
  `ASSETS_MAX_BYTES`, default 2 GB (507). Both are checked before the body is
  read.
- **Read errors.** A file that vanishes while being streamed (a concurrent
  delete) destroys that response; it never crashes the server.

#### Request gate (`server/request-guard.mjs`)

Every request passes this gate before routing:

- **Host allowlist (DNS rebinding).** A rebound page is same-origin with the
  server and arrives from loopback, so the peer address proves nothing; its
  `Host` still carries its own name. Only `localhost`, `127.0.0.1` and `[::1]`
  (any port, so the Vite dev proxy works), the configured `HOST` and the names
  in `ALLOWED_HOSTS` are served; anything else gets 421 on every route. When
  `HOST` is `0.0.0.0` or `::` any IP-literal Host and the machine's hostname
  are allowed too, since LAN clients use IPs.
- **Cross-site writes.** For `POST`, `PUT`, `PATCH` and `DELETE`, a
  `Sec-Fetch-Site` other than `same-origin` / `none`, or an `Origin` whose
  host differs from `Host`, gets 403. Two loopback names count as the same
  machine, because the dev proxy keeps the browser's `Origin` while the
  server sees another `Host`.
- **Config writes.** `POST /api/config` needs `Content-Type:
  application/json` (415) and the header `X-Dashboard-Config: 1` (403), so it
  can't be sent as a simple cross-site request.
- **Errors.** A 500 answers `internal error`; the details are logged on the
  server only.

Nothing is deleted automatically. The studio's library (see Studio
inspector) lists the files and offers **Clean up unused**, which deletes what
`?unused=1` reports after a confirm. The scan reads the saved config only, so
a file used by an edit that has not been saved yet, or only by the undo
history, counts as unused.

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

**Grid spacing** (`src/lib/profile-grid.ts`). `profileGap(profile)` (the
profile's `gap`, else `DEFAULT_GRID_GAP` = 12) is the one source of the gap
between zones: the kiosk grid, the studio canvas grid, its column guides
(`columnGuides`), drawing (`cellAt`), the drawing / drag ghost (`zoneBox`)
and the move / resize pitch in `placement-frame.tsx` (`trackPitch`) all read
it, scaled by the canvas zoom where they work in screen px. The track math
(`trackSize`, `trackPitch`) is pure and tested for gaps 0, 12 and 24.
`profilePadding(profile, kiosk)` is the space around the grid: the
profile's `padding`, else the page defaults (a `fill` kiosk page 0, a
`fill` page with the header 12, `scroll` 24). The studio draws a "page"
of the profile's design size with the kiosk padding and puts the grid inside
it; the zone toolbar re-measures when gap or padding change.

**Theme** (`src/lib/theme.ts`). `resolveTheme(config, profile)` lays a
profile's own `theme` / `radius` over the dashboard's; `themeVars` turns
tokens into `--background`, …, `--radius`. The kiosk and dashboard page
write the shown profile's theme to `:root` (`applyTheme`). The studio keeps
the dashboard theme on `:root` for its own chrome and, for a profile with its
own theme, sets the profile's variables on the canvas page element
(`data-theme-scope`, painted `bg-background`); `index.css` re-declares the
colours derived from tokens (meters, waveforms) under `[data-theme-scope]`,
since a `var()` inside a custom property resolves where it is declared.

**General settings** (`src/lib/general.ts`, `src/hooks/use-general.tsx`).
`App.tsx` resolves `config.general` and provides it through
`GeneralProvider` to the kiosk page and the studio; `useGeneral()` reads it
(defaults outside a provider).

- Font: the page root (kiosk) and the studio canvas page set
  `font-family` from `fontStack(general.font)` (`system` sets none). A
  widget's Font option on `auto` (labelled Theme) sets no `font-family`,
  so it inherits; the
  widget-style `FONTS` are the same `FONT_STACKS`.
- Clock: `formatClock(now, general)` formats the panel Clock widget
  (`WidgetView.tsx`) and the header's last-update time with the locale,
  `hour12` (unset = the locale's) and seconds.
- Motion: `useReducedMotion()` (`src/hooks/use-reduced-motion.ts`) returns
  the OS media query for `system` and the override for `reduce` / `full`,
  so its users - the page background's `videoPolicy`, the media field
  preview, the level meter, bar visualizer and live waveform - follow it.
- Cursor: with `hideCursor`, the kiosk root gets `kiosk-hide-cursor`
  (`cursor: none` on it and every descendant, in `index.css`).

**Page background** (`src/lib/appearance.ts`,
`src/components/page-background.tsx`). `resolveBackground(config, profile)`
picks the profile's own background, else the dashboard's; `none` at either
level resolves to no background. `backgroundLayers` turns it into CSS for
three layers: the fill (color, or the letterbox behind an image), the media
(gradient or image, with `filter: blur()` and a negative inset of twice the
radius so the clipped edges stay sharp) and the overlay (tint, then dim, as
stacked gradients). `PageBackground` renders them with
`pointer-events: none`. The kiosk (`App.tsx`) puts it `fixed inset-0 -z-10`
behind the grid and drops the root's `bg-background` while a background is
set (the body keeps the theme color under it). The studio canvas renders it
`absolute` inside the profile-sized page element around the grid (made
`isolate`, so the negative z-index stays inside it) with a copy of the
dotted grid above it.

A **video** background renders as a `<video autoplay muted playsinline
preload="auto">` between the fill and the overlay, styled by `videoStyle`:
fit and position as `object-fit` / `object-position` (`stretch` is `fill`;
`tile` can't repeat and centers), blur with the same edge bleed as an image.
`videoPolicy({ motion, hidden })` decides what it does: `poster` on reduced
motion (`use-reduced-motion.ts`: the OS setting unless General > Motion
overrides it), where `posterBackground`
swaps in the poster as an image background (or only the fill without a
poster) and no video is loaded; `pause` while the page is hidden
(`use-document-hidden.ts`, the `visibilitychange` event); `play` otherwise.
`rate` is applied as `playbackRate` (also `defaultPlaybackRate`, so it
survives a reload of the source). With `muted: false` the element tries to
play with sound and falls back to muted when the browser refuses
(`NotAllowedError`).

**Studio shell** (`src/components/studio/studio-view.tsx`). The studio is a
top bar over the studio body, which `studio-shell.tsx` assembles from the
left rail, the open drawer, the canvas (`studio-canvas.tsx`, or the sources
manager in Sources mode), the strip under it (`zoom-toolbar.tsx`: grid,
zoom, fit, size and the layout switch) and the inspector, beside the
canvas (Side) or in a bottom dock (Bottom), see Studio layout below.
`studio-view.tsx` owns the UI state (selection,
open drawer, inspector search and card jumps, zoom, dialogs) and turns every
control into a config change through the pure profile mutations in
`studio-actions.ts`; zone boxes are clamped by `zone-geometry.ts`
(`fitZoneRect`, `resizeZone`, `nudgeZone`), which never lets zones overlap
and keeps the old box when there is no room. App.tsx still owns the config,
its persistence and the server push.

**Studio inspector** (`src/components/studio/zone-inspector.tsx`,
`document-inspector.tsx`). Both inspectors are **one sheet of cards**, with
no tabs: `category-sheet.tsx` (`CategorySheet`) renders the cards - in the dock
a category list (`navSections` in `setting-card-model.ts`: headers, entries,
changed counts; a click scrolls to the card and outlines it) beside cards in
300 px CSS columns, beside the canvas the same cards stacked and collapsible
- and `setting-card.tsx` (`SettingCard`: title, hint, scope badge, changed
count, per-card Reset, optional `wide` span) draws each one. Rows come from
`setting-control.tsx` (`SettingRow`), which picks a compact row from
`setting-rows.tsx` (toggle, slider with inline number, segmented, select,
color, text) by the setting's type; `settings-panel.tsx`'s `SettingField`
adds the state dot (`settingState`: default / dashboard / profile / own /
override) and the hover reset. Neighbouring short toggles share a line
(`pairRows`).

*Categories.* `inspector-categories.ts` holds the canonical general
categories (`GENERAL_CATEGORIES`: Widget, Size & alignment, Typography,
Spacing & shape, Colors & surface, Border & effects, Advanced) with the
standard keys each owns (filed by key; the rest by the setting's `group`).
`categorize(defs)` returns the general cards in that order, then the widget's
own in first-appearance order (module settings carry a `group` each; the test
`inspector-categories.test.ts` checks every module resolves to a known
category), `withGeneral` adds the general cards a zone fills itself, and
`filterCategories` is the search (matching rows win, a card title counts only
when no row matches). `setting-card-model.ts` has the pure helpers
(`changedDefs` / `resetKeysOf` over `settingStateOf`, `pairRows`,
`navSections`). `settings-model.ts` keeps `filterSettings`, `rowMatches`,
`settingState` and `dropKeys`.

*Zone sheet* (`zone-inspector.tsx`). A fixed header holds the widget title,
hide / duplicate / remove, the zone box and the settings search. The sheet is
`categorize` of the zone's settings (a module's, `PANEL_SETTINGS` or
`CARD_SETTINGS`) plus what the zone adds to general cards through `extras`:
the widget type picker and *Visible* in Widget, `StyleModeBar` (Follow /
Custom) and `StyleTools` in Colors & surface, the zone frame
(`zone-design-section.tsx`) in Border & effects. A blank zone gets only
those. A panel zone adds `groups` from `usePanelSheet` (`panel-sheet.tsx`):
the Panel, Layout, Background and Widgets cards and, with a widget selected,
its cards from `widgetCards` (`widget-editor/`: data, display, size &
placement, typography, color, advanced); the Code view swaps those for one
wide card. The studio asks the sheet to scroll to a card with a `jumpTo`
`{ id, seq }` (the toolbar's Style button, "Go to Widget settings", "Go to
Colors & surface", "Save panel as preset"); `inspector-scroll.ts` still
reveals `[data-widget-editor]` for a newly selected widget.

*Document sheet* (`document-inspector.tsx`, nothing selected). The same
`CategorySheet`: **Appearance** (`appearance-panel.tsx`'s `GlobalStyleScope`
with the All profiles / This profile switch and force, and the presets
gallery as a wide card), the global style as general category cards over
`PROFILE_STYLE_SETTINGS`, **Page** (theme colors - `theme-panel.tsx` for the
dashboard's, `profile-theme-panel.tsx` with Inherit / Custom for a profile's
own - and the background: `background-panel.tsx` for its All profiles / This
profile scope, `background-editor.tsx`, `background-video.tsx`; edits go
through `withBackground`, undo-keyed per scope by `backgroundKey`),
**General** (`general-panel.tsx`'s `generalCards`, written with
`withGeneral`) and **Connection** (the Data API URL). Open state of
collapsible cards is kept in localStorage (`studio.sections`, ids
`card:<id>`). See the [customization guide](customization-guide.md).

**Studio layout** (`studio-layout.ts`, `use-studio-layout.ts`). The pure
`computeLayout({ body, page, rail, drawer, inspector, mode, dockHeight,
collapsed })` returns `{ placement, dockHeight, canvasWidth, canvasHeight,
fitZoom }`. `body` is the studio below the top bar; `page` the profile's
design size (`height` 0 for a scroll profile, then `naturalHeight` from
its grid); `rail`, `drawer` and `inspector` are the widths beside the canvas
(the drawer counts only there: in the dock it is a column). `side` subtracts
rail, drawer, inspector, the vertical ruler (28 px), the horizontal ruler
(24 px) and the strip under the canvas (`BAR_H`, 36 px). `auto` goes to the
dock when the page, fitted to the width without the inspector, leaves at
least `AUTO_FREE_SHARE` (35%) of the body free and at least `AUTO_MIN_DOCK`
(220 px); an unknown page height stays `side`. The dock height (its strip
included) is the free height, or the user's, clamped to `MIN_DOCK` (200 px)
.. `MAX_DOCK_SHARE` (70%) of the body; collapsed it is `BAR_H`. `fitZoomFor`
is the largest zoom (floored to 1%, within 0.25 .. 2) at which the page plus
32 design px of padding fit a box; a page without a height is fitted to the
width only. `useStudioLayout` measures the body with a ResizeObserver
(`bodyRef`) and keeps the mode, the dragged dock height and the collapsed
flag in localStorage (`studio.layout`, `studio.dockHeight`,
`studio.dockCollapsed`, each in try/catch); `pageSize(profile)` gives the page
as the canvas draws it. `studio-shell.tsx` renders the placement: a row (rail,
drawer, canvas with its strip, inspector) for Side, or rail and canvas over a
`dock-splitter.tsx` (pointer capture, a guide line while dragging, commit on
release, snap to auto, double-click reset) and the dock (the strip with
`dock-toggle.tsx`, then the drawer and the inspector as columns).
`studio-drawers.tsx` renders the open drawer beside the rail or as the dock's
first column.

**Sticky fit** (`use-canvas-zoom.ts`). `useCanvasZoom(page)` measures the
canvas scroll container with a ResizeObserver; while `fitting` (the
default) the zoom is `fitZoomFor(box, page)` and follows the container and
the profile. Any manual zoom (`setZoom`, steps, Ctrl + wheel) turns
`fitting` off; `fitZoom()` turns it on. `studio-canvas.tsx` centers the page
(flex with `m-auto`) and offsets the rulers by the page's origin.

**Inspector in the dock** (`inspector-layout.tsx`, `inspector-scroll.ts`).
`InspectorLayout` (`"side" | "dock"`) is a React context that the inspectors
and panels read (`useInspectorLayout`); `InspectorHeader`, `HeaderSlot` and
`InspectorBody` switch their wrapper classes, so Side renders as before and
the dock gets a one-row header and a body of CSS columns (about 17.5 rem,
balanced, with `break-inside-avoid` on sections and rows).
`inspector-scroll.ts` finds the scrolling element (the aside beside the
canvas, `data-inspector-scroll` in the dock) for scroll-to-top and the
widget-editor reveal. `use-document-props.ts` holds the document inspector's
data and edits (theme, global style, background, general, Data API URL).

**Studio left rail** (`left-rail.tsx`). A 48 px icon rail opens one drawer
at a time, remembered in localStorage (`studio.drawer`): **Add**
(`insert-panel.tsx`; `filterInsertables` searches and filters by category,
and `InsertList` is reusable with an `onPick` callback), **Layers**
(`layers-panel.tsx`, zones in `sortZones` order) and **Profiles**
(`profiles-panel.tsx`: profile list, the Auto entry via `resolveProfile`,
and the active profile's name, size, grid, fit, gap and padding). **Sources** is not a
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
can carry a key (`<zone>:setting:<key>`, `zone-drag:<id>`, `theme:<token>`,
`<profile>:profile-theme:<token>`, `general:<key>`, `profile:gap` and so
on): same-key changes less than 500 ms apart coalesce into one step.
Panel field edits are keyed per field (`<zone>:panel:<field>`,
`<zone>:panel-widget:<widget>:<field>`); structural edits (add, remove,
reorder, duplicate, paste, change kind, Code view Apply) and the saved-panel
edits carry no key, so each is its own step.
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

**Selection model.** `studio-view.tsx` keeps the selected zone and, for a
panel zone, the selected widget (`{ zoneId, widgetId }`): the widget only
counts while its zone is selected and still holds it, so selecting another
zone, an undo or a delete drops it. The canvas selects it (a click inside
the selected panel zone, or a double-click on a widget of another panel;
`placement-frame.tsx` hit-tests `[data-widget-id]`), as do the layer list,
the palette's *Select widget* and the breadcrumbs. With a widget selected
the shortcuts run in widget mode (`ShortcutContext.widget`): Del, Ctrl+D,
Ctrl+C / Ctrl+V and Alt+Up / Down map to `widget-*` actions that
`panel-widget-actions.ts` carries out on the selected panel, while the
arrow keys keep moving the zone; Esc steps out widget > zone > nothing. The
palette and the zone's Duplicate / Remove tooltips drop their Ctrl+D / Del
hints in widget mode. Widget names in the layers, crumbs and palette come
from `widgetName` (`widget-kinds.ts`): the label, else the sensor's name
from the Data API catalog, else the key's last segment.
