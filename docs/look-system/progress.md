# Look System progress

Filled in during stage 2 (see `02-implementation-runbook.md`, section 4). Every phase ends with a report, a "Things to know" list and updates to the ledger at the bottom, and is committed when done. Plan: [docs/investigations/look-system.md](../investigations/look-system.md), section 11.

| Phase | Branch | Status | Pixels | Report |
|---|---|---|---|---|
| Stage 1 | look/package | done (Gate 2 approved 2026-11-03) | none (investigation only) | [docs/investigations/look-system.md](../investigations/look-system.md) |
| P0 | look/p0-guardrails | done, awaiting go (2026-11-03) | none on screen; export: warn and crit rings export amber and red instead of blue (intended fix) | |
| P1 | look/p1-single-sources | done (2026-11-03) | none | |
| P2 | look/p2-performance | not started | none for widgets; InfoPanel canvas cards with blur above 12 px get 12 px with Limit blur on (intended) | |
| P3a | look/p3a-data-viz-tokens | not started | ramp start colour moves to the material fill (intended fix) | |
| P3b | look/p3b-material-registry | not started | intended: `brutal` shadow moves inside the card edge; export draws the 12 dropped cards; Look thumbnails fixed; Classic otherwise none | |
| P4 | look/p4-variable-families | not started | none | |
| P5 | look/p5-look-contract-ui | not started | studio UI only; untouched widgets identical | |
| P6 | look/p6-light-mode | not started | light materials only: `ok` and accent text darken (intended) | |
| P7 | look/p7-clean-up | not started | minor: Settings accent text darker, 13 near-twin greys, native select border, alerts take the widget crit red | |
| P8 | look/p8-slot-plumbing | not started | none with Classic, except 9 icons that draw `CircleDashed` today (intended fix) | |
| P9 | look/p9-pack-loader | not started | none with Classic | |
| P10 | look/p10-first-wave | not started | new packs only | |
| P11 | look/p11-second-wave | not started | new packs and Looks only | |
| P12 | look/p12-validator | not started | none | |

## P0: Guardrails
- Plan entry: [docs/investigations/look-system.md, section 11, P0](../investigations/look-system.md)
- Checklist:
  - [x] expected changes confirmed against HEAD (mismatches below)
  - [x] implementation
  - [x] verify, verify:full, check-fresh
  - [x] per-kind render tests (unchanged, green)
  - [x] parity: empty diff (`v8-parity` unchanged)
  - [x] overflow probe at 1x1, 2x2, 4x2, 4x4 (new `overflow` check, 255 frames, 0 issues)
  - [x] screenshots dark and light (new `look-visual` baselines: glass and matte-light)
  - [x] budgets unchanged (kiosk 276,627 B gzip, studio 616,948 B; `check-budgets` exit 0)
  - [x] CHANGELOG (Fixed: ring export); no widget spec changes
  - [x] decision log: no change
- Report:
  - Export fix: warn and crit rings on the Theme surface export as their colours, not `#3B82F6` (`decompose.ts`, failing-first test in `decompose.dom.test.ts`).
  - New pins: `surfaceOf` over 27 surfaces (happy-dom reading: 17 null rows, not Chromium's 12; it guards the code path, P3b needs a browser check for colours), `DEFAULT_THEME` = `index.css` fallbacks, 13 `STATE` copies equal, icon names (9 known gaps, fixed in P8).
  - New checks: `overflow` (`tools/qa/overflow.mjs`, every platform, verify:full and widget features) and `look-visual` (138 images, 4.9 MB, Windows only, verify:full only, not in CI; tied to this PC's text rendering).
  - Perf baseline recorded in `docs/performance.md` ("Look System P0 baseline"): 1587 renders per 10 s (87 % audio-only), ScriptDuration 1.286 s, theme recalc 14.7 ms on `:root` (stage 1: 9.2 ms, ranges overlap), bundle unchanged.
  - Mismatches with the plan: the STATE check is a real test (no copies differ), not report-only; the sensor-store message counts were not re-measured.
- Things to know:
  - `tests/settings/connections.dom.test.tsx` ("saves the Twitch chat channel as a streaming patch") failed once under `verify:full` load (`expected [] to have a length of 1`), passed 3/3 alone and on the rerun. Pre-existing flake, not P0 code. Ledger L1.
  - The `surfaceOf` pin is a happy-dom reading (17 null rows, Chromium shows 12): it pins the code path, not the colours. Ledger L2.
  - `look-visual` images carry this PC's text rendering; another machine may need `--update-snapshots` before it passes. It is out of CI on purpose.
  - The overflow probe cannot see pseudo-elements; pack decorations are checked by the `--wp-pad` and 10 px rules (P9 test, P12 validator).
  - Theme-change recalc baseline is 14.7 ms on `:root` (stage 1 said 9.2 ms on a busy machine); compare later phases with the P0 number.
  - The sensor-store message counts (10 `*` and 92 audio messages per 10 s) were not re-measured in P0. Ledger L3.
  - `feature-map.test.ts` only sees tracked files: stage or commit new files before the unit run.
  - Agent worktrees start at `main`, not the phase branch: check out the phase commit first.


## P1: Single sources
- Plan entry: [docs/investigations/look-system.md, section 11, P1](../investigations/look-system.md)
- Checklist: all done. Expected changes confirmed (mismatches below); verify:full exit 0 (18 checks), check-fresh `fresh-pass`; v8 parity, `look-visual` and `overflow` unchanged; import-check passed; no CHANGELOG line (nothing user-visible); decision log: budget policy changed by the owner (below).
- Report:
  - One source: `src/looks/status.ts` (STATUS, STATUS_LIGHT), `src/looks/palette.ts` (DEFAULT_ACCENT, DEFAULT_ACCENT_RGB, DARK_TEXT), `src/looks/studio.ts` (exact Studio twins). STATE is built from STATUS; theme.ts, OsdStrip, KpiTiles, CoreHeatmap, look.ts, viz palette and gallery, SystemOverview, legacy-zones and components/surfaces.ts import them.
  - Generator `tools/looks/generate.mjs` (`npm run looks:gen`, `--check`) writes the `:root` fallbacks (`index.css`), the 15 twinned `--ui-*` values and 18 `s-*` aliases (`settings/tokens.css`), the audiocn status lines (`mixer-views.css`) and `src/looks/generated/gauge-theme.ts` (re-exported as `THEME` by `vector.ts`). Sync test `tests/looks/generated.test.ts`.
  - Deleted INSTR, surfaceColors, surfaceTokens, SURFACE_TOKENS, CARD_SURFACES.
  - D9 scans report-only: `tools/looks/scan.mjs` (`npm run looks:scan`, `report` of the new `looks` feature): 378 hex outside `src/looks/`, 4 blurs outside the cap, 1 `ui-*` in widgets (viz-gallery). NowPlaying cover blur allow-listed.
  - Review (sonnet, read-only): 0 critical/high/medium, 6 low, 3 info; built every bundle before and after and compared resolved custom properties: no colour changed, no var undefined.
  - Budgets: kiosk 276,741 B gzip (+114 B vs P0; limit 276,768, 27 B left), studio 617,079 B (+131 B). Not edited.
- Things to know:
  - The plan's kiosk saving was wrong: the deleted code was already tree-shaken out. Symbol reads cost a little more than literals gzip had already folded. Owner decided (2026-11-03): **each phase that goes over the kiosk limit stops and asks for a rise of its measured size** (replaces the Gate 2 hybrid policy).
  - No `info` status (no widget uses one); no light or theme variants of the gauge THEME (only one set exists); 18 aliases, not 21 (`s-green/amber/red` already aliased `--ui-ok/warn/danger`).
  - The 15 twinned `--ui-*` values moved from `index.css` into the generated block in `tokens.css`, because the Settings bundle imports only `tokens.css`.
  - `state-copies.test.ts` was adapted: the copies that became imports left the table; a repo-wide scan now fails on a status hex outside `src/looks/` and `mixer-views.css`.
  - `generate.mjs` needs Node 24 (it loads `src/lib/theme.ts` with type stripping).
  - `package.json` script changes make `npm run verify` escalate to a full run.
  - `src/lib/infopanel/elements/palette.ts` keeps `#FF…` copies of warn and crit (guarded by the state-copies test).
  - Review lows, deferred: L12 to L16.

## Ledger: known issues and deferred work

Open items carried between phases. Each phase adds what it finds or defers, and closes what it fixes (status `closed in P<N>`).

| # | Found | Item | Owner phase | Status |
|---|---|---|---|---|
| L1 | P0 | Flaky `tests/settings/connections.dom.test.tsx` Twitch-channel case under full-suite load | outside the Look plan | open |
| L2 | P0 | `surfaceOf` colours need a real-browser check when the 12 dropped cards are fixed | P3b | open |
| L3 | P0 | Sensor-store message counts not re-measured; re-measure with the audio fix | P2 | open |
| L4 | Stage 1 | Weather `weather_desc` text exports white on `matte-light` (§12 Q6) | owner call, not scheduled | open |
| L5 | Stage 1 | Two "ok" colours: `TONES.ok` follows the accent, `STATE.ok` is `#3CC97F` (§12 Q1) | owner call before P3a | open |
| L6 | Stage 1 | "Material" vs "Surface" as the UI word (§12 Q2) | P5 | open |
| L7 | Stage 1 | Where the widget decoration opt-out lives (§12 Q3; plan assumes a widget setting) | P9 | open |
| L8 | Stage 1 | Studio entry headroom 474 B: P5 gallery stays lazy (§12 Q4) | P5 | open |
| L9 | Stage 1 | Kiosk idle with no input device (§12 Q5; recommended input-only) | P9 | open |
| L10 | Stage 1 | Mockup widget kinds that don't exist (hourly weather, ping, mixer solo, stream stats): candidates only | out of scope | open |
| L11 | P0 | 9 icon names draw `CircleDashed` (known gaps in `icon-names.test.ts`) | P8 | open |
| L12 | P1 | Kiosk +114 B from object constants the minifier can't fold (`DEFAULT_ACCENT_RGB` spread, `STATUS_LIGHT.*`, `DARK_TEXT.*`); plain string constants would inline (probable, not bisected) | P7 (or the next phase that needs bytes) | open |
| L13 | P1 | Settings, Help and touch bundles carry 15 unused `--ui-*` declarations (~540 B raw each) | P7 | open |
| L14 | P1 | `bg-s-accent/N` non-color-mix fallback is now opaque `var(--color-s-accent)` instead of an alpha hex; only engines without color-mix see it | P7 | open |
| L15 | P1 | `looks:scan` hex rule matches only `#RRGGBB` (undercounts); state-copies scan is cwd-dependent and exempts all of `mixer-views.css` | P7 (when D9 scans become gates) | open |
| L16 | P1 | `generated.test.ts` would pass a duplicate hand-written `--color-s-*` after the generated block | P7 | open |
