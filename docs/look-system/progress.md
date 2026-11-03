# Look System progress

Filled in during stage 2 (see `02-implementation-runbook.md`, section 4). Every phase ends with a report, a "Things to know" list and updates to the ledger at the bottom, and is committed when done. Plan: [docs/investigations/look-system.md](../investigations/look-system.md), section 11.

| Phase | Branch | Status | Pixels | Report |
|---|---|---|---|---|
| Stage 1 | look/package | done (Gate 2 approved 2026-11-03) | none (investigation only) | [docs/investigations/look-system.md](../investigations/look-system.md) |
| P0 | look/p0-guardrails | done, awaiting go (2026-11-03) | none on screen; export: warn and crit rings export amber and red instead of blue (intended fix) | |
| P1 | look/p1-single-sources | done (2026-11-03) | none | |
| P2 | look/p2-performance | done (2026-11-03) | none for widgets; InfoPanel canvas cards with blur above 12 px get 12 px with Limit blur on (intended) | |
| P3a | look/p3a-data-viz-tokens | done (2026-11-03) | ramp start colour moves to the material fill (intended fix) | |
| P3b | look/p3b-material-registry | done, kiosk over its limit: owner call needed (2026-11-03) | intended: `brutal` offset inside the card edge; export draws 10 of the 12 dropped cards (outline and flat stay see-through); Look thumbnails fixed; blurred glass at 0.90 over a solid page; ramps start from every material; Classic otherwise none | |
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

## P2: Performance remainder
- Plan entry: [docs/investigations/look-system.md, section 11, P2](../investigations/look-system.md)
- Checklist: all done. verify:full exit 0 (18 checks) after the review fix, check-fresh `fresh-pass`; v8 parity, `look-visual` and `overflow` unchanged; CHANGELOG (Changed: canvas blur cap, NowPlaying blur off in lite mode, lower CPU with audio meters); decision log: kiosk budget raised with owner approval.
- Report:
  - Limit blur caps the InfoPanel canvas card backdrop (`ProfileView.tsx` via `cappedBlur`); the export keeps the full radius. Intended visible change for canvas cards above 12 px.
  - NowPlaying cover blur reads `--wp-art-blur` and is 0 under `[data-lite-motion]`; still allow-listed in `looks:scan`.
  - Zones that read every key skip audio-only messages (`touches(changed, prefixes, quiet)` in `sensor-stream.ts`, `useSensors(prefixes, quiet)`, `quietPrefix` in `placement-content.tsx`); a widget bound to an audio key still updates every message.
  - Measured (seeded demo page, 10 s; `docs/performance.md`, Look System P2): renders 1527 to 282 (audio-only 1327 to 82, the audio meter itself); clean ScriptDuration 1.276 s to 0.261 s (-80 %); TaskDuration 1.668 s to 0.601 s; store messages unchanged (92 audio, 10 full per 10 s), which closes L3.
  - Review (sonnet) found one HIGH: Visualizer and MeterBridge read audio keys without declaring them, so they would have updated at about 1 Hz. Fixed in `460f26ee`: they declare their reads (`registry/c.ts`), and a test fails if any widget using `useFastSensors` gets audio messages skipped.
  - Budgets: owner approved raising `kioskEntryGzipBytes` 276,492 to 276,847 (P2 adds 106 B). After the fix the kiosk is 276,842 B (limit 277,124); studio 617,147 B (budget 616,806, limit 617,422, inside slack).
- Things to know:
  - Not done from the plan: "canvas blur off on a solid page". A canvas card blurs the canvas items drawn before it, not the page, so the plan's evidence does not hold.
  - Visualizer and MeterBridge now render nothing when no key under their prefixes exists (same contract as AudioMeter); the fixtures did not change. Ledger L17.
  - Importing `AUDIO` from `widgets/audio-device` into the registry pulls that module into the kiosk entry (+700 B gzip); the registry uses string literals instead.
  - The studio entry is already above its budget (inside the slack); a phase that grows the studio will hit the limit. Ledger L18.
  - Any new readsAll widget that reads audio keys must declare them, or the scan test in `tests/components/studio/placement-content.test.ts` fails.

## P3a: T3 data-viz tokens
- Plan entry: [docs/investigations/look-system.md, section 11, P3a](../investigations/look-system.md)
- Checklist: all done. verify:full exit 0 (18 checks, rerun by the controller on the merged branch), check-fresh `fresh-pass`; intended diffs only (2 look-visual images, 64 heat strings in v8 parity); overflow unchanged; CHANGELOG (Fixed: ramp start); no decision change. No separate code review this phase (refactor with intended diffs pinned by parity and look-visual).
- Report:
  - `src/looks/t3.ts`: the 78 T3 names (`T3_TOKENS`) and Classic's value for each (`CLASSIC_T3`; literals, numbers, `{alias}`); build-time only, in no bundle. `src/looks/data-viz.ts`: the run-time values (RAMPS, `RAMP_START`/`RAMP_BASE`, ring spec, `GLIDE_MS`), imported by `theme.ts`, `primitives.tsx`, `viz/palette.ts`. The audiocn meter and mute vars in `mixer-views.css` are now generated from `CLASSIC_T3`. `ok` (T1, accent) and `status-ok` (T3, `STATUS.ok`) both stay.
  - Ramp start: accent ramps (`heat()`, `rampColor`, the visualiser Follow dim) start from `var(--w-fill, #18181c)`. The shell sets `--w-fill` only on light (`#f4f4f5`) and theme (`hsl(var(--card))`) cards, so dark cards and every non-heat markup are byte-identical (v8 parity changes only the 64 heat strings, checked by a replace-and-compare run). `look-visual` changes: `matte-light-CoreHeatmap.png` and `matte-light-SystemOverview.png` only (their coldest cells now start from the light card); glass images unchanged.
  - Coverage test `tests/looks/t3.test.ts` (D13): Classic defines every required token and no other, aliases resolve, values match the code; ramp start pinned per tone.
  - Kiosk 276,863 B gzip (+21 B; budget 276,847, limit 277,123), studio 617,175 B (+28 B, over its budget, inside slack). Budgets not edited.
- Things to know:
  - Not done: the 10 skin-id branches are still branches (no `ext` replacement), the 9 additions (`num-stretch`, ...) exist as contract names only, and T3 vars are not emitted per theme scope. Each costs kiosk bytes and has no pixel to show yet; they belong with P4 (variable families) and P8.
  - Dark materials other than the default keep `#18181c` as the ramp start (`solid` is `#141418`, gradients have no single fill): `--w-fill` is written for light and theme only. P3b's `--w-mat-*` replaces it.
  - `motion-fast`, `motion-base`, `ease-standard`, `series-stroke` and similar have no consumer yet; their Classic values are the contract's, not measured from code.
  - `CoreHeatmap` waterfall resolves `--w-fill` through the canvas (`fillStyle` round trip) so it matches the CSS heat cells.

## P3b: T2 material registry
- Plan entry: [docs/investigations/look-system.md, section 11, P3b](../investigations/look-system.md) and the T2 contract (section 9.3, D10 as changed).
- Checklist: done except the budget. verify:full --keep-going exit 1: 17 of 18 checks passed (incl. e2e, one-editor, overflow, look-visual, import-check, cargo-server, cargo-app), `budgets` failed (kiosk and studio over their limits, below); not run with `--allow-incomplete`. Pixel-identical refactor first (2 commits), then one commit per intended change (5); v8 parity regenerated twice on purpose and checked by script (below); `look-visual` and `overflow` unchanged; import-check passed; CHANGELOG (Changed: brutal, blurred glass; Fixed: export cards, thumbnails, ramp start); no decision change. No separate code review this phase.
- Report:
  - `src/looks/materials.ts`: the 27 stored surface names as one registry (`MATERIALS`: the generic set, the 11 skin cards, the app's four; each with `kind`, `tone`, `origin`, `export`, optional `fill`), the builders that were `components/surfaces.ts` (`makeSurface`, `makeSurfacePalette`), and one resolver (`resolveMaterial`: class, box, patch, scrim, export, fill, blur fallback) replacing `lookBox`, `patchBackground` and `scrimFor`. `BASE_SURFACES`, `LEGACY_SURFACES`, `SURFACES`, `SurfaceSpec` and the skins' `surfaces` blocks are gone; `resolveSurface` returns a registry entry. Kinds: 17 solid, 5 gradient, 3 glass (studio, vibrancy, glass), no lcd surface yet.
  - Pinned by `tests/looks/materials.test.ts`: every name's class, box under five look variants, patch and scrim equal the strings the old code produced (dumped at e522341b into `tests/looks/__fixtures__/surfaces-p3a.json`), except the two on purpose: vibrancy's blur moved from a Tailwind class to the same capped inline filter, and brutal's redesign.
  - Shell: writes `--w-mat-bg`, `--w-mat-shadow`, `--w-mat-blur`, `--w-mat-export`, `--w-fill` (and `--w-mat-fallback` on blurred glass) with `data-mat`, `data-tone` (`materialVars`); one static `[data-wp-tier][data-mat]` rule in `index.css` paints them. Panes (status bar capsule and pills, Stream Deck keys), the island (`wornSurface`), NowPlaying's art tint, the thumbnails and `panel-layout` take the box from the resolver.
  - v8 parity, checked by script both times: (1) the variables turned back into the properties they paint, `data-mat`/`data-tone`/`--w-mat-export` dropped, style declarations compared as sets: 128 cases, 128 shells, 0 differences; (2) with `--w-fill` dropped from both: 0 differences, every root gains `--w-fill:rgb(24, 24, 27)` (all 128 cases are glass).
  - Export (closes L2): `surfaceOf` falls back to `--w-mat-export` (resolved through a probe) when the background has no colour; `cssToArgb` reads `color(srgb …)`. Chromium colours for all 27 pinned by the new e2e spec `tests/e2e/material-export.spec.ts` (debug-only `__qaSurfaceOf` on the QA page), mapped on `looks` and `infopanel-import-export`. glass `#E618181B`, vibrancy `#E6323237`, studio `#0DFFFFFF`, tinted `#FF151D1D`, material `#FF1F3731` at the default accent; the 15 that exported before are unchanged. `import-check` (`npm run verify -- --feature infopanel-import-export`): 20 exports read by InfoPanel's XmlSerializer, passed.
  - Thumbnails: `MiniTile` sets the colour `--accent` (the look's, else the skin's unless light, else `hsl(var(--primary))`), so accent-mixed materials draw.
  - Blur fallback: a glass material with a real backdrop blur gets its background at alpha 0.90 (`BLUR_FALLBACK_ALPHA`) as `--w-mat-fallback`; over a solid page (where widget blur is already off) a rule paints it. Classic glass has no blur: unchanged.
  - Brutal: `inset -5px -5px 0 0 var(--accent)` inside the 2px white rule, no `calc(100% - 6px)` box. Shots: [before](../investigations/look-system/shots/p3b-brutal-before.png), [after](../investigations/look-system/shots/p3b-brutal-after.png).
  - Budgets (not edited): kiosk 277,447 B gzip (+584 B on P3a's 276,863; budget 276,847, limit 277,123: 324 B over); studio 617,808 B (+633 B on P3a's 617,175; limit 617,422: 386 B over).
- Things to know:
  - **Kiosk over its limit.** Measured by step: registry and resolver +410 B (the chunks stay as they were; the cost is the export strings, kinds and the resolver functions), the shell variables +96 B, blur fallback and ramp fill about +100 B. The plan's -0.2 to +0.3 KB assumed the per-widget inline style shrinking would pay; that saves render work, not bundle bytes. Per the owner's budget policy this needs an approved rise of the measured size, or the bytes back from somewhere else (L24).
  - The QA page's export hook first imported `convert-view`, which split the font parser into its own kiosk chunk (35 requests against the budget of 34, `kiosk-budget.spec.ts`); `surfaceOf` now lives in the import-free `src/lib/infopanel/native/surface-of.ts`.
  - Moving `SCRIM` out of `modern-chrome.tsx` into `src/looks` split `use-element-size` into its own kiosk chunk (+314 B): SCRIM stays in `modern-chrome` and the registry imports it from there.
  - Not done: alerts (`alert-layer.tsx`) and `panel-overlay.tsx` still draw `bg-card` / `bg-card/60`. There is no page material to take until P5's cascade, and moving them onto a registry material now would change their pixels on Classic (L25).
  - Not done: the resolver emits no `--w-mat-fg/-muted/-faint/-track/-border/-scrim` (text stays `--w-fg` etc., patch and scrim are resolver fields); materials keep their paint as CSS strings, not the contract's structured `fill-stops`, `spots`, `pattern`, `inset`, `tone: auto` (L26).
  - Export colours of the accent-tinted materials are srgb mixes (`color-mix(in srgb, …)`), so `surfaceOf` can read Chromium's `color(srgb …)`; the paint mixes in oklab, so they are close, not exact.
  - The blur fallback applies only where widget blur is switched off today (a solid page background); lite mode does not switch blur off (L27).
  - The deleted `src/components/surfaces.ts` stays matched in the feature map through `src/components/{widget-style,surfaces}.ts`, because `verify` maps deleted paths too.
  - Test pins changed on purpose: `surface-of.dom.test.ts` (P0's null rows flip; happy-dom still leaves theme, tinted and material null), `StreamDeck/look.test.ts` (vibrancy's blur is on the key's style, not its class), `Widget.test.ts` (`--w-mat-blur` instead of an inline `backdrop-filter`), the `lookBox`/`fadeBackground` cases moved from `look.test.ts` to `tests/looks/materials.test.ts`.
  - `StreamDeck/look.ts` still strips a material's `width`/`height`; no material sets them since brutal's redesign (L28).
  - Specificity (not changed, L29): the static `[data-wp-tier][data-mat]` rule is (0,2,0). A saved custom CSS `:scope` rule (0,1,0) lost to the old inline style and still loses; a selector of (0,2,0) or more (`:scope:hover { background }`) newly wins, which it could not before.
  - NowPlaying's art tint is an inline `style`, so it beats the `[data-mat-blur]` fallback rule: a tinted glass card over a solid page never gets the 0.90 fill (L30).
- Review (e522341b..21e398d4) and its fixes:
  - HIGH, fixed: the 0.90 blur fallback raised every rgba alpha, so `studio` (white highlight fills) became an opaque white card under a solid page. `opaquer` now raises only tint layers (a channel under 200); a card with none has no fallback (`studio` has none).
  - MEDIUM, fixed: at Surface opacity below 1 `tinted` and `material` compute to `oklab()` in Chromium, `rgbToArgb` returned "" and the card dropped from the export. `surfaceOf` reads such a colour through the canvas (as `decompose` does); e2e row added.
  - MEDIUM, fixed: outline, flat and ink set `--w-fill: transparent`, so `dim()` ramps went translucent and the CoreHeatmap canvas filled transparent. A see-through material's fill is `RAMP_START` (#18181c) again.
  - LOW, fixed: Classic glass starts ramps at exactly `#18181c` as before P3b (was `rgb(24, 24, 27)`); the frozen `v8-parity.json` `--w-fill` moves back to `#18181c` (it was refreshed in P3b for the old value; Classic is now strictly unchanged). Earlier note "every root gains `--w-fill:rgb(24, 24, 27)`" no longer holds.
  - LOW, fixed: `material-export.spec.ts` asserts in Chromium that the static rule paints background, box-shadow and backdrop-filter (vibrancy, brutal) and the blur fallback over a solid page.
  - LOW, fixed: stale brutal comment in `StreamDeck/look.ts`. The feature-map entry for the deleted `surfaces.ts` stays: `verify` reports the deletion unmapped while the branch is unmerged; drop it after the merge (L28).

## Ledger: known issues and deferred work

Open items carried between phases. Each phase adds what it finds or defers, and closes what it fixes (status `closed in P<N>`).

| # | Found | Item | Owner phase | Status |
|---|---|---|---|---|
| L1 | P0 | Flaky `tests/settings/connections.dom.test.tsx` Twitch-channel case under full-suite load | outside the Look plan | open |
| L2 | P0 | `surfaceOf` colours need a real-browser check when the 12 dropped cards are fixed | P3b | closed in P3b (e2e `material-export.spec.ts`, Chromium colours for all 27) |
| L3 | P0 | Sensor-store message counts not re-measured; re-measure with the audio fix | P2 | closed in P2 |
| L4 | Stage 1 | Weather `weather_desc` text exports white on `matte-light` (§12 Q6) | owner call, not scheduled | open |
| L5 | Stage 1 | Two "ok" colours: `TONES.ok` follows the accent, `STATE.ok` is `#3CC97F` (§12 Q1) | owner call before P3a | closed: owner kept both (`ok` in T1, fixed `status-ok` in T3), 2026-11-03 |
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
| L17 | P2 | Visualizer and MeterBridge render nothing without audio data (AudioMeter's contract); no render-on-audio-message test for them, only the scan test | P8 (when the audio widgets get hooks) | open |
| L18 | P2 | Studio entry 617,147 B is over its 616,806 budget, inside the slack (limit 617,422) | P5 (gallery must stay lazy) | open |
| L19 | P3a | 10 skin-id branches still branch on skin id instead of reading T3 tokens | P8 | open |
| L20 | P3a | The 9 D11 additions (`num-stretch`, `num-effect`, `graph-style`, `series-glow`, `cell-radius`, `label-glow`, `header-fill`, header `prompt` and `icon-badge`) are names only, no code | P8 | open |
| L21 | P3a | T3 `--w-*` vars are not emitted per theme scope yet | P4 | open |
| L22 | P3a | Dark materials other than the default keep `#18181c` as ramp start (`--w-fill` written for light and theme cards only) | P3b (`--w-mat-*`) | closed in P3b (the shell writes `--w-fill` from every material) |
| L23 | P3a | Classic T3 values without a consumer (`motion-fast`, `motion-base`, `ease-standard`, `series-fill-alpha`, `series-stroke`) are contract values, not measured | P8 | open |
| L24 | P3b | Kiosk entry 277,447 B gzip is over its limit 277,123 (+584 B on P3a: registry and resolver +410, shell variables +96, blur fallback and ramp fill about +100); studio 617,808 B over its limit 617,422 | owner call: approve the measured rise, or a phase pays it back (P7, L12) | open |
| L25 | P3b | Alerts (`alert-layer.tsx`) and `panel-overlay.tsx` still draw `bg-card`; no page material until the Look cascade | P5 | open |
| L26 | P3b | Resolver emits no `--w-mat-fg/-muted/-faint/-track/-border/-scrim` vars; material paint stays CSS strings (no structured `fill-stops`, `spots`, `pattern`, `inset`, `tone: auto`) | P4 (vars), P9 (structured fields when packs author materials) | open |
| L27 | P3b | Blur fallback alpha applies only over a solid page; lite mode does not switch widget blur off (section 8 G.6 cap "0 in lite mode") | P9 | open |
| L28 | P3b | `StreamDeck/look.ts` strips a material `width`/`height` that no material sets since brutal's redesign; the feature map keeps `src/components/{widget-style,surfaces}.ts` for the deleted file | P7 | open |
| L29 | P3b | Custom CSS of specificity (0,2,0) or more now beats the card background (the static `[data-mat]` rule is (0,2,0); inline style used to win) | P8 | open |
| L30 | P3b | NowPlaying's inline art tint bypasses the `[data-mat-blur]` fallback rule: a tinted glass card over a solid page keeps its own alpha | P12 | open |
