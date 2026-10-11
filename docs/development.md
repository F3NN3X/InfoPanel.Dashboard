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
studio config, streams config changes to kiosk pages and proxies cover-art
images. It uses only Node built-ins. Environment variables it reads:

| Variable | Default | Meaning |
|---|---|---|
| `PORT` | `3922` | Listen port |
| `HOST` | `127.0.0.1` | Listen address |
| `LOCALAPPDATA` | - | The config is `%LOCALAPPDATA%\InfoPanel\Dashboard\config.json`. If unset, `$HOME/.local/share/InfoPanel/Dashboard/config.json` |

It answers 503 for pages until `dist/` exists, so run `npm run build` once
(or use `npm run serve`). Endpoints are listed in the README.

**Vite dev server.** `npm run dev` serves the source with hot reload. The
config store and image proxy live in the standalone server, so Vite forwards
`/api` and `/events/config` to `http://127.0.0.1:3922` (`vite.config.ts`).
Start `npm start` in a second terminal, otherwise the dev page cannot load or
save the config. Sensor data is not proxied: the page reads the Data API
directly, using the `dataApiUrl` from the config.

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
| Widget style | `src/components/widget-style.test.ts` (zoom, `--wp-*` variables, `chromeOf`, `surfaceBox`, scoped CSS, profile style) |
| Studio | `src/components/studio/placement-content.test.ts` (per-zone prefixes and content), `src/components/studio/settings-panel.test.ts` (setting groups) |

At the last check there were 12 test files and 107 tests, all passing.

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
