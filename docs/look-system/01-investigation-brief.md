# Brief: InfoPanel.Studio Look System (unify themes, skins, surfaces)

**Repo:** `E:\GitHub\MyRepos\InfoPanel.Studio` (React 19, Tailwind v4, Vite, Tauri)
**Type:** Investigation only. You produce one findings and plan document. You change no product code.
**Baseline:** the sweep in Appendix B was taken at commit `b2b36b3d` (plus batch 13a token additions). Treat every claim in it as unverified.
**Package:** this brief is stage 1 of `docs/look-system/` (see its `README.md`). Stage 2, implementation, follows `02-implementation-runbook.md`. Decisions live in `04-decision-log.md`. The theme pack design is in `03-theme-packs-spec.md`; static mockups are in `mockups/`.
**Related:** widget sizing across screen sizes is a separate brief, `docs/look-system/05-display-compat-brief-LATER.md`, run after this one. Don't solve display compatibility here; only keep the hooks it needs (theme-pack `minSizeClass`, Appendix D).

---

## 0. Ground rules

1. Read these before anything else: `AGENTS.md`, `docs/TESTING.md`, `src/widgets/core/Widget.tsx`, `src/widgets/core/layout.ts`, `src/widgets/core/primitives.tsx`, `src/widgets/core/theme.ts`, `src/widgets/core/look.ts`, `src/widgets/core/tokens.ts`, `src/lib/theme-model.ts`, `src/lib/style-resolve.ts`. Their rules win over this brief where they conflict; note any conflict in the doc. Appendix C describes the widget styling pipeline and rules. Treat it as unverified input, like Appendix B: names drift.
1a. **Defaults hazard.** Saved settings store only the values that differ from the default, so a missing key means "use the default". Any change to a default, or to which Look is the default, changes every untouched saved widget. Every proposal that moves a default must say so, say how the plan preserves today's resolved look for untouched widgets (or that it changes it on purpose), and name the test that pins it.
2. **No changes to the main working tree.** For measurement instrumentation, create a throwaway git worktree (`git worktree add ../ips-look-scratch HEAD`). Summarise the scratch diff in the doc, then remove the worktree.
3. Every claim in the doc needs a `path:line` reference at current HEAD. Tag each one:
   - `CONFIRMED`: matches the sweep.
   - `CORRECTED`: the sweep was wrong or the code has moved. Give the old and new reference.
   - `UNCONFIRMED`: you could not verify it. Say why.
4. Every measurement needs: method, environment (OS, webview or Playwright Chromium), number of runs, median, and spread.
5. Do not change saved-data formats, migrations, guard caps, or `tools/perf/budgets.json`. Only propose changes to them.
6. Recommendations must say what they cost: added files, added indirection, bundle bytes. The aim is fewer concepts and fewer decisions for the user, not more layers.
7. **Data.** Never write to live data (`%LOCALAPPDATA%\InfoPanel\Dashboard`, the installed app's settings, `~/.claude`, `~/.codex`). Use real data where it exists: copy the live dashboard folder into a scratch folder and point `DASHBOARD_DATA_DIR` (and `INFOPANEL_STUDIO_CONFIG_DIR`) at the copy, and read live sensor readings from the running InfoPanel/HWiNFO Data API read-only. Where there is no live value, or a measurement must be repeatable (render counts, style recalc, budgets), use the demo data: `tools/perf/scratch.mjs` with `tools/perf/fake-data-api.mjs` (seeded). Say in each measurement which source it used.
8. **Tests stay inside `docs/TESTING.md`.** The D13 coverage and contrast tests are one case per behaviour, data-driven over Looks only where rows hit different branches, and keep `npm test` near 10 s. Any new check or budget key (per-pack size budgets included) goes into `tests/feature-map.json` in the same change.

### Approval gates

- **Gate 1:** after Parts A, B, C, E, G and H, post a short chat summary. Include the counts of confirmed, corrected and unconfirmed claims, the headline perf numbers, and any surprises. **Stop and wait for "go".**
- **Gate 2:** after the full document is written, post the phase list, the decisions that need my call, and any proposed decision changes (already written in `04-decision-log.md`). **Do not implement anything.** Implementation starts only when I say "go", and then follows `02-implementation-runbook.md`.

---

## 1. Goal

**User goal.** Today a user has to understand "theme" (three meanings), "skin" and "surface" to change how a panel looks. The target experience is:

1. Pick a **Look** from a gallery. Each card shows a real rendered thumbnail, a name and tags (minimal, technical, retro, neon, gaming and so on).
2. Adjust a few knobs: **Accent**, **Material** (surface), **Mode** (only if the Look supports light), **Corners** and **Density**, plus **Variant** for theme packs (D15).
3. Advanced users can fine-tune individual tokens, which is today's fine-tune UI.
4. Some entries in the gallery are **Theme packs**: a Look plus art, frames, header styles, data variants and effects, for themes with real art direction (retro VHS, cyberpunk, terminal, HUD and so on). Packs paint; they never move widgets. Appendix D has the full spec.

Everything then resolves from that one Look: the studio canvas, kiosk, widgets, chrome around widgets (alerts, island, status bar), previews and the InfoPanel export.

**Engineering goal.** One source of truth per concept, outputs generated from it instead of hand-copied, and no extra per-render cost.

---

## 2. Reference model: Open Design design systems

Source: https://feimacode.github.io/open-design-agent-kit/design-systems/ (look at `shadcn` and `hud`). Appendix A summarises the format, so you do not need web access.

### What to copy (the shape)

- **One fixed token contract that every system fills in.** Systems differ only in values, never in token names. That is what makes them swappable.
- **Each token is `{ name, value, usage }`.** A value can alias another token with `{other-name}`. A system can collapse a tier (for example `fg-2: {fg}`) without the contract changing.
- **Modes are explicit.** There is a `themes: [{id:"light"}]` list, and a written mode stance. HUD, for example, states that dark is its only mode by design.
- **A fixed-section design doc per system,** plus tags, a short description and a thumbnail for gallery browsing.
- **Rules are enforced by tooling,** not just written down. Open Design lint-enforces an accent budget of two or fewer visible uses per screen.
- **One source, generated outputs.** `tokens.json` produces `tokens.css` and other formats. A "Not synced" list records what each target cannot express. For example, `color-mix()` values get flattened to literals and lose their link to the source colour.

### What not to copy

- Web-page layout tokens (`section-y-*`, `container-*`). They don't apply to widgets.
- Their colour-and-shadow-only depth model. InfoPanel needs **materials** (solid, gradient, glass, blur, glow) and **data-viz tokens** (number type, graph series, meter ramps, ring, header) that the Open Design contract does not have. Sections 3.1 and 3.2 add them as two extra tiers built in the same way.
- Flattening derived colours into literals in the export where a generated link can be kept.

---

## 3. Draft target model (validate it against the code; don't assume it)

Treat this as a starting hypothesis. Change it where the code argues otherwise, and say why.

### Tiers

| Tier | Name | Contents | Who edits |
|---|---|---|---|
| T0 | Palette | Raw colours of a Look. Never referenced by components. | Look author |
| T1 | Semantic (fixed contract) | `bg, surface, surface-2, fg, fg-2, muted, border, border-soft, accent, accent-on, accent-hover, focus-ring, ok, warn, crit, info`, per mode | Look author; user via Accent and fine-tune |
| T2 | Material | The material contract in 3.1. Replaces `SurfaceDef` and the three surface sources. | Look author; user via Material knob |
| T3 | Data-viz | The data-viz contract in 3.2: numbers, series, status, meters, threshold lines and markers, ranges, controls, icons, ramps, rings, charts, headers, motion. Replaces `SkinTokens` fields and the scattered `STATE`/`INSTR`/`RAMPS` constants. | Look author; user via fine-tune |
| App | Studio chrome | `ui-*` and `s-*`, generated as aliases of a built-in "Studio" Look's T1 | Nobody at runtime |

Open Design has no tier like T2 or T3. They are the InfoPanel extension, built the same way: fixed names, `{ name, value, usage }`, `{alias}` defaults, so a Look only sets what makes it distinct and everything else falls back to T1.

### 3.1 Material contract (T2)

A material is a card recipe. Every material has a `kind`, and each kind has a fixed set of required fields. Optional fields default by alias. Draft:

| Token | Kinds | Default | Usage |
|---|---|---|---|
| `kind` | all | — | `solid`, `gradient`, `glass`, `lcd`, … (agent: derive the real list from the 12 base, 13 skin-native and 4 legacy surfaces) |
| `tone` | all | `dark` | Picks the text vars (`--w-fg/muted/faint/track`, plus warn/crit for light). Replaces `TEXT_VARS[tone]`. |
| `fill` | all | `{surface}` | Base colour. For glass, the tint. |
| `fill-alpha` | glass | `0.55` | Tint opacity over what is behind the card. |
| `fill-2`, `fill-angle` | gradient | `{surface-2}`, `180deg` | Gradient end colour and direction. |
| `blur` | glass | `12px` | Backdrop blur. **Always passes through the blur cap helper**: clamped by `--wp-blur-cap`, off on a solid page background, off in lite mode. |
| `saturate` | glass | `1` | Backdrop saturate (the island uses 1.4 today). |
| `blur-fallback-alpha` | glass | `0.90` | `fill-alpha` to use when blur is capped or off, so text stays readable. |
| `border`, `border-width` | all | `{border}`, `1px` | Card edge. |
| `highlight` | glass, lcd | `none` | Inner top-edge highlight (inset shadow). |
| `shadow` | all | `{elev-flat}` | Elevation token from T1 (`elev-flat`, `elev-ring`, `elev-raised`). |
| `glow`, `glow-radius` | all | `none`, `0` | Outer card glow. Colour usually `{accent}`. Costs a filter or shadow layer per card; counted in the perf budget. |
| `scrim` | all | derived | Colour behind text over cover art and banners (`scrimFor`). |
| `export` | all | `{fill}` | **Required solid colour for targets that can't render the material** (InfoPanel export, solid page background). This is the "Not synced" idea turned into data, and it fixes `surfaceOf` exporting gradient and glass as transparent. |

Rules the registry enforces:
- There is one registry. Base, skin-native and legacy surfaces become entries in it. `surface: "auto"` means "the Look's default material".
- Every consumer resolves a material through one function: the widget shell, `AppearancePreview`, export `surfaceOf`, island, alerts, status bar, overlays, `primitives.tsx`, panel overlay and the direct `surfaceColors` importers.
- The one function emits CSS vars (`--w-mat-*` or similar; the agent proposes names). Components never compute blur or alpha themselves.

### 3.2 Data-viz contract (T3)

Build this on what already exists. The `palette` cascade section (roles `s1..s6`, `ok`, `warn`, `crit`), `STATE`/`tone()`/`TONES`, `RAMPS`/`rampColor`, `INSTR`, `Num`/`numFont`/`numGlowStyle`, `UNIT_CLASS`, `ROOMY_SCALE`, `Ring`/`ringStroke`/`RING_TEXT`, `Spark`/`ChartAxis`/`ChartYAxis`, `Bar`/`TickBar`/`LedLadder`/`HoldMark`, and the audiocn meter vars. The contract gives each one a token name and a source. Draft:

| Group | Tokens (default) | Today |
|---|---|---|
| **Numbers** | `num-family` (`{font-mono}`), `num-weight` (600), `num-tracking`, `num-figures` (`tabular`, fixed), `num-glow` (`none`/`soft`/`strong`, colour `{accent}`), `unit-scale` (0.7em, fixed), `unit-color` (`{muted}`), `hero-weight` | `Num`, `numFont`, `numGlowStyle`, `UNIT_CLASS`, `--w-num-*`, `--w-hero` |
| **Labels and headers** | `label-case` (`upper`), `label-size` (`micro`), `label-color` (`{muted}`), `header-style`, `header-color` | `Stat` label, `SkinTokens.header` |
| **Series** | `series-1..6` (default: derived from `{accent}` plus fixed hue offsets), `series-fill-alpha`, `series-stroke` (px) | palette roles `s1..s6`, `SkinTokens.graph` |
| **Status** | `ok`, `warn`, `crit`, `info`, `idle`, `mute`; **per mode**, so light materials get readable warn and crit | `STATE`, `TONES`, `TEXT_VARS` light warn/crit, `--ui-ok/warn/danger`, `--alert-critical`, `--destructive`, `--channel-mute` |
| **Instruments** | `instr-*` (agent: list what `INSTR` holds) | `INSTR` |
| **Meters** | `meter-ok` (`{ok}`), `meter-warn` (`{warn}`), `meter-clip` (`{crit}`), `meter-track` (`{track}`), `meter-zone-style` (`hard` steps or `blend` gradient between zones), `meter-hold` (`{fg}`), `meter-hold-style` (`line`/`dot`/`block`), `meter-style` (`bar`/`led`/`tick`/`blocks`), `meter-segments`, `meter-gap`. Zone colours are Look; zone **breakpoints** (dB or %) are thresholds and stay outside the Look. | `SkinTokens.meter`, `--meter-ok/warn/clip`, `LedLadder`, `HoldMark`, audiocn meter vars |
| **Threshold lines and markers** | `threshold-line` (`{warn}`), `threshold-style` (`dashed`/`solid`/`dotted`), `threshold-width` (px), `threshold-label` (`{faint}`, 11px mono, fixed size), `spike-marker` (`{crit}`), `spike-shape` (`dot`/`tick`/`bar`). The line's **value** (for example a frame-time budget from the refresh rate, or a warn limit) comes from the widget's thresholds or data, never from the Look. | today: budget labels on `ChartYAxis`; no shared token |
| **Ranges** | `range-track` (`{track}`), `range-fill` (`{fg}`), `range-highlight` (`{accent}`), `range-cap` (`round`/`square`), `range-height` (px). For min–max bars such as a 5-day forecast or a value band. | none |
| **Controls** | `fader-track` (`{track}`), `fader-fill` (`{accent}`), `fader-knob` (`{fg}`), `fader-knob-shape` (`pill`/`bar`/`square`/`notch`), `fader-knob-glow` (`none` or a colour), `toggle-on` (`{accent}`), `mute-active` (`{crit}`), `solo-active` (`{warn}`), `live-indicator` (`{crit}`). Size and hit area are fixed by the app (44 px targets); a Look only paints. | `ChannelRow`, audiocn strips, button tile |
| **Icons** | `icon-color` (`{fg}`), `icon-muted` (`{muted}`), `icon-stroke` (px, for outline sets), plus the **icon set** chosen by the pack (Appendix D, D26) | per-widget inline icons today |
| **Ramps** | `ramp-heat`, `ramp-cool`, … as stop lists. **First stop aliases the material**, not a fixed `#18181c`. | `RAMPS`, `rampColor`, heat |
| **Rings** | `ring-width`, `ring-track` (`{track}`), `ring-cap` (`round`/`butt`), `ring-gap`, `ring-text` (type step) | `Ring`, `ringStroke`, `RING_TEXT`, `SkinTokens.ring` |
| **Charts** | `grid-line` (`{border-soft}`), `axis-label` (`{faint}`, 11px mono, fixed), `chart-height-cap` | `Spark`, `ChartAxis`, `ChartYAxis` |
| **Track** | `track` (alias of the material's text-vars `track`) | `--w-track` |
| **Motion** | `motion-fast`, `motion-base`, `motion-data` (value tweens), `ease-standard`. Transform and opacity only; lite motion and `data-ring-step` override. | scattered literals |

**Fixed in the contract, not per Look**: the type scale names (`nano` … `hero`), the 11px widget floor (StreamDeck key titles excepted), tabular figures, the 0.7em unit, the 11px axis labels, and "status is never shown by colour alone" (`ToneCue`). A Look can change the family, weight, glow and colour, never these.

**Not in the Look at all** (decided, D11): the `thresholds`, `format` and `css` cascade sections. Thresholds decide *when* a value is warn or crit, where meter zones break and where a budget line sits; the Look only decides *what those look like*.

### 3.3 Mapping the 11 cascade sections

Fill in and correct this table from the code:

| Cascade section | Goes to |
|---|---|
| `skin` | Look id |
| `colors` | T1 overrides |
| `palette` | T3 series and status overrides |
| `surface` | T2 material id plus overrides |
| `type` | T3 numbers and labels, plus the Look's font families |
| `spacing` | Density knob |
| `border` | Corners knob plus material `border` |
| `motion` | T3 motion |
| `thresholds`, `format`, `css` | Stay outside the Look |

### 3.4 Escape hatch

Theme packs (Appendix D) handle art, frames and effects through slots, so `ext.*` is only for token-level gaps. Some skins will have a feature the contract can't express. Allow a namespaced `ext.*` block per Look for those, but: the coverage test in Part G counts `ext` keys, the doc lists every one with the reason, and the target is to fold recurring ones into the contract. If more than a few skins need `ext`, the contract is wrong; say so.

### Data shape (hypothesis)

```
src/looks/<id>/look.json   # contract values + aliases, modes[], tags[], description
src/looks/<id>/LOOK.md     # optional: fixed sections as in Appendix A, trimmed for widgets
src/looks/index.ts         # registry, typed, schema-validated
```

- A **Look** absorbs what are today `SkinPack`, its native surfaces, and the matching `THEME_PRESETS` entry.
- The cascade (app, then screen, then page, then widget, with locks and follow) stores **`lookId` plus overrides** instead of separate theme, skin and surface keys, in **config v17** with a migration (decided, D6). The doc designs the migration.
- A theme pack adds a `pack.json`, assets, fonts, icons and optional templates beside `look.json` (Appendix D).
- **Generated, never hand-edited:** the `:root` fallbacks in `index.css`, `SURFACE_TOKENS`, the Settings and Help `tokens.css` values, the status-colour fallbacks in `mixer-views.css`, and the gauge `THEME` table in `vector.ts`. Each generated file gets a do-not-edit header and a test that fails if it is out of sync.
- **CSS variable families** (decided, D4): `--w-*` for panel content and `--ui-*` for app chrome, with `s-*` as aliases. shadcn HSL triplets stay internal to shadcn components. The colour accent is `--w-accent`, distinct from the shadcn `--accent` triplet.

### User vocabulary (decided, D14)

- **Look**: a settings-only pack of tokens.
- **Theme pack**: a Look plus assets and slots (Appendix D).
- **Colours**: T1 overrides.
- **Saved look**: an `AppearancePreset`.

List every UI string that has to change (`rg` the i18n and label sources).

---

## 4. Investigation tasks

### Part A: Verify the sweep

Produce a table with one row per claim in Appendix B. Columns: `# | claim | status | evidence path:line @HEAD | note`.

Start with:

```bash
git rev-parse HEAD
git log --oneline b2b36b3d..HEAD -- src/lib/theme.ts src/index.css src/settings src/widgets/core src/components/surfaces.ts src/components/widget-style.ts src/lib/theme-model.ts src/lib/infopanel
```

Useful searches. Adapt them; don't stop at the first hit.

```bash
rg -n "DEFAULT_THEME|THEME_PRESETS|SURFACE_TOKENS" src
rg -n "applyTheme\(|themeVars\(" src
rg -o "\b[a-z:-]*-ui-[a-z0-9-]+" src | wc -l           # ui-* class uses (check the ~4000 figure)
rg -o "\b[a-z:-]*-s-[a-z0-9-]+" src/settings src/help | sort | uniq -c | sort -rn | head -40
rg -n "\-\-wp-(fg|muted)" src
rg -n "\-\-accent\b" src
rg -n "surfaceColors" src
rg -n "useSkin\(" src | wc -l
rg -n "dark:" src --glob "*.tsx"
rg -n "@custom-variant|color-scheme" src index.html
rg -n "backdrop-blur|backdrop-filter|blur\(" src
rg -n "data-wp-tier" src
rg -in "#34d399" src
rg -o "#[0-9a-fA-F]{6}\b" src --glob "!**/*.test.*" --glob "!**/__tests__/**" | wc -l
```

Also check for the **React Compiler** (`rg -n "react-compiler" package.json vite.config.*`). If it is on, the memo findings in Part C change. State the result explicitly.

Do the same for **Appendix C** (widget pipeline), in a second table. Check every named function, constant, file, class and data attribute exists where it says, and that each rule is actually enforced or followed. Spot-check at least five widgets for "never read a look value straight from settings" and "never paint your own card background, border, radius or shadow", and list violations.

```bash
rg -n "settings\.(surface|skin|accent|radius|colors|palette)" src/widgets
rg -n "backdrop-blur|box-shadow|rounded-|bg-\[" src/widgets --glob "!**/core/**"
rg -n "fixedType" src/widgets
rg -n "TEXT_VARS|resolveAccent|chromeVars|ROOMY_SCALE" src/widgets/core
```

For the **status colours**, take each literal in `STATE` and `INSTR`, search it across `src` and the export code, and build a matrix: colour, then every file that defines or uses it, then whether it is a definition or a use.

### Part B: Token inventory matrix

Write a scratch Node script (in the worktree only) that parses every CSS custom property definition in `src/**/*.css` and every inline-var writer (`applyTheme`, `themeVars`, `Widget.tsx` root style, `chromeVars`, `tokenScope`, `panel-skin.tsx`, `mixer-views.css`). Output a table with these columns:

`var | family (shadcn / ui / s / w / wp / meter / alert / other) | defined at | value or source | approx consumers | proposed tier and contract name | action (keep / alias / generate / retire)`

Flag numeric twins and near twins, such as `s-accent-text` 0.84L against `ui-accent-text` 0.82L. For each one, say whether the difference looks intentional (check `git log -S` on the value).

### Part C: Performance measurements

Use instrumentation in the scratch worktree only.

1. **Widget render counts per data tick.**
   - Find or build a fixture page with about 20 mixed widgets, including at least one each of ring, spark, meter (mixer), stat grid and summary-hero, at both roomy and non-roomy spans. Where those widget kinds exist, also include a mixer with faders, now playing, and any FPS, frame-time or weather widget (Part H item 10). Check the Widget QA page, `tests/e2e` and the screen templates first.
   - Add a render counter, either a React `<Profiler onRender>` around each widget or a `useRef` counter exposed on `window.__renderCounts`. Feed mocked sensor ticks at a fixed rate for 10 s.
   - Report renders per widget per tick, split into widgets whose data changed and widgets whose data did not.
   - Check `useZoneLook` identity: log `Object.is(prev, next)` across ticks. Confirm or refute the claim that it returns a fresh object and defeats `useMemo([look])` and the `SkinCtx` value.
   - Then prototype a memoised zone look and widget root style in the scratch tree and re-measure. Report before and after.
2. **Style-recalc cost of a theme change.** Use Playwright with CDP:
   `newCDPSession` → `Performance.enable` → `getMetrics` before and after triggering a kiosk theme change. Record `RecalcStyleCount`, `RecalcStyleDuration`, `LayoutCount` and `LayoutDuration`. Use 5 runs and report the median.
   Prototype the scoped alternative (vars set on the page or theme-scope container instead of `:root`) and measure the same way.
   Note that Playwright Chromium approximates WebView2 (Windows) only. Say what remains unmeasured for WKWebView (macOS) and WebKitGTK (Linux).
3. **Blur layers on a typical kiosk page.** In the page context, walk every element and collect those whose computed `backdropFilter` or `filter` is not `none`, with their blur radius and source component. Report the count with **Limit blur** on and off. List every blur that bypasses `--wp-blur-cap`.
4. **Bundle.** Run the production build and the existing perf and size tooling (see `tools/perf/` and `budgets.json`). Record the sizes of the theme, skin and surface modules and of the CSS. These are the baseline for each phase's bundle delta.

### Part D: Export correctness

Using the existing import-check or export test harness, export one widget each on **glass**, **gradient**, **theme** and a skin-native surface. Confirm or refute that `surfaceOf` exports gradient and glass as transparent. Compare the gauge colours in the export with the live render for the default accent and for one non-default accent.

### Part E: Tests and guards that pin current behaviour

List every test that pins current behaviour. For each, give: path, what it pins, which phase is expected to change it, and whether a change would be intended or a regression.

```bash
rg -l "theme|surface|skin|appearance|applied|palette|widgetTheme" tests
```

At minimum this covers `tests/lib/theme*`, `appearance*`, `applied-theme*`, `surfaces*`, the per-kind widget render tests, the e2e perf budgets, the v8 parity fixture, import-check, and the colour-literals guard with its current caps.

### Part F: UX audit (the "easier to use" part)

Use Playwright screenshots in the scratch tree and put them in the doc. Then:

1. Count the clicks and controls needed today to:
   - change the whole look of a screen;
   - change only the accent;
   - change only the surface;
   - make one widget differ from its page;
   - save and re-apply a look on another screen.
2. Inventory the theme editor: every panel, picker and control in `theme-editor.tsx` and its siblings, with the concept each one edits (T1, T2, T3, cascade or preset).
3. List every place the same concept appears under different names in UI strings.
4. Check `AppearancePreview` against `ThemePreview` for the same config. Screenshot cases where the thumbnail is wrong, such as skins and non-legacy surfaces.
5. Propose the target journey using the Look gallery and knobs from Section 1, with the same click counts for comparison.

### Part G: Contract coverage for materials and data-viz

This part proves (or disproves) that the contracts in 3.1 and 3.2 can describe everything the app draws today.

1. **Skins × contract.** For all 14 skins, fill the T2 and T3 contract with the skin's real values, or mark the alias it would use. Script it in the scratch tree by importing `SKIN_PACKS` and dumping each skin's tokens. Output a matrix: rows are contract tokens, columns are skins, cells are value, alias or `GAP`. Every `GAP` is either a contract change you propose or an `ext.*` entry with a reason.
2. **Surfaces × material contract.** Same for every entry in `SURFACES` (12 base, 13 skin-native, 4 legacy). Flag duplicates that differ only by tone or alpha; those are candidates to merge.
3. **Hard-coded material and data-viz code.** List every place that implements a material or data-viz concept outside the shell and primitives: fixed blurs, fixed shadows, `bg-black/*` scrims, fixed hexes in ramps, `patchBackground`, local meter colours, local ring strokes. For each, give `path:line` and the contract token that would replace it.
4. **Readability.** For every Look and material pair that can be combined, compute WCAG contrast for `fg`, `muted`, `ok`, `warn`, `crit` and `axis-label` against the material's `fill` (and against `export` for glass). Use the `blur-fallback-alpha` composite for glass over a worst-case background. List the pairs below 4.5:1 (3:1 for large numbers). This is what "check warn and crit on light" becomes as a test.
5. **Export capability table.** For each T2 and T3 token, say whether the InfoPanel export can carry it (`yes`, `approximated: how`, `no: dropped`). This is the "Not synced" list for InfoPanel.
6. **Cost of glow and blur.** From Part C's blur-layer walk, add glow layers (`filter`, `text-shadow`, `box-shadow` with blur radius above 0). Give the count per typical kiosk page and what the contract would cap them at.

### Part H: Theme pack readiness

This part checks that the pack model in Appendix D fits the code, before any pack is built.

1. **Slot attach points.** For each slot in Appendix D, name the exact place it would attach (`path:line`): the page background component, the shell (`Widget.tsx`), the primitives, the island, the status bar and the alert layer. Say what has to change in each, and whether that change is pixel-identical with the Classic Look.
2. **`data-part` hooks.** List every element that would carry a `data-part` (the full list is in Appendix D), where it lives, and the cost: bytes, render cost, and any parity or overflow change. Hooks must not change markup structure.
3. **Variant inventory.** For every frame, edge, header, data, control, icon-set and status-bar variant in Appendix D, say whether today's shell and primitives can express it with a variant prop, or what is missing. Flag any variant that would change size, padding or row fitting: that breaks the "packs never move widgets" rule and must be redesigned.
4. **Prototype one pack.** In the scratch worktree, build **Field Kit** (Appendix D) as data only, with the minimum slot plumbing to render it on the ~20-widget fixture from Part C. Measure: layers (blur, glow, filter, mask), bundle delta, render cost per data tick, style-recalc cost of switching to it, and contrast results. Run the overflow probe at 1x1, 2x2, 4x2 and 4x4 for the fixture widgets. Remove the prototype with the worktree; put the numbers and the scratch diff summary in the doc.
5. **Page templates and connectors.** Check how screen templates work today (`lib/screen-templates/`) and how a pack could offer optional templates (D20). Say how connector lines could be drawn by the app from widget positions, and what that costs per layout change.
6. **Status bar position.** Find how the status bar and island are positioned today, and how a pack-default island edge with a user override (D21, `IslandConfig.edge`) would be stored. The Status bar widget has no position of its own.
7. **Fonts and assets.** Check the CSP and Tauri asset protocol: can pack fonts and images load from a pack folder inside the bundle (built-ins) and from the app data directory (later, user packs)? Name the config that has to change.
8. **Burn-in.** Find any existing pixel-shift or idle-dim behaviour. Propose where a global shift and dim setting lives and how decorations opt in.
9. **Icons.** Find how widgets draw icons today (an icon library, inline SVG, glyphs) and list every icon a widget uses, by widget. Propose the fixed icon name list for the icon set slot (D26), grouped as weather, transport and media, audio (mute, solo, mic, live), status, devices and navigation. Say how a pack supplies a set (an SVG sprite, or glyphs for text-based sets such as ASCII), how a missing icon falls back to the Classic set, and the bundle cost of one set.
10. **Widget kinds in the mockups.** The mockup canvas shows FPS with 1% and 0.1% lows, frame time with a budget line and spike markers, weather (now, hourly and 5-day ranges), a mixer with faders, meters, peak hold, mute and solo, now playing, calendar or agenda, ping, a process list and stream stats. For each, say whether a widget kind for it exists today (`src/widgets/registry/`), and whether its styling already goes through the shell and primitives. Kinds that don't exist are **out of scope** for this work: list them in the doc's open questions as candidates, with the T3 tokens they would need.

---

## 5. Decisions

Most direction is **decided** (2026-11-03). "Decided" means the default direction, **not locked**: the owner has said decisions may change if that is what it takes to make this work. For each decided item, the doc does not re-argue the choice when the code supports it. It gives the evidence from the code, the concrete design (names, files, shapes), the cost, and the risks. Items marked *open* still need a recommendation with alternatives.

**Changing a decision** (see `04-decision-log.md`):
1. You may propose changing any decision when the code shows it won't work, costs much more than expected, or a simpler option meets the same goal.
2. Write the change in the decision log: ID, old decision, proposed decision, evidence (`path:line`, measurements), impact on other decisions and phases.
3. Raise it at the next gate. **Never change a decision silently**, and never implement a changed decision before the owner says "go".
4. The **fixed guardrails** in `04-decision-log.md` (saved data round-trips and untouched widgets stay pixel-identical, the 11 px floor, no JavaScript or remote URLs in packs, the IP rule, accessibility rules, budgets only rise with a measured reason) are not decisions. Changing one needs the owner's explicit approval in chat, with the reason.

**Look system**

- **D1, changed (2026-11-03).** Studio chrome is a built-in, non-editable "Studio" Look: T1 plus a fixed `studio.*` extension block only it may carry. `ui-*` is generated from it.
- **D2, changed (2026-11-03).** `s-*` becomes an alias set of `ui-*`. Near twins follow a per-token table in the last phase (P7): 13 same-role pairs take the `ui-*` value, 8 different-role pairs keep their own.
- **D3, decided.** The studio app, Settings and Help are **dark-only, stated explicitly** in code and docs. **Panel Looks** may declare `modes: ["dark"]` or `["dark","light"]`, switched by a `data-mode` attribute on the theme scope, with `@custom-variant dark (&:where([data-mode=dark], [data-mode=dark] *));`. Fix the `audiocn` `dark:` use.
- **D4, changed (2026-11-03).** `--w-*` is the one family for panel content and `--ui-*` the one for app chrome. The colour accent is renamed `--w-accent`. `--wp-accent`, `--wp-fg`, `--wp-muted` and `--wp-radius` stay aliased as long as saved custom CSS can use them; the alignment `--wp-*` set stays.
- **D5, decided.** Looks and packs are JSON with a schema. Built-ins are generated at build time (Vite plugin or script); user packs are loaded at runtime. The doc gives the bundle and HMR cost and the generator design.
- **D6, decided.** The cascade stores `lookId` plus overrides. Config bumps to **v17** with a migration. The doc shows how `AppearancePreset`, `AppliedTheme`, follow and locks round-trip.
- **D7, decided.** Alerts, the island and the status bar follow the Look: material, frame and header.
- **D8, decided.** The export `THEME` table is generated, and every Look and pack has a "not exported" list. Art-heavy packs may also ship an optional pre-rendered background image for the export (Appendix D, `export`).
- **D9, decided.** Lint: no hex literals outside `src/looks/`, no blur outside the blur helper, no `ui-*` inside widgets. **No** accent budget. Enforced by extending the colour-literals guard; the doc names the files.
- **D10, changed (2026-11-03).** The final T2 material contract is the one in the investigation (section 9.3): 4 kinds, `blur-fallback-alpha` 0.90, `export` required, `--w-mat-*` vars.
- **D11, changed (2026-11-03).** Thresholds, format and css stay outside the Look; the Look only decides what warn and crit look like. The T3 list is the investigation's (section 9.4): 78 Look-settable tokens plus a fixed list.
- **D12, decided.** Today's default is pinned as a named Look, **"Classic"**, which existing configs keep. Untouched widgets stay pixel-identical. No snapshot of resolved values.
- **D13, decided.** The coverage test (every Look defines or aliases every required token) and the contrast test run in `npm run verify`. Per-pack overflow and parity run in `npm run verify:full`.
- **D14, decided.** Vocabulary: **Look** (settings-only), **Theme pack** (Look plus assets and slots), **Colours** (T1 overrides), **Saved look** (an `AppearancePreset`). List every UI string that changes.
- **D15, decided.** Knobs: **Accent, Material, Mode, Corners, Density**, plus **Variant** for packs. A pack may lock or limit knobs and must say why.

**Theme packs** (full spec in Appendix D)

- **D16, decided.** Three levels: Look (tokens only), Theme pack (assets plus slots), Pack CSS (level 3). **Plan the `data-part` hooks now; ship no pack CSS** until built-in packs show a real need.
- **D17, decided.** Built-in packs only at first. User-installable packs from a folder come later. **The pack validator is built last, once looks, slots and the built-in packs all work** (phase P12). Sharing packs (Themely is the intended distribution channel) is blocked until the validator and the IP policy exist.
- **D18, decided.** Animated backgrounds are allowed, transform and opacity only, and off in lite mode.
- **D19, decided.** Packs apply per screen. A widget may opt out of decorations but can't wear a different pack.
- **D20, decided.** Packs never move widgets. A pack may ship **optional page templates** the user can choose to apply (for example a radial cluster or a hero band). Connector lines between widgets are drawn by the app from a pack's connector-style slot; packs never position them.
- **D21, changed (2026-11-03).** A pack sets the **island's default edge** (top or bottom) and the style of the island and the Status bar widget. The widget's position stays with the page or template. The user can override the edge (`IslandConfig.edge`, stored only when set).
- **D22, decided.** Every slot variant in Appendix D goes into the catalogue, including the variants the newest samples need.
- **D23, decided.** Original names only: no game titles, logos, key art or licensed fonts in any pack, even personal builds. Fonts ship as subset woff2 inside the pack; no runtime Google Fonts.
- **D24, decided.** Burn-in protection (slow pixel shift of decorations, idle dimming) is a global setting. Packs declare their risk level (`static-safe`, `needs-shift`, `needs-dim`).
- **D25, changed (2026-11-03).** Slot attach points and hook rules are the investigation's (section 8a H1-H4). Decorations reach the card edge only through `--wp-pad`; ornaments are at most 10 px; no `!important` pack fills.
- **D26, changed (2026-11-03).** An **icon set** slot. Each pack supplies one icon set (for example outline in Holo, chunky in Tape '86, ASCII glyphs in Term) against a fixed icon name list. Missing icons fall back to the Classic set. Icons are coloured by the `icon-*` tokens. About 84 names (the Material Symbols ids widgets use), a JSON glyph map per set, per-name Classic fallback.
- **D27, changed (2026-11-03).** The T3 contract includes threshold lines and markers, min–max ranges, fader and toggle controls, meter zones and peak-hold style, and icon tokens (Section 3.2). Their values and breakpoints come from widget settings and data; the Look only paints them (D11). Status is per mode including `ok`, with an `accent-ink` for accent text on light materials.

---

## 6. The phased plan

Each phase must state:

- scope and files;
- whether it changes pixels (yes or no, and where);
- risk (low, medium or high, with the main failure mode);
- effort (S, M or L);
- bundle delta estimate, against the Part C baseline;
- impact on each `budgets.json` key;
- tests that change, and whether the change is intended;
- rollback;
- the widget checks it will run (see the list below).

**Widget checks every phase must plan for** (from Appendix C; confirm the commands exist):
- `npm run verify` per change and `npm run verify:full` before a PR; exit 0 is the only pass; then `node tools/verify.mjs --check-fresh` must print `fresh-pass`.
- The per-kind render tests: every registered widget kind renders without throwing.
- The v8 parity fixture: regenerate only when markup changes on purpose, read the diff, and state why each change is intended. For pixel-identical phases the expected diff is empty.
- The overflow probe (`overflow.mjs` and `ofdiff.mjs`, from the Widget QA page) at 1x1, 2x2, 4x2 and 4x4 on each touched widget. Non-roomy spans must not change.
- Before and after screenshots at the touched spans, on a dark and a light material.
- Bundle budgets for widget features; raise only with the measured delta and reason.
- A CHANGELOG (Unreleased) entry, and the widget spec in `docs/redesign/widgets/docs/widgets/` (`.md` and `.facts.json`) when a widget's look changes.

Pixel-identical phases come first. Treat this as a starting skeleton to reorder or split:

| Phase | Content | Pixels |
|---|---|---|
| P0 | Guardrails: visual baselines for N Looks × M widget kinds, sync tests for future generated files, perf baselines recorded | No |
| P1 | Single sources: status colours module; generate `:root` fallbacks, `SURFACE_TOKENS`, `s-*` values, audiocn fallbacks and the export `THEME`; `#34d399` from one constant. Near-twin unification is deferred. | No |
| P2 | Perf: stable `useZoneLook`, memoised widget root style, scoped theme application (if Part C supports it), every blur routed through the cap | No (blur cap: only with Limit blur on) |
| P3a | T3 data-viz tokens: status, series, meters, ramps, rings and numbers get contract names and one source; `STATE`/`INSTR`/`RAMPS`/meter vars become generated or aliased. Ramps stop using fixed `#18181c`. | No, except ramp start colour (intended) |
| P3b | T2 material registry: one registry, one resolver, blur cap and `export` fallback built in; every consumer resolves through it, including AppearancePreview, export `surfaceOf`, island, alerts, overlays and primitives | Yes, intended fixes |
| P4 | CSS variable family cleanup with alias shims (the custom-CSS `--wp-*` aliases stay, D4); accent rename | No |
| P5 | Look contract, `lookId` plus overrides, config migration, UI vocabulary, Look gallery and knobs | Studio UI only |
| P6 | Per-Look light mode (D3): `data-mode` on the theme scope, the `@custom-variant`, per-mode status colours, the `audiocn` `dark:` fix, and the Paper Look as the first light Look | Yes, light Looks only |
| P7 | Remove the one-release shims, unify near twins per the D2 table, fold the three reds, lower guard caps | Minor |
| P8 | Slot plumbing and `data-part` hooks in the shell, primitives, island, status bar and alerts; every slot defaults to Classic. Contract additions from Appendix D and D27 (gradient number fill, gradient border, ring, bar and meter variants, threshold lines and markers, ranges, fader and toggle tokens, display font, page layers). Shared icon component with the Classic icon set (D26) | No with Classic |
| P9 | Pack loader for built-in packs (lazy, outside the main bundle), page background, layers, overlay, effects with fallbacks, burn-in setting, status-bar style, island edge, optional page templates, connector slot, pack icon sets | No with Classic |
| P10 | Built-in packs, first wave: Field Kit, Tape '86, Term. These prove the slot model; fix the catalogue before the second wave | New packs only |
| P11 | Built-in packs, second wave: Neon Stripe, Overdrive, Swiss Mono, Holo; Looks: Night Glow, Paper, Classy Black, Liquid Glass, Black and Gold | New packs only |
| P12 | Pack validator (schema, asset list, URL check, paint-only rules, contrast and burn-in lint), then user packs from a folder. **Built last, once everything above works.** Pack CSS (level 3) only if P10–P11 showed a need | No |

The phase plan must give P8–P12 the same fields as the others (risk, effort, bundle, budgets, tests, rollback, checks), plus a size budget per pack in `budgets.json`.

---

## 7. Deliverable

A single file, `docs/investigations/look-system.md`, with these sections:

1. Summary: the top findings, the headline numbers, and the decisions that need my call.
2. Verification table (Part A).
3. Token inventory matrix (Part B). Put it inline, or in an adjacent CSV that the doc links to.
4. Perf measurements (Part C), with method and raw numbers.
5. Export findings (Part D).
6. Tests and guards pinning behaviour (Part E).
7. UX audit, current versus target journey, with screenshots (Part F).
8. Contract coverage (Part G): the skins × contract and surfaces × material matrices, the hard-coded list, the contrast results and the export capability table.
8a. Theme pack readiness (Part H): slot attach points, `data-part` cost, variant inventory, the Field Kit prototype numbers, templates and connectors, status bar, fonts and assets, burn-in. Include the `pack.json` schema as proposed, with Field Kit written in it.
9. Target model: the tiers; one contract table per tier (`name | usage | default value | aliases | consumers today`), for T1, T2 materials and T3 data-viz; the cascade mapping; the Look file shape; variable families; vocabulary. Include one complete example Look file (the current default) written in the proposed format.
10. Decisions D1 to D27: the design for each decided item, the recommendation for each open one, and any decided item the code argues against.
11. Phased plan.
12. Open questions and anything `UNCONFIRMED`.

Then stop at Gate 2.

---

## Appendix A: Open Design design-system format (summary)

**Files per system:** `DESIGN.md` and `tokens.css` (Open Design), plus `tokens.json`, `design-system.json`, `README.md` and a cover preview (Claude Design). Each system also has a name, description, tags and a thumbnail for the gallery.

**`tokens.json` shape:**

```
{ name, version, meta{source, upstream, synced},
  color: { themes:[{id,name}], tokens:[{name, value, usage}] },   // value may be "{alias}"
  type:  { families{display, body, mono}, groups:[{name, family, styles:[{name, fontSize, lineHeight, letterSpacing, usage}]}] },
  spacing{tokens[]}, radius{tokens[]}, shadow{tokens[]}, typeMetrics{tokens[]} }
```

**The fixed colour contract,** the same names in every system:

- `bg`, `surface`, `surface-warm`
- `fg`, `fg-2`, `muted`, `meta`
- `border`, `border-soft`
- `accent`, `accent-on`, `accent-hover`, `accent-active`
- `success`, `warn`, `danger`

Shadow contract: `elev-flat`, `elev-ring`, `elev-raised`, `focus-ring`. Radius contract: `radius-sm`, `radius-md`, `radius-lg`, `radius-pill`. Motion (Open Design only): `motion-fast`, `motion-base`, `ease-standard`.

**`DESIGN.md` and `README.md` sections,** fixed and numbered:

1. Visual Theme & Atmosphere
2. Color Palette & Roles (includes an explicit Dark Mode stance)
3. Typography Rules
4. Component Stylings
5. Layout Principles
6. Depth & Elevation
7. Do's and Don'ts
8. Responsive Behavior
9. Agent Prompt Guide

These are followed by a "Not synced" list: what the target format could not express and how it was approximated.

**Takeaway for InfoPanel:**

- Fixed names with per-system values make Looks swappable.
- `{alias}` lets a Look stay small.
- An explicit mode list and stance removes guesswork.
- The usage string per token documents itself.
- Tags and a thumbnail drive the gallery.
- "Not synced" maps directly onto the InfoPanel export limits.

---

## Appendix B: Sweep at `b2b36b3d` (unverified input)

These come from a read-only sweep. Items marked "probably" were never confirmed.

**Vocabulary.** "Theme" has three meanings: (a) the shadcn colour tokens `ThemeTokens`; (b) the widget-style cascade `widgetTheme`; (c) a saved `AppearancePreset` card. "Skin" is a widget design pack (`SkinPack`). "Surface" is a card material (`SurfaceDef`).

**shadcn tokens.**
- There are 19 HSL triplets (`src/lib/theme.ts:10-30`). `DEFAULT_THEME` is at `:46` and the 6 `THEME_PRESETS` at `:68-195`. `paper` is the only light preset.
- Tailwind maps them in `src/index.css:18-49` (`@theme inline`). The `:root` fallbacks at `:52-75` are a hand copy of `DEFAULT_THEME`.
- `applyTheme()` (`theme.ts:273`) writes about 20 inline vars on `documentElement`, in the kiosk only (`App.tsx:481-486`).
- `themeVars()` (`theme.ts:265`) scopes them for the studio canvas (`studio-canvas.tsx:609`, `data-theme-scope`), the theme preview (`profile-page.tsx:43`), appearance-preview and widget-qa.

**Studio chrome `ui-*`.** Defined at `src/index.css:80-162`, dark only. Theme edits never write these (comment at `:77-79`). About 4000 class uses.

**Settings and Help `s-*`.**
- A separate `@theme` in `src/settings/tokens.css:13-75`. Settings and Help do not import `index.css` (`settings.css:1-3`, `help.css:2`).
- Numeric twins: `s-win`=`ui-bg-app`, `s-card`=`ui-bg-panel`, `s-t1/t2`=`ui-text-1/2`, `s-muted`=`s-dim`=`ui-text-hint`, `s-input-line`=`ui-border-control`, `s-card-line`=`ui-border-subtle`.
- Near twin: `s-accent-text` is 0.84L, `ui-accent-text` is 0.82L.

**Widget scope `--w-*`.**
- Set inline on every widget root (`Widget.tsx:129-141`). `TEXT_VARS` per tone dark/light/theme are at `src/widgets/core/theme.ts:47-60`. The theme tone points at shadcn vars.
- `--w-hero` and `--w-num-*` are at `index.css:385-402`.
- `--accent` is set inline as a colour, but at `:root` `--accent` is a shadcn HSL triplet (`panel-skin.tsx:20-25`).

**Legacy `--wp-*`.**
- `chromeVars` (`src/components/widget-style.ts:122-157`) sets up to about 14 vars.
- `tokenScope` (`:98-107`) re-scopes `--accent`, `--foreground` and others as HSL.
- `src/components/surfaces.ts:51` reads `--wp-fg` and `--wp-muted`, while the shell sets `--w-fg` and `--w-muted`.

**audiocn bridge** (`src/widgets/core/mixer-views.css:6-52`).
- Re-maps shadcn tokens inside `.audiocn` to `--w-*` with `hsl(from …)`.
- Owns `--meter-ok/warn/clip` and `--channel-mute`, with hex fallbacks that mirror `STATE`.
- The LCD tone comes from `resolveSurface(...).tone` (`mixer-views.tsx:85`, `:441`).

**Gauge export mirror.**
- `src/lib/infopanel/gauges/vector.ts:35-42` holds a hand-copied `THEME` table. Live uses `var(--accent, #34D399)`; bake uses fixed hexes.
- `surfaceOf` (`lib/infopanel/native/convert-view.ts:140-148`) reads the computed `backgroundColor`, so gradient and glass probably export as transparent.

**Dark and light.**
- There is no runtime switch. `<html class="dark">` is static (`index.html:2`). Settings, Help and touch hardcode `color-scheme: dark`.
- No `@custom-variant dark` exists. The only `dark:` use is `components/ui/audiocn/lcd-display.tsx:38`, which probably follows the OS (the Tailwind v4 default) rather than `.dark`.
- "Light" exists only as the `paper` preset and the `matte-light` / `tone:"light"` surface.

**Skins.**
- `SkinTokens` (`src/widgets/core/types.ts:98-117`) covers surface, radius, accent, font, num*, glow, graph, meter, header and ring.
- 14 packs live in `src/widgets/core/skins/`, ordered by `SKIN_PACKS` (`core/theme.ts:23`). There are 13 skin-native surfaces.
- The skin is stored as the look key `skin`. "auto", "default" and unset are normalised in `lib/theme-skins.ts:10`.
- A skin reaches a widget three ways: widget props (`Widget.tsx:88`, `:104-105`), `SkinCtx`/`useSkin()` (`theme.ts:101-102`, about 20 callers), and inline vars.
- `skinContext()` (`look.ts:59-77`) merges overrides.
- `PanelView` is not a core Widget. `panel-skin.tsx:34-39` re-maps `--w-*` onto shadcn and provides its own `SkinCtx`.

**Surfaces.**
- `SurfaceDef {c, s, tone, colors?}` is at `widgets/core/surfaces.ts:10-16`.
- `SURFACES` (`core/theme.ts:25-28`) merges three sources: 12 `BASE_SURFACES` (`surfaces.ts:21-34`), the skin-native surfaces (forced to `tone:"dark"`, `theme.ts:26`), and 4 `LEGACY_SURFACES` (glass, matte-light, matte-dark, theme; `components/surfaces.ts:42`).
- The default is glass (`surfaces.ts:58`).
- `surface:"auto"` resolves to the skin's surface, else studio or solid (`theme.ts:38-42`). `withSkinSurface` is at `widgets/module.tsx:60-64`.
- Only the `theme` surface uses shadcn tokens (`components/surfaces.ts:32-39`). `SURFACE_TOKENS` (`:175-179`) is a third copy of `DEFAULT_THEME`.

**Widget-style cascade** (`lib/theme-model.ts`).
- Order: `THEME_DEFAULTS`, then the app layer, then `MonitorProfile.widgetTheme` (values and locks), then `ProfilePage.widgetTheme` (values and follow), then `Placement.follow` plus the widget's own settings.
- 11 sections at `:23-48`. Resolution happens in `lib/style-resolve.ts` and `theme-model.ts:257`.
- The colour layer is `MonitorProfile.theme/.radius/.background` (`lib/layout.ts:231-237`), per screen since config v16.
- Saved and applied state:
  - `AppearancePreset` (`lib/appearance-presets.ts:16-34`);
  - the `AppliedTheme` snapshot, diffed for "changed since applied" (`lib/applied-theme.ts`);
  - built-in template themes (`lib/screen-templates/looks.ts`);
  - `config.palettes` (`lib/palettes.ts`).
- Apply and reset are in `lib/theme-apply.ts`; they respect locks and write zone settings.
- Migrations: `layout.ts:307-314` and `lib/settings-migrate.ts`.

**Chrome around widgets.**
- **Island:** `pageSkinOf` (`components/island/island-look.ts:21-26`) and `wornSurface` (`island-page-skin.ts:9-19`). It has its own shadow and a fixed `blur(14px) saturate(1.4)`.
- **StatusBar:** draws the zone clear and lets the pill carry the surface.
- **Alerts:** use `bg-background`/`bg-card` with a fixed `backdrop-blur-[8px]` (`alert-layer.tsx:107`, `176`, `204`) and `--alert-critical`. They are not skin-aware.
- **Page background:** `components/page-background.tsx`. A solid background kills widget blur (`index.css` around line 412).
- `data-wp-tier` is really the size tier, but it is overloaded as a CSS selector and as the export anchor.

**Studio theme UI.**
- The editor is `theme-editor.tsx` (584 lines) plus `theme-cards`, `theme-editor-model`, `theme-scope-bar`, `theme-look-card`, `theme-pickers`, `theme-palette-picker`, `theme-part-pickers` (SkinPicker), `theme-fine-tune*`, `theme-differences`, `theme-exceptions` and `make-theme-dialog`. Token rows are in `theme-rows.ts`.
- `ThemePreview` renders the real page.
- `AppearancePreview` (`appearance-preview.tsx:45-64`) is a CSS thumbnail that only understands the 4 legacy surfaces and ignores skins.

**Duplication.**
- `DEFAULT_THEME` exists in three places: `theme.ts`, `index.css:53-71` and `components/surfaces.ts:175-179`.
- Status colours have no shared source. They appear in: `STATE` (`#3CC97F/#EDB232/#F2665E`, `core/theme.ts:127`) and `INSTR` (`:70`); the `vector.ts` `THEME`; the `mixer-views.css` fallbacks; `TEXT_VARS` light warn/crit; `--ui-ok/warn/danger`; `--alert-critical`; and `--destructive`.
- `#34d399` appears in about 10 files.
- There are three text-colour families (`--w-*`, `--wp-*` and shadcn `--foreground`), and `--accent` means two different things.
- About 750 six-digit hex literals sit in `src` outside tests.
- These components bypass the surface pipeline: `panel-overlay.tsx:91`; `primitives.tsx:824` (`bg-black/45 backdrop-blur-md`); library-views; and direct `surfaceColors` imports in `NowPlaying.tsx`, `PanelView.tsx` and `panel-layout.ts`.
- Fixed hexes ignore the surface: `patchBackground` (`look.ts:36`) and `rampColor`/heat (`#18181c`).

**Perf.**
- The widget root style is rebuilt on every render with no memo: about 10 properties by default, about 25 when fully customised. `ROOMY_SCALE` and the type scale are literals at `Widget.tsx:84`.
- `useZoneLook` (`widgets/module.tsx:78-85`) probably returns a fresh object on every render, which would defeat `useMemo([look])` for chrome and the skin context (`Widget.tsx:89`, `:105`). `useSkin()` consumers would then re-render on every data tick.
- A kiosk theme change writes about 20 vars on `:root`, which recalculates style for the whole document.
- Limit blur (`--wp-blur-cap`, 12px, `hooks/use-performance.tsx:56`) caps `blurFilter` and macOS only. It does not cap the Tailwind `backdrop-blur-*` uses in primitives, alerts and panel-overlay. The island blurs at a fixed 14px.

**Migration and safety requirements.**
- Saved data must round-trip: config v16, `AppearancePreset`, `AppliedTheme`, and the follow and lock semantics.
- The InfoPanel export (import-check) must still pass.
- The v8 parity fixture may show intended diffs only.
- The colour-literals guard caps can only be lowered, never raised.

---

## Appendix C: Widget styling pipeline and rules (unverified input)

Verify every name here in Part A. Where a rule matters to the target model, say whether the model keeps it, changes it, or turns it into a lint.

**Registration.** A widget kind is a module (`src/widgets/module.tsx`). Its settings schema is in `src/widgets/registry/*.ts` (for example `audio-settings.ts`, `b.ts`). Saved settings store only the values that differ from the default; a missing key means the default. Changing a default therefore changes every untouched saved widget. That is a product decision: ask first, add a test, and write it in the CHANGELOG.

**Cascade** (`src/lib/theme-model.ts`, `src/lib/style-resolve.ts`).
- Order: `THEME_DEFAULTS`, then the app layer, then the screen (`MonitorProfile.widgetTheme`, values and locks), then the page (`ProfilePage.widgetTheme`, values and follow), then the placement (`Placement.follow` per section, plus the widget's own settings).
- 11 sections: skin, colors, palette, surface, type, spacing, border, css, format, thresholds, motion. A section that follows the theme ignores the widget's own stored values for that section.
- Never read a look value straight from settings; take it from the resolved look.

**Skin** (`src/widgets/core/skins/*.ts`, `SKIN_PACKS` in `core/theme.ts`). A token pack: surface, radius, accent, font, num style, glow, graph, meter, header and ring. `skinContext()` (`core/look.ts`) merges it with the user's look overrides. Widgets read it through `useSkin()` (`SkinCtx`), not through props drilled by hand. `skin: "auto"`, `"default"` and unset all mean Default.

**Surface** (`core/surfaces.ts` plus `components/surfaces.ts`, merged into `SURFACES` in `core/theme.ts`). A card material `{c, s, tone: dark|light|theme}`. `surface: "auto"` means the skin's own surface. `withSkinSurface` (`widgets/module.tsx`) picks the explicit surface, then the skin's, then the module fallback. The tone decides the text vars. Skin-native surfaces are dark.

**Shell** (`core/Widget.tsx`) owns the card.
- It sets the radius, font, surface box, colour and the text vars `--w-fg/--w-muted/--w-faint/--w-track` (plus `--w-warn/--w-crit` on light and theme tones). They come from `TEXT_VARS[tone]`.
- It also sets `--accent` (a colour, via `resolveAccent`), the user's chrome vars (`--wp-*`, from `chromeVars`), the size tier `data-wp-tier` (xs/sm/md/lg), and on roomy boxes the type-scale vars (`ROOMY_SCALE`) and `--w-hero`.
- The widget body only draws content. It never paints its own card background, border, radius or shadow.

**Size.** `useBox()` gives the box; `tierOf`, `shapeOf` and `summaryShape` classify it. `roomy(w,h)` (4x4 class) is the only switch for growing type, rows and heroes; non-roomy spans must stay pixel-identical when roomy behaviour changes. `fixedType` opts a widget out of the roomy type scale, only when its layout cannot grow (MenuBar, AudioMeter, WaveLink and StreamControl use it).

**Compact and summary.** Small spans draw through the shared compact or summary-hero path (`core/summary-hero.tsx`: `tileHero`, `squareHero`, `afterHero`). Its options (lead, blur and others) apply at every span, so privacy settings flow through. Example: NetworkAdapters passes `blur: p.hideIp`.

**Colour and type rules.**
- Use tokens, never literals. Inside widgets: `var(--w-fg|--w-muted|--w-faint|--w-track)`, `var(--accent)`, and `mix()`/`hue()` from `core/tokens.ts`. Status colours: `STATE` and `tone()`/`TONES`. Data colours: `RAMPS`/`rampColor`, `INSTR`, and the palette roles `s1..s6`, `ok`, `warn`, `crit`.
- Studio chrome uses `ui-*`; Settings and Help use `s-*` (they load `tokens.css` only, so `ui-*` doesn't resolve there). Widgets never use `ui-*`; a fixed widget surface takes a widget-scope token from `src/index.css`. Check that a class's token exists in the stylesheet that bundle loads, otherwise Tailwind silently emits nothing.
- `tests/components/color-literals.test.ts` caps literals and arbitrary text sizes. Lower the caps when one is removed; never raise them.
- Type stays on the scale: `text-nano, micro, caption, body, title, lead, head, display, hero`. The widget floor is 11px; the only exception is StreamDeck key titles, which may go down to 8px on the smallest keys.
- Numbers use the skin's num style (`Num`, `numFont`, `numGlowStyle`) and tabular figures.
- Units are not part of the value string. Pass `{ value, unit }` to `Stat`/`StatGrid`/`Metric`; the unit draws at about 0.7em with `UNIT_CLASS`. Use a formatter's parts form (`gbParts` beside `gbStat`); add one, with a unit test, when it is missing.
- `--accent` inside a widget is a colour; at `:root` it is a shadcn HSL triplet. Never read the root one from a widget.

**Primitives.** Reuse them; don't hand-roll variants.
- Rings: `Ring`, `RingStack`, `ringStroke`, `RING_TEXT`. One ring style everywhere.
- Sparklines and charts: `Spark` (gridlines, height cap, Peak/Avg/Min row), `ChartAxis`, `ChartYAxis` (11px faint mono labels, budget label on the axis).
- Bars and rows: `Bar`, `BarRow`, `TickBar`, `LedLadder`. Peak hold is `HoldMark` + `holdPct`, moved by transform inside the track.
- Stats: `Stat`, `StatGrid` (uppercase micro label, tabular 15/600 value, 0.7em unit).
- Mixer rows: `ChannelRow` (stereo and trailing slots), shared by StreamMixer, VolumeMixer and WaveLink. The Strips and LCD views use the vendored audiocn components in `src/components/ui/audiocn/` (MIT; keep the LICENSE), re-tinted to `--w-*` by `core/mixer-views.css` and fitted by `core/mixer-fit.ts` (strips shrink before channels hide).
- Others: `Chip`, `Pill`, `Segmented`, `Dot`, `ToneCue` (status shown with a cue, not by colour alone), `Empty` (empty states name the next step), the button tile (`core/button-tile.tsx`) for Audio and OBS buttons, and the text scrim (`scrimFor`) behind text over cover art and banners.

**Layout.**
- Rows come from `fitRows`, `fillRows`, `useFitRows`, `rowsFor` and `rowPx`. No fixed px row height that ignores roomy.
- Whole rows only, never a half-cut row (see StreamChat's `useWholeRows`).
- When space is short, drop items by priority (`stackShown(byPriority)`), never clip.
- Square frames stack bars into tiles (`stacksIn`, `fitGrid`). Big list widgets lead with a summary number at 4x4.
- Nothing may clip or overflow unless deliberate; mark a deliberate bleed with `data-qa-bleed`. `.sr-only` is the one 1px clip by design.

**Behaviour.**
- A widget that can't write (refused, or wrapped in `ReadOnly`, which is inert) is neither focusable nor clickable, but still shows its state.
- Writable controls are real controls: sliders have `role="slider"`, aria values and keyboard steps (arrows 1, Page 10, Home/End). Read-only levels use `role="meter"`.
- Privacy settings (Hide IP and similar) apply at every span and in every view, including compact.
- Motion animates transform and opacity only, never width or layout. It respects lite motion (`data-lite-motion`), `data-ring-step` and the blur cap (`--wp-blur-cap`). Blur on a solid page background is switched off automatically; no new `backdrop-blur-*` that bypasses the cap.
- Don't hard-code dark. Light surfaces (`matte-light`, `tone: "light"`) and the `paper` preset must stay readable; check warn and crit on light.

**Checks before a widget change is done.**
- `npm run verify`, and `npm run verify:full` before a PR. Exit 0 is the only pass. Then `node tools/verify.mjs --check-fresh` must report `fresh-pass`.
- Every registered widget kind renders without throwing (the per-kind tests). Value formatting and the saved-data schema are critical areas and need tests.
- Parity (`tests/lib/__fixtures__/v8-parity.json`): regenerate only when markup changes on purpose, read the diff (only touched widgets and spans may change), and state why each change is intended.
- Overflow probe (`overflow.mjs` and `ofdiff.mjs`, from the Widget QA page) on each touched widget at 1x1, 2x2, 4x2 and 4x4. No new clipping or overlap.
- Before and after screenshots at the changed spans, on a dark and a light surface.
- Bundle budgets (`tools/perf/budgets.json`) for widget features: raise only with the measured delta and the reason in the commit. Lazy-load heavy views, as the mixer views and PageThumb do.
- CHANGELOG (Unreleased) entry, and the widget's spec in `docs/redesign/widgets/docs/widgets/` (`.md` and `.facts.json`).

---

## Appendix D: Theme packs (decided spec)

Decided 2026-11-03. Mockups: static copies in `docs/look-system/mockups/` (open `index.html`; Playwright can screenshot them at native size); the live canvas is https://claude.ai/artifact/T1imW2kxfdMud58HgXoBS8. Every pack, plus Night Glow and Paper, has a full board; Classy Black, Liquid Glass and Black and Gold appear only as gallery thumbnails, and Classic is today's app. The first boards show the same six widgets so only paint changes; later boards use other page layouts and page types (gaming, desk, stream, home, cockpit) to show that layout belongs to the page, not the pack.

**The rule:** the app owns where things go (position, size, row fitting, what is shown or dropped, privacy blur, focus, overflow). The pack owns how things look. Packs contain no JavaScript and no remote URLs.

### Levels

| Level | What it is | Can change | Ships |
|---|---|---|---|
| 1. Look | Tokens only (T1, T2, T3) | Colours, materials, fonts, glow, data variants (slot 8), gradient numbers, frames `plain`, `hairline` and `gradient-border`, page background colour, gradient or a built-in pattern (dots, grid, hex) | Yes |
| 2. Theme pack | A Look plus assets plus slot choices | Level 1 plus page art, overlays, all frames, edges, ornaments, header styles, icon set, status-bar style and default position, effects, optional page templates | Yes, built-in first |
| 3. Pack CSS | One stylesheet scoped to `[data-look=id]` in `@layer look`, paint properties only, targeting `data-part` hooks | Any paint property on a part | Hooks now; CSS only if P10–P11 show a need |

### Pack folder

```
looks/<id>/
  look.json      tokens (T1 colours, T2 materials, T3 data-viz)
  pack.json      slots, assets, fonts, effects, knobs, variants, fallbacks, export, burnIn, templates
  pack.css       level 3 only
  assets/        images and SVGs, each listed in pack.json
  fonts/         subset woff2
  icons/         icon set: an SVG sprite, or a glyph map for text-based sets (D26)
  templates/     optional page templates (opt-in)
  thumb.avif     gallery thumbnail rendered from the real app
  LOOK.md        fixed-section design notes (Appendix A)
```

`pack.json` fields: `id`, `name`, `version`, `tags`, `description`, `modes` (plus a written mode stance), `slots`, `assets`, `fonts`, `effects` (each with a cost class: static, composited, filter, animated), `knobs` (which stay open and their ranges, with a reason for each lock), `variants` (named overrides such as Night and Dusk), `fallbacks` (per effect, for lite mode, Limit blur and solid page background), `export` (flat colours, optional pre-rendered background image, "not exported" list), `burnIn` (`static-safe`, `needs-shift`, `needs-dim`), `templates` (optional page templates), `statusBar` (style and default position), `icons` (set style and source; missing names fall back to Classic), `minSizeClass` (per decoration: page layers, ornaments and overlays hide below this size class; used by the Display Compatibility brief, its DC10).

### Slot catalogue (bottom to top)

| # | Slot | Allowed values |
|---|---|---|
| 1 | Page background | colour, gradient, image or SVG; fit and position |
| 2 | Page layers | up to 3 SVGs or images pinned to an edge or corner; may animate (transform and opacity only, off in lite mode) |
| 3 | Card material | T2 materials: solid, gradient, glass, lcd, paper, transparent |
| 4 | Card frame | `none`, `plain`, `hairline`, `bracket`, `corner-brackets`, `notched`, `chamfer`, `tab-label`, `double`, `stamped`, `gradient-border`, `box-legend` |
| 5 | Card edge | `none`, `chamfer`, `distressed` |
| 6 | Card ornament | one SVG: `corner`, `top-band` or `side-strip`; rarity-style corner tint by status |
| 7 | Header | `inline`, `underline`, `label-bar`, `tab`, `bracket-line`, `index` (01 —), `legend` (title set into the border) |
| 8 | Data variants | ring `arc` (full or 270°), `segmented`, `ticks`; bar and meter `solid`, `segmented`, `led`, `blocks` (text block characters); meter zones `hard` or `blend`, peak hold `line`, `dot` or `block`; threshold line `dashed`, `solid` or `dotted`, spike marker `dot`, `tick` or `bar`; range bars; fader knob `pill`, `bar`, `square` or `notch`; number fill `solid`, `gradient`; number effect `none`, `glow`, `chromatic`; hero and display font |
| 9 | Content | widget body; app-owned; tokens only |
| 10 | Page overlay | grain, scanlines, vignette, each with an opacity; never blocks input |
| — | Status bar | style `pill`, `bar`, `plain`, `line` (the island takes it too); the island's default edge top or bottom, user can override the edge; the widget's position stays with the page |
| — | Connectors | `none`, `line`, `elbow`, with an end-dot option; drawn by the app between widgets, never positioned by the pack |
| — | Page templates | optional layouts the user can apply; applying a pack never moves widgets |
| — | Icon set | `outline`, `filled`, `chunky`, `pixel`, `ascii` (glyphs); one set per pack against a fixed icon name list; fallback to the Classic set (D26) |

Slot rules: decorations are absolutely positioned, `pointer-events: none`, `aria-hidden`, and never change size, padding or row fitting. A card ornament is at most 10 px and stays inside the padding (decorations reach the card edge only through `--wp-pad`), or the card is marked `data-qa-bleed`; no `!important` pack fills. The island, status bar and alerts take the pack's material, frame and header. Every variant is built once in the shell or primitives and covered by the overflow probe at 1x1, 2x2, 4x2 and 4x4.

`data-part` hooks: `card`, `header`, `label`, `num`, `unit`, `ring`, `bar`, `meter`, `spark`, `threshold`, `range`, `fader`, `icon`, `chip`, `button`, `status`, `alert`.

### Guardrails

| Area | Rule |
|---|---|
| Performance | Every effect declares a cost class and a fallback. Lite mode and Limit blur stop animation, turn off grain and scanlines, and cap glow and blur. Per-pack layer budget. |
| Burn-in | Global setting for slow pixel shift of decorations and idle dimming; packs declare their risk level. |
| Readability | The Part G contrast test runs over every pack, variant and material. |
| Layout | Overflow probe and parity run with each built-in pack. |
| Export | Background image and flat material colours export; optional pre-rendered background for art-heavy packs; frames, ornaments, overlays, masks and glow are listed as not exported. |
| Size | Packs load lazily outside the main bundle; a `budgets.json` key per built-in pack. |
| Security | No JavaScript, no remote URLs (the pack loader and validator refuse non-relative URLs and `@import`; the CSP does not enforce it), pack CSS scoped and paint-only. |
| IP | Original names only. No game titles, logos, key art, characters, screenshots or licensed fonts, even in personal builds. |
| Sharing | User packs, and sharing (Themely is the intended channel), wait for the validator (P12) and the IP policy. |
| Small screens | Decorations declare `minSizeClass` and hide below it. Full screen-size handling is in the Display Compatibility brief. |

### Sample packs and Looks (all to be built: P10 and P11)

| Name | Level | Page and layers | Material, frame, header | Data variants | Effects | Status bar | Template used in mockup |
|---|---|---|---|---|---|---|---|
| Field Kit (extraction-game inspired) | 2 | Dark scene, contour-line art, hazard strip on the left edge | Cream paper, `tab-label` header in dark ink, rarity corner ornament, yellow accent | Condensed caps, segmented rings and bars | Vignette | Top pill | Default grid |
| Tape '86 (retro VHS) | 2 | Warm cream paper, rainbow stripe bands, dark tab shape | Paper, `stamped` frame, `top-band` ornament, `label-bar` header | Chunky display numbers, solid arc rings, solid bars in stripe colours | Grain | Top cassette label | Default grid |
| Neon Stripe | 2 | Near-black, four glowing neon stripes | Transparent dark material, `bracket-line` header in red | Mono labels, yellow light numbers, tick rings, filled green spark | Glow on stripes | Top right | Default grid |
| Overdrive (cyberpunk inspired) | 2 | Black with red grid, skewed yellow block, barcode, system text | Dark gradient, `chamfer` frame in yellow, angled `label-bar` header | Cyan numbers with `chromatic` effect, segmented rings and bars | Chromatic offset | Top line | Tall hero plus columns |
| Swiss Mono (modern minimalist) | 2 | Charcoal, one large accent circle off the corner | `none` frame, `index` header with hairline rules | Light weight huge numbers, 2 px hairline bars | None | Top line | Hero band plus metric strip |
| Term (retro TUI) | 2 | Black | `box-legend` frame with titles in the border | Pixel display numbers, `blocks` bars, per-core rows, process list | Scanlines, vignette, phosphor glow | Bottom bar | Dense panes |
| Holo (futuristic HUD) | 2 | Deep blue radial glow, faint range rings | `corner-brackets` frame, faint cyan fill | Thin light numbers, concentric glowing rings, glowing thin bars | Glow | Top centre line | Radial cluster with `elbow` connectors |
| Classic | 1 | Today's default (D12) | Today's default | Today's default | Today's default | Today's | Default grid |
| Night Glow | 1 | Navy gradient | Glass, `gradient-border` with glow | Gradient hero number, gradient segmented rings | Glow capped at 12 px | Top centre pill | Default grid |
| Paper | 1 | Light, built-in hex pattern | Matte light, hairline | Gradient hero number, round-cap arcs | None | Top pill | Default grid |
| Classy Black | 1 | Black | Hairline | Thin light numbers | None | Top | Default grid |
| Liquid Glass | 1 | Colourful gradient | Glass | Default | None | Top | Default grid |
| Black and Gold | 1 | Warm black | Hairline | Gold gradient rings | Warm glow | Top | Default grid |

Icon set per pack: Field Kit `filled` (stencil style), Tape '86 `chunky`, Neon Stripe `outline` (thin), Overdrive `outline` (angular), Swiss Mono `outline` (hairline), Term `ascii`, Holo `outline` (glowing). Looks use the Classic set.

### Page types shown in the mockups

These boards exercise the new tokens and the icon set slot. The widget kinds that don't exist yet are out of scope (Part H item 10).

| Board | Pack | Widgets | What it tests |
|---|---|---|---|
| Field Kit · Gaming | Field Kit | FPS with lows, frame time, thermals and power, GPU and VRAM, ping, 5-channel mixer | Threshold line and spike markers, horizontal faders, mute states, segmented meters |
| Tape '86 · Desk | Tape '86 | Weather now and hourly, now playing with transport, vertical-fader mixer, agenda, clock | Chunky icons, vertical faders, stereo meters with hard zones |
| Term · Gaming | Term | FPS as block sparkline, frame time with histogram, ASCII weather, text-meter mixer, system line | `blocks` meters, ASCII icon set, threshold line in a text UI |
| Night Glow · Stream | Night Glow | 6-channel mixer with stereo meters, peak hold, mute and solo; stream stats; now playing; FPS card | Peak hold, live indicator, mute and solo states, blended meter zones (Level 1 Look) |
| Swiss Mono · Home | Swiss Mono | Weather hero with overnight line, 5-day range bars, time, agenda, now playing | Range bars, hairline data style |
| Holo · Cockpit | Holo | FPS core with 270° arcs, frame time, weather, audio, systems | 270° ring variant, connectors, outline icons |

P10 builds Field Kit, Tape '86 and Term first: they cover the most slots. Fix the slot catalogue from what they teach, then build the rest in P11.
