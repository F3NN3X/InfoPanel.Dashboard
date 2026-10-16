---
title: InfoPanel Studio desktop app (Tauri 2)
status: built, tested and committed on feat/desktop-app, not pushed
created: 2026-10-16
updated: 2026-10-16
tags: [desktop, tauri, server, agents, debug, studio]
---

Same session also merged PR #24 (widget editing, `bf51627`) and PR #25 (studio logo, `9ae4f5b`).
Then `feat/desktop-app` got three commits on main: `ea83353` (plan), `8a87b8b` (app), `b3a8e55`
(design-size fix); 111 files. Green at the end: `npx vitest run` 3,496 passed / 1 skipped,
`npx tsc -b`, and in `src-tauri/` `cargo fmt --check`, `cargo clippy --all-targets -- -D warnings`,
`cargo test` (50). `npm run desktop:build` produces the NSIS installer.

Plan: `docs/desktop/TAURI_PLAN.md`. Build, settings and debug mode: `docs/desktop/README.md`.

## What shipped

- **Self-contained app.** `src-tauri/` ships Node 24.22.0 (pinned and checksummed by
  `tools/desktop-prepare.mjs`), `server.mjs` and the studio, starts the server and loads the studio
  from it. Closing the window keeps the server in the tray; start at login is on by default. A
  kill-on-close job object ties every server to the app.
- **Port takeover.** On startup the app closes a dashboard server it didn't start that holds the
  port: a `node.exe` that answers `/api/health` as the dashboard or runs `server.mjs`. Any other
  program is left alone and the start page says the port is in use.
- **Settings page.** Host/IP, port, allowed hosts, startup, close to tray, the coding-agent hooks
  (installed with the bundled Node, rewritten after a port change or update, removed on uninstall)
  and debug mode. Debug mode gives request logs, `/api/debug/stats`, studio error forwarding and
  30 s memory samples with a "growing" flag.
- **Frameless windows.** The studio's top bar with the logo is the title bar, with the window
  controls on it (`window-controls.tsx`). The start and settings pages have a matching bar.
- **Server and tools.** `/api/health`, image proxy limited to raster images, `DASHBOARD_DIST`,
  `DASHBOARD_DATA_DIR`, `DASHBOARD_DEBUG`; `agent-install --node/--url/--json`, `agent-status --url`.
- **Studio fixes.** The quick bar floats over the canvas only, below the page tabs. On Scroll
  profiles the canvas frames the design size (`pageSize`) and `ScreenFold` dims the rows past the
  screen, so changing rows no longer rescales the page.

## What broke, and what it taught

- **`npm run build` rewrites the `dist/` the live 3922 server serves.** It happened twice: through the
  widget-editing build and through the first `desktop:build`. Main's build was restored from a
  temporary worktree. `desktop:build` now builds into `.cache/desktop/dist`, and CLAUDE.md says so.
- **A restarted server outlived a killed app.** No job object. The first server only died because
  its debug logging hit a broken pipe, which hid the bug until a restart with debug off.
- **The takeover first missed the real case.** The live server is an older build without
  `/api/health`, so it was classed as "another program". It is now also recognised by its command
  line.
- **The window-state plugin brought the native frame back.** It restores the saved decorations flag
  by default; `StateFlags::DECORATIONS` is now excluded.
- **WebView2's CDP port never opened** on this machine, even with the flag on the command line.
  Windows UI Automation (`uia.ps1`-style scripts) drove the UI instead; `SendKeys` without a
  verified foreground window can type into the wrong app.
- **Security review** (one medium, six low fixed): `http://tauri.localhost:<port>` counted as a local
  page, because Tauri's own check ignores the port.

## Decisions

- Load the studio from the server, not a bundled SPA: stored `/api/assets` links stay same-origin and
  the request guard needs no CORS exception.
- Close an old dashboard server automatically (user's call), but never a non-node or non-dashboard
  process.
- Scroll profiles: the frame is the design size, and the rows below the fold are dimmed but editable
  (user's choice over changing Scroll's row model or forcing Fill).
- Unsigned NSIS, per-user install; signing and the updater come later (#29).

## Still open

- Push `feat/desktop-app` and open the PR (the user asked to wait until this point).
- #26 image proxy follows redirects; #27 "Use it for this session" trusts any dashboard answer;
  #28 manual QA of the tray, autostart, native dialogs and the installed studio UI; #29 signing,
  updater and CI.
