# Look System progress

Filled in during stage 2 (see `02-implementation-runbook.md`, section 4). Plan: [docs/investigations/look-system.md](../investigations/look-system.md), section 11.

| Phase | Branch | Status | Pixels | Report |
|---|---|---|---|---|
| Stage 1 | look/package | done (Gate 2 approved 2026-11-03) | none (investigation only) | [docs/investigations/look-system.md](../investigations/look-system.md) |
| P0 | look/p0-guardrails | done, awaiting go (2026-11-03) | none on screen; export: warn and crit rings export amber and red instead of blue (intended fix) | |
| P1 | look/p1-single-sources | not started | none | |
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
