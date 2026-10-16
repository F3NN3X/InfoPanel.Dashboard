---
title: InfoPanel Studio desktop app (Tauri 2)
status: built, tested and committed on feat/desktop-app, not merged
created: 2026-10-16
updated: 2026-10-16
tags: [desktop, tauri, server, agents, debug]
---

Built from `docs/desktop/TAURI_PLAN.md`; how to build and use it is in `docs/desktop/README.md`.

## What shipped

- `src-tauri/`: the app (single instance, window state, tray, autostart, start and settings pages,
  bundled Node server with crash restarts and logs, runtime studio capability, navigation guard,
  coding agent toggle, debug sampling). NSIS per-user installer, unsigned.
- Server: `/api/health`, image proxy limited to raster images with nosniff, `DASHBOARD_DIST`,
  `DASHBOARD_DATA_DIR`, `DASHBOARD_DEBUG` request/SSE log and `/api/debug/stats`.
- Agents: `agent-install.mjs --node --url --json`, `agent-status.mjs --url`.
- Studio: native export/import in the app, flush before hide/quit, "Desktop app settings" in the ⋯
  menu, error forwarding and 30 s samples in debug mode.
- `npm run desktop:build` builds the studio into `.cache/desktop/dist`, never `dist/`.

## Checked (release build, isolated config/data folders, port 3942/3943)

- Start: probe, own server, studio loads; health and debug stats answer; samples from the app, server
  and studio reach `metrics.csv` and the Diagnostics table.
- Settings: port change restarts the server and reloads the studio on the new port; debug off makes
  `/api/debug/stats` 404.
- Agents (with `USERPROFILE` pointed at a temp folder): on writes hooks for both agents with the
  bundled Node and the current URL and a backup; a hook command posts to the server (204); off
  removes them and the marker.
- Close to tray after the studio's flush; the server keeps answering. A second launch focuses the
  first window.
- A separate `node server.mjs` on the port: the start page names it, asks for confirmation, stops it
  and starts the app's own server.
- No server left behind after a forced kill of the app (job object), including after a restart.
- Installer: silent install, the installed app's own `node.exe` serves the port, silent uninstall
  leaves no files and no uninstall entry.

## Found and fixed while testing

- `desktop:build` ran `npm run build`, which rewrote the `dist/` the live 3922 server serves. Main's
  build was restored from a temporary worktree and the desktop build now uses its own folder.
- A server restarted by the app outlived a killed app (no job object; the first one only died
  because its debug logging hit a broken pipe). Fixed with a kill-on-close job object.
- Security review fixes: `http://tauri.localhost:<port>` no longer counts as a local page; Save As
  only writes `.json`; probe reads are capped; external opens are throttled; studio log messages
  can't forge log lines; the PID is re-checked before a stop; the CDP port only in debug mode.

## Follow-up after the user's test

- The stop flow did nothing against the live 3922 server: it is an older build with no
  `/api/health`, so it was classed as "another program". The app now closes any `node.exe` holding
  the port that answers as the dashboard or runs `server.mjs`, automatically on startup. Checked
  against main's `server.mjs` on 3943 (stopped, own server started) and Python's `http.server`
  (left alone, start page shown).
- Frameless windows: the studio's top bar is the title bar (drag, double-click to maximize, minimize /
  maximize-restore / close, close hides to the tray); the start and settings pages have a matching
  bar. The window-state plugin no longer restores the saved frame flag, which had brought the native
  bar back.

## Not covered

- Tray menu clicks and autostart registration (not driven; autostart was kept off on this machine).
- The native export and import dialogs (not driven).
- The studio UI inside the installed copy (its server was checked; the same files loaded the studio
  in the release build).
- The WebView2 remote-debugging port never opened on this machine; Windows UI Automation drove the UI.
- Not addressed from the security review: the image proxy follows redirects (pre-existing; blind
  requests only), "use this server" trusts any listener that answers as the dashboard.
