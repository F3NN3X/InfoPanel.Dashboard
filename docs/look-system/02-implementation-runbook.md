# Runbook: implementing the Look System and theme packs

**Use after** stage 1 (`01-investigation-brief.md`) has produced `docs/investigations/look-system.md` and the owner has said "go" at Gate 2.
**Authority, in order:** `AGENTS.md` and `docs/TESTING.md` → the approved plan in `docs/investigations/look-system.md` → `04-decision-log.md` → this runbook → `01-investigation-brief.md` and `03-theme-packs-spec.md` for design detail.
**Repo:** `E:\GitHub\MyRepos\InfoPanel.Studio`.

The investigation plan wins over the phase descriptions below wherever they differ. The phases here are the starting shape; the plan may have split, merged or reordered them.

---

## 1. How every phase runs

1. **Read.** The plan's entry for the phase, the decision log, and the files the phase touches at current HEAD. Confirm the "expected changes" below against the code; names drift. Write anything that doesn't match into the phase report.
2. **Branch.** `look/p<N>-<slug>` from the latest main (or the previous phase's branch if the owner keeps them stacked).
3. **Track.** Add the phase to `docs/look-system/progress.md` (template in Section 4) with its checklist before writing code.
4. **Build in small commits.** One concern per commit. Keep pixel-identical refactors separate from intended visual changes.
5. **Check** (Section 2). Every check, every phase. Exit 0 is the only pass.
6. **Document.** CHANGELOG (Unreleased), the widget specs in `docs/redesign/widgets/docs/widgets/` (`.md` and `.facts.json`) when a widget's look changes, and the phase report in `progress.md`.
7. **Gate.** Post the phase report: what changed, check results, pixel diffs and why they're intended, budget deltas, decision-log changes, anything skipped. **Stop and wait for "go"** before the next phase. The owner may approve a run of pixel-identical phases (for example P0–P2) in one go; only do that when told.

**Stop and ask** (don't push through) when:
- a fixed guardrail in `04-decision-log.md` would need to change;
- a decision needs to change (log it, then ask);
- parity or screenshots show an unintended diff you can't explain;
- a budget would rise;
- a saved-data migration is needed that the plan didn't specify;
- a test that pins current behaviour has to change and the plan didn't say it would.

---

## 2. Checks every phase runs

- `npm run verify` after each meaningful change; `npm run verify:full` before the phase report. Then `node tools/verify.mjs --check-fresh` must print `fresh-pass`.
- Per-kind render tests: every registered widget kind renders without throwing.
- v8 parity fixture (`tests/lib/__fixtures__/v8-parity.json`): pixel-identical phases expect an **empty** diff. For visual phases, regenerate only on purpose, read the diff, and list why each change is intended.
- Overflow probe (`overflow.mjs`, `ofdiff.mjs`, from the Widget QA page) at 1x1, 2x2, 4x2 and 4x4 on every touched widget. Non-roomy spans must not change.
- Before and after screenshots at the touched spans, on a dark and a light material (and, from P10, with each built-in pack).
- Bundle and perf budgets (`tools/perf/budgets.json`); raise only with the measured delta and the reason in the commit, and only after asking.
- The colour-literals guard (`tests/components/color-literals.test.ts`): caps go down, never up.
- From P1: the generated-file sync tests. From P3a/P5: the coverage test (every Look defines or aliases every required token) and the contrast test (D13).
- Saved data: `AppearancePreset`, `AppliedTheme`, follow and locks, and config round-trip tests pass; untouched widgets stay pixel-identical (defaults hazard).

- Data: tests and measurements never write to live data; use scratch copies (`DASHBOARD_DATA_DIR`, `INFOPANEL_STUDIO_CONFIG_DIR`), live sensors read-only, and the seeded demo data (`tools/perf/scratch.mjs`) where a check must be repeatable (brief §0 rule 7).
- New tests follow `docs/TESTING.md`; new checks and budget keys go into `tests/feature-map.json` in the same change (brief §0 rule 8). Never `--allow-incomplete`.

**Coordination:** a footprint-reduction effort may be running on the same repo. Don't fight it: check `budgets.json` and recent commits before raising anything, and prefer lazy-loading over bundle growth.

---

## 3. Phases

Each phase lists its goal, the **expected changes** (verify every path against the code first), what "done" means, and whether pixels change. "Plan" means the approved investigation doc.

### P0. Guardrails (no pixel change)
- **Goal:** lock today's behaviour down before anything moves.
- **Expected changes:** visual baselines for the Classic Look × every widget kind at 1x1, 2x2, 4x2, 4x4 (dark and light material); perf baselines from the plan's Part C (render counts, style recalc, blur layers, bundle); placeholders for the generated-file sync tests.
- **Done:** baselines committed and documented; CI runs them; no product code changed.

### P1. Single sources (no pixel change)
- **Goal:** one source for duplicated values; generated copies instead of hand copies.
- **Expected changes:** a status-colours module (ok, warn, crit, info) consumed by `STATE`, `TEXT_VARS`, `--ui-ok/warn/danger`, alerts and audiocn; a generator (Vite plugin or script, per D5) writing the `:root` fallbacks in `src/index.css`, `SURFACE_TOKENS` in `src/components/surfaces.ts`, the `s-*` values in `src/settings/tokens.css`, the audiocn fallbacks in `src/widgets/core/mixer-views.css`, and the export `THEME` table in `src/lib/infopanel/gauges/vector.ts`; one constant for the default accent (`#34d399` today); a do-not-edit header and a sync test per generated file.
- **Done:** every generated file in sync; colour-literal caps lowered by what was removed; parity diff empty. Near twins are not unified yet (P7).

### P2. Performance (no pixel change, except blur with Limit blur on)
- **Goal:** remove per-render waste and uncapped blur.
- **Expected changes:** a stable `useZoneLook` (`src/widgets/module.tsx`); the audio re-render fix (owner call, Gate 2): `readsAll` zones skip messages whose changed keys are all under `plugins.audio-level-meter.` unless the zone's bound sensors include that prefix, pinned by a renders-per-audio-message test (effort M); the remaining blur bypasses routed through the blur-cap helper (the InfoPanel canvas card backdrop); the NowPlaying cover blur allow-listed in the D9 lint as decorative art and switched off in lite mode, not capped by Limit blur. The memoised root style and scoped theme application were dropped (no gain, per the plan).
- **Done:** the plan's Part C measurements re-run with before/after numbers; parity diff empty; Limit blur now caps everything.

### P3a. T3 data-viz tokens (no pixel change, except ramp start colour)
- **Goal:** contract names and one source for data-viz values (Section 3.2 of the brief, D27).
- **Expected changes:** numbers, labels, series, status, meters (zones and peak hold), threshold lines and markers, ranges, controls (faders, toggles, mute, solo, live), icon colours, ramps, rings, charts, track and motion as `--w-*` tokens with `{alias}` defaults; `STATE`, `INSTR`, `RAMPS`, meter vars and `SkinTokens` fields read from them; ramps start from the material instead of `#18181c`.
- **Done:** coverage test passes for the Classic Look; parity diff limited to the ramp start colour, explained.

### P3b. T2 material registry (intended visual fixes)
- **Goal:** one registry and one resolver for every card material (Section 3.1, D10).
- **Expected changes:** base, skin-native and legacy surfaces merged into one registry; one resolver emitting the material CSS vars, with the blur cap, the `export` fallback and `blur-fallback-alpha` 0.90 built in; the `brutal` skin redesigned to paint its hard offset shadow inside the card edge (inset bar on two sides, full box kept; an intended visible change for every brutal widget, owner call); every consumer resolving through it: the shell, `AppearancePreview`, export `surfaceOf`, island, alerts, status bar, overlays, `primitives.tsx`, and the direct `surfaceColors` importers.
- **Done:** AppearancePreview matches ThemePreview for skins and all surfaces; gradient and glass no longer export as transparent; diffs listed and explained.

### P4. Variable families (no pixel change)
- **Goal:** one family per scope (D4).
- **Expected changes:** `--w-*` for panel content, `--ui-*` for chrome; colour accent renamed `--w-accent`; `--wp-accent`, `--wp-fg`, `--wp-muted` and `--wp-radius` stay aliased while saved custom CSS can use them (D4); `s-*` as aliases of `ui-*` (D2).
- **Done:** aliases in place; only the one-release shims get a removal note for P7; parity diff empty.

### P5. Look contract, cascade and UI (studio UI changes)
- **Goal:** the user-facing model: Looks, knobs, vocabulary (D6, D12, D14, D15).
- **Expected changes:** `src/looks/<id>/look.json` plus schema and registry; the Classic Look pinned as today's default; cascade storage as `lookId` plus overrides; **config v17** with a migration (round-trips `AppearancePreset`, `AppliedTheme`, follow and locks); the Look gallery and knobs (Accent, Material, Mode, Corners, Density, Variant); UI strings renamed (Look, Theme pack, Colours, Saved look); the Studio Look generating `ui-*` (D1).
- **Done:** migration tests for v16 → v17 pass; untouched widgets pixel-identical; studio screenshots before and after.

### P6. Light mode per Look (light Looks only)
- **Goal:** D3.
- **Expected changes:** `data-mode` on the theme scope; `@custom-variant dark (&:where([data-mode=dark], [data-mode=dark] *));`; per-mode status colours including `ok`, plus `accent-ink` for accent text and thin lines on light materials (D27); the `audiocn` `dark:` fix; the Paper Look; studio, Settings and Help stated dark-only.
- **Done:** contrast test passes for every light pair; dark Looks unchanged.

### P7. Clean-up (minor pixel change)
- **Goal:** finish what earlier phases deferred.
- **Expected changes:** one-release shims from P4 removed (not the custom-CSS `--wp-*` aliases, D4); near twins per the D2 table (13 take the `ui-*` value, 8 keep their own); the three reds folded (alerts take the widget crit red `#F2665E`; the studio danger stays its own `studio.*` role); lint rules from D9 enforced (no hex outside `src/looks/`, no blur outside the helper, no `ui-*` in widgets); guard caps lowered.
- **Done:** diffs limited to near twins, explained.

### P8. Slot plumbing and hooks (no pixel change with Classic)
- **Goal:** everything packs need, defaulting to Classic (theme packs spec; brief Appendix D).
- **Expected changes:** slot attach points in the page background component, the shell, primitives, island, status bar and alert layer (from the plan's Part H); decorations reach the card edge only through `--wp-pad`, ornaments at most 10 px; the pack loader's URL check (no non-relative URLs, no `@import`; where G4 is enforced); the 9 widget icon names that fall to `CircleDashed` mapped (intended fix); kiosk budget paid where possible, one measured rise of about 1 KB gzip expected for approval (G7); `data-part` hooks on card, header, label, num, unit, ring, bar, meter, spark, threshold, range, fader, icon, chip, button, status, alert; contract additions (gradient number fill, gradient border, ring 270°, segmented, ticks, `blocks` bars, meter zones and peak-hold styles, threshold lines, spike markers, range bars, fader knob shapes, display font, page layers); a shared icon component with the Classic icon set (D26).
- **Done:** every slot and variant renders with Classic pixel-identically; overflow probe passes for each new variant on a test widget.

### P9. Pack loader and effects (no pixel change with Classic)
- **Goal:** load built-in packs safely.
- **Expected changes:** lazy pack loading outside the main bundle; page background, layers (up to 3), overlay; effects with cost classes and fallbacks (lite mode, Limit blur, solid page background); burn-in setting (global shift and idle dim, D24); status bar and island style, island default edge with user override (`IslandConfig.edge`, D21); optional page templates (D20); app-drawn connectors; pack icon sets; `minSizeClass` per decoration (used later by display compatibility); Tauri asset config for pack fonts and images (the CSP allows remote images; the P8 loader's URL check is the enforcement).
- **Done:** a test pack exercising every slot loads and unloads cleanly; bundle unchanged for users without packs; `budgets.json` `packs` block added (each pack measured + 25 %, ceiling 500 KB, only down; layer budget 1 per card plus 3 per page).

### P10. First wave of packs (new packs only)
- **Goal:** prove the slot model with the three packs that cover the most slots.
- **Expected changes:** Field Kit, Tape '86 and Term as built-in packs, matching `mockups/` (fonts bundled as subset woff2, no runtime Google Fonts; original art only, D23).
- **Done:** contrast, overflow, parity and screenshots pass with each pack; each pack within its budget; a short write-up of slot catalogue changes the packs taught (logged in the decision log if decisions changed).

### P11. Second wave (new packs and Looks only)
- **Expected changes:** Neon Stripe, Overdrive, Swiss Mono and Holo packs; Night Glow, Paper, Classy Black, Liquid Glass and Black and Gold Looks.
- **Done:** as P10, for each.

### P12. Validator and user packs (built last)
- **Goal:** let users install packs safely (D17).
- **Expected changes:** pack validator (schema, asset list, URL check as in the P8 loader, paint-only rule for any pack CSS, contrast and burn-in lint); user packs loaded from a folder in the app data directory; pack CSS (level 3) only if P10–P11 showed a need. Sharing (Themely) stays off until the IP policy exists.
- **Done:** validator rejects a set of bad test packs (remote URL, JavaScript, layout CSS, missing asset, low contrast) and accepts the built-ins.

---

## 4. `progress.md` template

```markdown
# Look System progress

| Phase | Branch | Status | Pixels | Report |
|---|---|---|---|---|
| P0 | look/p0-guardrails | done / in progress / blocked | none | link or date |

## P<N>: <name>
- Plan entry: <link to section in docs/investigations/look-system.md>
- Checklist:
  - [ ] expected changes confirmed against HEAD (list mismatches)
  - [ ] implementation
  - [ ] verify, verify:full, check-fresh
  - [ ] per-kind render tests
  - [ ] parity: empty / intended diffs listed
  - [ ] overflow probe at 1x1, 2x2, 4x2, 4x4
  - [ ] screenshots dark and light (and per pack from P10)
  - [ ] budgets unchanged / delta measured and approved
  - [ ] CHANGELOG and widget specs
  - [ ] decision log updated (if anything changed)
- Report: what changed, results, diffs, budget deltas, open issues
```
