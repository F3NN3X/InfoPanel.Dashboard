# Brief 9.4c: visual parity pass

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`, main checkout. Fix the open
rows for your modules in `docs/redesign/phase9/visual-review.md` and `docs/redesign/phase9/review-ledger.md`
(#32–#35, #37). Rule (D1): new look allowed, but everything the legacy widget showed at a span must
still be visible, formatted at least as well; no scrollbars, clipping mid-word, overlaps; legacy
default colours kept for the alias.

Evidence: `docs/redesign/phase9/shots/before|after/<module>_<span>_110.png` (Read shows images). The
legacy code is at `git show 6513067:<path>` (e.g. `src/components/ModernHardware.tsx`). Re-render with
the QA harness: `npm run dev` is already running on port 5199; you cannot drive a browser, so verify
through `renderToString` tests at forced sizes and by reasoning from the legacy code. The controller
re-shoots afterwards.

Ownership (three implementers run at once in the same checkout): edit only the files of your modules
listed below; never `git add -A`/stash/checkout; commit with explicit paths; retry on `index.lock`.
Shared core files (`src/widgets/core/**`, `kit.ts`, `module.tsx`) — avoid; if a core change is
unavoidable keep it additive and name it in your report.

| Owner | Modules | Files you may edit |
|---|---|---|
| P1 | audiomodern, wavelinkmodern | AudioMeter, MeterBridge, VolumeMixer, WaveLink, src/modules/{audio-modern,wavelink-modern}*, registry/c.ts (audio/wavelink entries only) |
| P2 | systemmodern, hardwaremodern, Other sensors | SystemOverview(+dir), Thermals, SensorGroup, SensorValue, hardware-readings, registry/a.ts, registry/b.ts, registry/system-overview.ts, src/modules/{system-modern,hardware-modern,other-sensors}* |
| P3 | networkmodern, weathermodern, bluetoothmodern, textfile, vbz, spotify/media, steammodern, notifications, streamdeck, webpage, fpsmodern | NetworkThroughput, Weather, Forecast, Bluetooth, TextFile, Departures, Notifications, StreamDeck, WebPage, NowPlaying(+dir), GameSpotlight*, FpsMonitor, registry/d.ts, registry/e.ts, their src/modules files. Do NOT edit registry/b.ts or c.ts (owned by P2/P1): if a NetworkThroughput/Weather/NowPlaying setting entry must change, describe it in your report |

Per module: one commit `fix: restore <title> parity at small spans` (body lists each visual-review row
fixed). Tests: for each fixed row, a `renderToString` assertion that the restored information is in the
output at the forced size matching the span (e.g. the upload value at `size="xs"` for 2×1). Values use
the legacy decimals. Verify with `npm run typecheck` (project script only) and your test files plus
`npx vitest run src/modules src/widgets` (re-run once if a failure is clearly another owner's
in-progress file). Report in ≤12 lines: commits, rows fixed, rows not fixed and why.
