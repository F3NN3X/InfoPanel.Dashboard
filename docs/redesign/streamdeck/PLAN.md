# Stream Deck plugin: InfoPanel.StreamDeckDashboard (plan)

Status: **approved 2026-10-13** (repo created: github.com/F3NN3X/InfoPanel.StreamDeckDashboard). Context: `../ROADMAP.md` §S; the control channel it drives is
in `../pages/PLAN.md` (P3). SDK notes: Elgato `@elgato/streamdeck` 3.0.2, `@elgato/cli` 1.10.2,
Stream Deck 7.6 installed (v3 SDK needs 7.1+).

## Decisions (user, 2026-10-13)

- Native Stream Deck plugin, as fully featured as possible, with key feedback.
- Separate repo `InfoPanel.StreamDeckDashboard`.

## Shape

- TypeScript, scaffolded with `npx @elgato/cli create` (no global install): `src/plugin.ts`,
  `src/actions/*`, rollup, `com.f3nn3x.infopanel-dashboard.sdPlugin/` (manifest, `bin/`, `imgs/`, `ui/`).
  Manifest: `SDKVersion: 3`, `Software.MinimumVersion: "7.1"`, `Nodejs.Version: "24"`, Windows 10+.
- Talks only to the dashboard server (default `http://127.0.0.1:3922`, a global setting):
  `GET /api/config` (profiles, pages, names, icons, theme), `GET /api/control`,
  `POST /api/control/{page,profile,rotate}` with `X-Dashboard-Control: 1`, SSE `/events/control` and
  `/events/config`. Sensor keys read InfoPanel's Data API (default `http://127.0.0.1:3921`).
- **One shared client** (`src/dashboard.ts`): opened when the first key appears, closed when none are
  visible; SSE read from `fetch` bodies with a small parser (no extra dependency), reconnect with
  backoff 1–30 s plus jitter, a fresh snapshot after each reconnect. Keys render from its state.
- Key images are SVG strings drawn in the plugin (`src/render/*`, 144 px): dashboard theme colours from
  the config (`theme.primary`, `background`, `foreground`, `muted`…), the page's lucide icon (bundled
  from `lucide-static`), the name. Offline: a muted key with a disconnected glyph; a press shows
  `showAlert()`.
- Property inspectors use sdpi-components v4; profile and page selects are filled from the plugin
  (`datasource` → `streamDeck.ui.sendToPropertyInspector`), so they list the live names.

## Actions

| Action | Settings | Press | Feedback |
|---|---|---|---|
| Go to page | profile (or "the shown one"), page | switch the kiosk to that page | page icon + name; accent fill while active |
| Next page / Previous page | profile (or shown) | next / prev (wraps) | arrow + the current page name |
| Switch profile | profile or Auto | set / clear the profile override | profile name; active state |
| Auto-rotate | profile (or shown) | toggle; hold 1 s = back to the saved setting | play / pause, "saved: on/off" when overridden |
| Page cycler (dial, Stream Deck +) | profile (or shown) | rotate = next/prev, press = first page, touch = toggle rotate | touch strip: icon, page name, position (n / total) bar |
| Sensor value | sensor (picked from the Data API list), label, unit, decimals, warn / crit thresholds, optional page to open | open that page (if set) | label + live value, colour by threshold, mini sparkline |

The alerts key (count badge, acknowledge) comes with the alerts phase (`../ROADMAP.md` §A).

## Phases (build, tests and `streamdeck validate` green at each end)

| # | Phase | Output |
|---|---|---|
| SD1 | Scaffold + client | Repo, manifest, rollup, Vitest; `dashboard.ts` (config/control snapshot, SSE parser, backoff, POST helpers) and `data-api.ts` (sensor list + SSE), with tests against a fake server. |
| SD2 | Page keys | Go to page, Next/Previous, Switch profile, Auto-rotate; renderers; property inspectors with live selects; tests for renderers (SVG snapshots) and action logic with a mocked SDK. |
| SD3 | Dial | Page cycler with a custom touch-strip layout. |
| SD4 | Sensor key | Sensor value action (Data API stream, thresholds, sparkline). |
| SD5 | Ship | Icons (256/512 plugin, 28 px category, per-action), README, `streamdeck pack` → `.streamDeckPlugin`; `streamdeck link` into the installed app and a check on the real device against the running dashboard. |

## Needs before SD5

- The dashboard server on 3922 restarted with the current `server.mjs` (the control routes and the
  downgrade guard live there).
- A GitHub repo for `InfoPanel.StreamDeckDashboard` (created by you, or by me on your go-ahead).

## Risks

- **Older Stream Deck builds** — the manifest requires 7.1; 7.6 is installed.
- **Too many key repaints** — render only when a key's inputs change; sensor keys at most 4 per second.
- **Server offline** — keys show offline and recover on reconnect without a plugin restart.
