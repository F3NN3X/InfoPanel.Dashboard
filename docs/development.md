# Development

## Prerequisites

- Node.js 20 or newer (as stated in the [README](../README.md)).
- npm. The repo carries a `package-lock.json`; install with `npm install`.
- For live data, InfoPanel with its Data API enabled (default
  `http://127.0.0.1:3921`). Without it the dashboard still starts; zones show
  no data.

## Scripts

From `package.json`:

| Script | Command | What it does |
|---|---|---|
| `npm run dev` | `vite` | Vite dev server with hot reload on http://localhost:5173 |
| `npm run build` | `tsc -b && vite build` | Type-checks, then builds into `dist/` |
| `npm run typecheck` | `tsc -b` | Type-check only |
| `npm test` | `vitest run` | Runs the test suite once |
| `npm start` | `node server.mjs` | Serves `dist/` and the config endpoints |
| `npm run serve` | `npm run build && node server.mjs` | Build, then start |

## Dev server vs the standalone server

**Standalone server (`server.mjs`).** Serves the built `dist/`, stores the
studio config and uploaded media, streams config changes to kiosk pages and
proxies cover-art images. It uses only Node built-ins; the media routes are
in `server/assets.mjs`. Environment variables it reads:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3922` | Listen port |
| `HOST` | `127.0.0.1` | Listen address |
| `LOCALAPPDATA` | - | The config is `%LOCALAPPDATA%\InfoPanel\Dashboard\config.json`. If unset, `$HOME/.local/share/InfoPanel/Dashboard/config.json` |
| `ALLOW_REMOTE_UPLOAD` | unset | `1` accepts media uploads and deletes from other machines; otherwise only from loopback (the server answers 403) |
| `ALLOWED_HOSTS` | unset | Extra `Host` names to serve, comma separated (e.g. `kiosk.lan,panel.example`). Without it only `localhost`, `127.0.0.1`, `[::1]` and `HOST` are served (421 otherwise); with `HOST=0.0.0.0` any IP address and the machine name work too |
| `ASSETS_MAX_BYTES` | `2147483648` | Cap on the total size of the uploaded media; an upload that would pass it gets 507 |

Uploaded images and videos go to an `assets` folder next to `config.json`
(`%LOCALAPPDATA%\InfoPanel\Dashboard\assets`), created on the first upload.
Files are named by content hash; deleting one by hand breaks every config
that refers to it, so prefer the studio's library (it can list what the saved
config no longer uses). Copy the folder along with `config.json` to move a
dashboard to another machine. Routes and security rules are in
[architecture](architecture.md#uploaded-media-serverassetsmjs-srclibassetsts).

It answers 503 for pages until `dist/` exists, so run `npm run build` once
(or use `npm run serve`). Endpoints are listed in the README.

**Vite dev server.** `npm run dev` serves the source with hot reload. The
config store and image proxy live in the standalone server, so Vite forwards
`/api` and `/events/config` to `http://127.0.0.1:3922` (`vite.config.ts`).
Start `npm start` in a second terminal, otherwise the dev page cannot load or
save the config. Sensor data is not proxied: the page reads the Data API
directly, using the `dataApiUrl` from the config. Uploads work through the
proxy too (`/api/assets`, including `Range` requests for video); the server
sees them coming from the proxy on loopback.

Because a non-kiosk page loads the server's config on open and then pushes
every change back, a dev page and the standalone dashboard share one config
(see "Sync" in [architecture](architecture.md#3-config)). For experiments,
run a second server with its own config instead of using the live one:
`PORT=3999 LOCALAPPDATA=<some folder> node server.mjs`.

**Windows launcher (`start-dashboard.bat`).** Double-click it to start the
standalone server. It checks that Node is on PATH, runs `npm ci` when
`node_modules` is missing, runs `npm run build` when `dist\index.html` is
missing, then runs `node server.mjs`. `start-dashboard.bat rebuild` builds
before starting. Set `PORT` / `HOST` beforehand to change where it listens. On
an error it pauses so the window stays open.

## Build output

`vite build` writes `dist/`. The Vite `base` is `./`, so the build works from
any path. `dist/` is git-ignored, as are `node_modules/`, `*.tsbuildinfo` and
`*.log`.

## Tests

Vitest, run with `npm test`. There is no Vitest config file and no DOM
environment package in `devDependencies`; the tests exercise pure logic, not
rendered components. Tests sit beside the code they cover:

| Area | Test files |
|---|---|
| Sensor streaming | `src/lib/sensor-stream.test.ts` (merging, namespaces, stream planning), `src/lib/sensor-store.test.ts` (reference counting, reconnects, discovery) |
| Data API | `src/lib/data-api.test.ts`, `src/lib/catalog.test.ts`, `src/lib/sources.test.ts`, `src/lib/sensors.test.ts` |
| Readings | `src/lib/system-metrics.test.ts` (System widget readings, thresholds, units), `src/lib/forecast.test.ts`, `src/lib/image.test.ts` |
| Widget style | `src/components/widget-style.test.ts` (zoom, `--wp-*` variables, `chromeOf`, `surfaceBox`, scoped CSS, profile style), `src/components/surfaces.test.ts`, `src/components/wavelink-layout.test.ts` (the Wave Link layout picked per zone size) |
| Config and appearance | `src/lib/layout.test.ts` (`mergeConfig` migration and guards), `src/lib/panel-model.test.ts`, `src/lib/style-resolve.test.ts` (style layers), `src/lib/appearance-presets.test.ts` (applying, overrides, saved looks), `src/lib/theme.test.ts` (profile theme over the dashboard's), `src/lib/general.test.ts` (general settings, clock formatting), `src/lib/profile-grid.test.ts` (gap / padding defaults and the track math for gaps 0, 12 and 24) |
| Studio | `src/components/studio/placement-content.test.ts` (per-zone prefixes and content), `src/components/studio/inspector-model.test.ts` (tabs, sections, search, Advanced, source dots) and `inspector-categories.test.ts` (every module's settings resolve to a known category), `studio-layout.test.ts` (Side / Bottom / Auto, fit zoom), `use-studio-shortcuts.test.ts`, `zone-menu.test.ts`, and the other `*.test.ts` beside the studio modules (commands, zone geometry, studio and appearance actions, the explorer model, …) |
| Data layer and history | `src/lib/data-points.test.ts` (normalising the catalog, health, search), `src/lib/data-usage.test.ts` (Used by, bind / unbind), `src/lib/sample-history.test.ts`, `src/lib/fonts.test.ts` (the font catalog), `src/hooks/config-history.test.ts` (undo stacks, coalescing, transactions) |
| Page background and media | `src/lib/appearance.test.ts` (background layers, video style and `videoPolicy`), `src/lib/assets.test.ts` (upload / library requests with a mocked `fetch`) |
| Server | `server/assets.test.mjs` (magic-byte sniffing, asset id validation against traversal, `Range` parsing, loopback check). Vitest's default pattern picks up `.test.mjs`, so `npm test` runs it |

`npm test` prints the current number of test files and tests; all of them
should pass.

## Typecheck

`npm run typecheck` runs `tsc -b` with the project's own TypeScript
(`~5.6.2`). If you call `tsc` directly, use the local binary:

```bash
./node_modules/.bin/tsc -b
```

A newer global TypeScript can reject `tsconfig.json`: TypeScript 6 stops with
`TS5101: Option 'baseUrl' is deprecated` because the config sets
`"baseUrl": "."` (used for the `@/*` path alias).

## Adding a widget

1. Create `src/modules/<name>.tsx` with the module (`id`, `title`,
   `minCols`/`minRows`, `prefixes`, optional `reads`, `settings`, `render`,
   optional `isIdle`) and register it in `src/modules/index.ts`.
2. For an adaptive widget, spread `STANDARD_SETTINGS` into `settings`, build
   the `chrome` prop with `chromeOf(cfg)`, wrap the component in
   `ModernChrome`, and size its `designSize` from what it shows. The three
   steps are in
   [widget-settings.md, "Adopting the standard block"](widget-settings.md#adopting-the-standard-block-new-widget).
3. Add a row to [module-catalog.md](module-catalog.md), and a unit test for
   any logic that reads sensor keys (see `src/lib/system-metrics.test.ts`).

The studio inspector needs no code for the new widget's options: each
`ModuleSetting` in `settings` is filed into a section by its `group` and into
a tab by `tab` (or by its category), and can be `advanced`, carry a `hint`, or
show only while `visibleIf(values)` holds. See [architecture.md, "Adding a
setting to a module"](architecture.md#adding-a-setting-to-a-module). The
category test fails for an unfiled option.

`prefixes` and `reads` decide which streams the zone opens and which changes
re-render it; see [architecture](architecture.md#2-per-zone-rendering).

## Verification checklist

Before calling a change done:

1. `./node_modules/.bin/tsc -b` exits 0.
2. `npm test` exits 0.
3. `npm run build` exits 0.
4. Start the server (`npm start`) and look at the result in kiosk mode,
   `http://127.0.0.1:3922/?kiosk=1&profile=<id>`:
   - in a **small** zone (about 2 x 1 cells), where the compact or simple
     layout should appear and nothing should overflow;
   - in a **large** zone, where the content should scale up to fill it;
   - with the widget's options toggled in the studio (`/?studio=1`), then
     **Save** and check that the kiosk page updates without a reload.
5. If the change touches the stream code, open the browser's network panel
   and check that there is one `/events?prefix=…` request per namespace and no
   more than four sensor streams.
6. `git diff --stat` lists the files you meant to change.
