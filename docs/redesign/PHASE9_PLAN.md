# Phase 9: widget library (plan)

Source handoff: `G:\win_user-folders\Downloads\Widget Studio UI Redesign (1)\widgets` (44 templates,
14 skins, 24 surfaces, 2 variants) and its `docs/CLAUDE_CODE.md`. QA oracle: `Widget Templates.dc.html`
in the parent folder. Status: **implemented** on `feat/widget-library` (9.0–9.8). Decisions are in §8; review findings and
their outcome in `phase9/review-ledger.md`, QA in `phase9/qa.md` and `phase9/qa-findings.md`.

## 1. Requirements (restated)
- Bring the 44 templates into `src/widgets/` as the app's widget system. Every widget renders inside
  one `<Widget>` shell, so skin, variant, graph style, meter style, surface, accent and radius apply to
  all of them.
- New look settings **Skin, Variant, Graph, Meter** (plus `compactView`) in Style, resolved like every
  other look key (default → dashboard → profile → widget, Follow/Custom, Force global, source dots).
  Defaults are `auto` / `default`.
- The 16 existing widget types (and the "Other sensors" cards zone) keep their ids, keys and every
  feature. Panel zones (ARCv2, Sample) keep rendering as today.
- Customisation stays at today's level: colours, fonts, what to show. Every template prop is reachable
  in the inspector via the one registry.
- Acceptance: existing configs load and render unchanged (see decision D1); every template can be
  added from the Library at every allowed span; skins and variants apply to every widget; no overflow
  at cell sizes 110 and 150; 60 fps with 20+ widgets on 1920×550.

## 2. What the repo has today (facts that shape the plan)
| Area | Today | Consequence |
|---|---|---|
| Widget type | `DashboardModule` with `render(sensors, settings)`; `Placement.module` holds the id | A template becomes a `DashboardModule` produced by one factory; no new zone kind needed |
| Settings | flat primitives (`ModuleSettings`); look keys = `STYLE_SETTINGS` + `SURFACE_SETTINGS` → `PROFILE_STYLE_KEYS` | New look keys go in `STYLE_SETTINGS`; resolution, dots and presets come for free |
| Chrome | `ModernChrome` + `makeSurface` + `surfaceBox` + `chromeVars` apply 19 look keys (scale, padding, font, text colours, border, glow, opacity, blur, custom CSS…) | The template shell has no home for these; the shell must apply them (§4.3) |
| Surfaces | `glass` (default) · `matte-light` · `matte-dark` · `theme`; light theme `paper` exists | Template surfaces are dark-only; `glass` name collides; template text is hard-coded zinc |
| Data | `sensorStore` (shared, ≤4 streams), `useSensors(prefixes)` → `SensorMap` of `{value,text,unit}` | Templates want flat `{key: string}`; adapter on top of `useSensors`, no second SSE |
| Fonts | `FONT_CATALOG` + `ensureFont(id)` | Skin fonts become new catalog ids; `ensureSkinFonts` calls `ensureFont` |
| Icons | lucide, `WIDGET_ICONS` (18 names) | `Icon` body becomes a Material-name → lucide map |
| Tests | 71 pure-logic `*.test.ts`, node env, no jsdom | Logic tests + `react-dom/server` smoke renders; visual QA via Playwright MCP, no new deps |
| Errors | no error boundary anywhere | One throwing widget blanks the kiosk; add a per-zone boundary first |

Gap count from the module mapping: **81** module-own keys have no template prop, the 6 modules
vbz / bluetooth / notifications / textfile / streamdeck / webpage have no template, and ~18 panel-widget
fields have no primitive. Closing these gaps is most of the work.

## 3. Architecture decisions (proposed)
1. **Stored keys never change.** Each widget module owns a `toProps(settings)` adapter that turns the
   stored keys into template props (e.g. `showCores` + `coreStyle` → `coreView`; `cpuColor…` →
   `colors{}`; `dimBanner` → `scrim`). No config migration is needed for the port.
2. **Legacy key wins when semantics match.** A template prop that has a legacy equivalent is stored
   under the legacy key (NowPlaying `vizDevice` is stored as `liveSource`, `vizMode` as
   `waveformVariant`). New props get new keys.
3. **Collisions get a widget-specific key.** Template props named like a standard key (`layout`, `icon`,
   `label`, `surface`, `style`) are stored under another name: NowPlaying `layout` → `playerLayout`,
   GameSpotlight `layout` → `spotlightLayout`, ServiceHealth `layout` → `healthLayout`, SensorGroup
   `layout` → `groupLayout`. The standard `layout` (auto/card/standard/compact/simple) keeps its meaning.
4. **Stored surface values keep their meaning.** `glass`, `matte-light`, `matte-dark`, `theme` render
   today's materials (ported into the surface registry). Template surfaces are added under their own
   names; the template's `glass` is dropped in favour of ours. `auto` (new, not the default) = the
   skin's surface. The default stays `glass`.
5. **Theme-aware text.** While porting, template `text-zinc-*` / fixed greys become CSS variables
   (`--w-fg`, `--w-muted`, `--w-faint`, `--w-track`) set by the shell from the surface (light text on
   dark surfaces, dark text on `matte-light` / light `theme`). This is the one deliberate deviation
   from "port, don't rebuild"; without it the Paper theme breaks.
6. **Accent precedence.** A skin's own accent (ink, synth, cyber, nixie, instrument) applies only when
   the widget's resolved accent is unset; an explicit accent always wins.
7. **One shell applies the standard look keys.** `<Widget>` takes the resolved look and applies border,
   glow, opacity, blur, background image, text colours, font (overrides the skin font), font weight,
   label case, padding/gap (override the tier padding when set), stroke (multiplies `skin.ring` and the
   graph stroke), custom CSS (scoped), header icon and label. `scale` ≠ 100 applies CSS zoom and the
   tier is measured after zoom; `autoScale` on = tier adaptation (templates already adapt).
8. **TypeScript.** Core and templates are converted to `.tsx` with the types in CLAUDE_CODE §6; logic
   unchanged except bug fixes (e.g. CpuMonitor returns before `useHistory` → hooks made unconditional).
9. **Module ids.** New templates register under their template id (`CpuMonitor`, `SystemOverview`…);
   no collision with the lowercase legacy ids. Legacy ids that a template supersedes stay loadable but
   are hidden from the Library (alias = template + fixed props, e.g. `spotifymodern` = NowPlaying with
   `source: spotify`).

## 4. Phases (each step builds, tests pass, one commit)

### 9.0 Safety net and inventory
1. Per-zone error boundary in `PlacementFrame` (kiosk and canvas): a failed widget shows a small
   error tile, the rest keep rendering.
2. Capture a real `/api/sensors` snapshot into `src/widgets/__fixtures__/snapshot.json` (personal
   values scrubbed: public IP, Steam persona/avatar, track titles). The prototype's demo data is not used.
3. Key audit script (test): for each spec's "Keys read", report which resolve against the snapshot.
   Record misses (expected: `hwinfo.*`, `plugins.fps-plugin.*`, Wave Link via `lib/wavelink.ts`).
4. Icon inventory: every Material Symbols name the templates use → lucide map, with closest matches.
5. Write the per-module gap table (from the mapping) into `docs/redesign/phase9/gaps.md`.

### 9.1 Core (no UI change)
1. `src/widgets/core/` in TSX: `data`, `layout`, `tokens`, `surfaces`, `skins/*` (14 files), `theme`,
   `primitives`, `views`, `Widget`; `src/widgets/kit.ts` barrel.
2. Merge `TONES.warn/crit` into `STATE` here (cheaper before 44 files depend on both).
3. Surface registry = today's 4 materials (moved from `components/surfaces.ts`, behaviour identical,
   existing tests kept green) + the template surfaces (decision 4).
4. Text-colour variables (decision 5) in shell, views and primitives.
5. `Icon` → lucide map. Fonts: add skin families to `FONT_CATALOG` (new ids only) and
   `ensureSkinFonts(skin)` lazily on first use.
6. Shell applies the standard look (decision 7), reusing `chromeVars`, `surfaceBox`, `tokenScope`.
7. Tests: `tierOf`/`shapeOf` boundaries, `rampColor`/`heat`, `useHistory` easing (pure core), look →
   shell mapping, surface/text-colour pairing, accent precedence, `ensureSkinFonts` idempotence,
   and `renderToString` smoke of the shell with each skin × variant.
8. Acceptance: a dev-only `?widget-qa` page (lazy, like `?ui-preview`) renders `SystemStatus` from the
   fixture with no console errors.

### 9.2 Data adapter
1. `toFlat(SensorMap)` (memoised per map identity) → `{ key: text ?? value+unit }`; `useWidgetData(prefixes)`
   on top of `useSensors`. Never `useInfoPanel`.
2. `hw(d)` stays template-side. Wave Link feeds through `lib/wavelink.ts`; `hwinfo.*` and the fps-plugin
   keys are added to the templates that ported modules need (Thermals/SensorGroup, FpsMonitor).
3. Tests: adapter normalisation, image URL resolution through `lib/image.ts`, and the key audit from
   9.0 turns into a passing check (every spec key resolves, or is listed as optional).

### 9.3 Look settings, registry and Library
1. Add `skin` (auto + 14), `variant` (default/studio), `graph` (auto + 6), `meter` (auto + 7),
   `compactView` (auto/off) to `STYLE_SETTINGS`; file them under Style › Look (Skin, Variant) and
   Style › Look › Advanced (Graph, Meter, compact view) in `inspector-categories.ts`. Dashboard,
   profile and widget style all accept them; dots and style presets work unchanged.
2. `templateModule({ meta, Component, settings, toProps, isIdle? })` factory → `DashboardModule`; the
   zone renderer passes `useWidgetData` + resolved look + `toProps(settings)`.
3. Register all 44 with a shell-only schema for now (full schemas in 9.5). `meta.minSize` → `minCols`/
   `minRows`; `defaultSize` → drop size; `meta.icon` → Library card icon; descriptions from `meta`.
4. Library chips per D2 (template set; "Other" removed). Superseded legacy ids hidden from the Library (decision 9).
5. Tests: look keys in `PROFILE_STYLE_KEYS` and defaults, resolve/dots for the new keys, factory output,
   min sizes enforced, Library grouping, every template present.
6. Acceptance: existing configs render exactly as before (new keys default to `auto`/`default` and the
   legacy modules are untouched until 9.4); every template can be added at every allowed span.

### 9.4 Port the existing widgets (one commit per module, lowest risk first)
For each: extend the template(s) with the module's missing features (gap table), write `toProps`,
supply `compact` and `studio` descriptors, keep min size and `isIdle`, screenshot before/after at three
spans, then delete the old `Modern*` component. The commit message lists where each feature now lives.

| # | Legacy id | Target | Notable work |
|---|---|---|---|
| 1 | `webpage` | new `WebPage` template, `bleed` | iframe + YouTube rewrite; reduced style subset kept |
| 2 | `textfile` | new `TextFile` | meta header, scrolling mono body |
| 3 | `notifications` | new `Notifications` | history, `maxLines`, Error/Warning tones via `Pill`; idle |
| 4 | `vbz` | new `Departures` | rows of time · line badge · destination, status line |
| 5 | `bluetoothmodern` | new `Bluetooth` | view full/devices/status, battery `BarRow` with mid/low colours |
| 6 | `streamdeck` | new `StreamDeck` | per-device icon grid via `Img`, profile, labels; min 3×2 |
| 7 | `networkmodern` | NetworkThroughput | `view` speeds/totals, `showTotals`, `sparkline`, down/up colours |
| 8 | `weathermodern` | Weather (+ Forecast) | `view` full/now/forecast/minimal, `tint`, stat toggles, `forecastDays`; min 3×1 |
| 9 | `fpsmodern` | FpsMonitor | `view` gauge/trend, metrics, sparkline, ring/spark colours, fps-plugin keys; idle |
| 10 | `hardwaremodern` | Thermals + SensorGroup auto-discovery | list/temps view, `maxRows`, fans, dot colours, `hwinfo.*` |
| 11 | `systemmodern` | SystemOverview | disk section, 13 detail toggles, sparkline + `historyLength`, labels, °F, decimals, `vramWarn`, temp thresholds; `RingStack` extracted here |
| 12 | `audiomodern` | AudioMeter / MeterBridge / VolumeMixer by `view` | ballistics, gradient meter, device/details/mute toggles, colours; `LedLadder` extracted here |
| 13 | `wavelinkmodern` | WaveLink (+ MeterBridge parts) | all 9 keys, mixes/routes view, channel picker |
| 14 | `steammodern` | GameSpotlight (composite mode) | stats, news line, `dimBanner` → `scrim`, profile/friends; idle |
| 15 | `spotifymodern` + `mediamodern` | NowPlaying | 20 waveform/visualiser keys, Web Audio live capture, times, tint; `MediaProgress` extracted here; idle |
| 16 | `cards` (Other sensors) | SensorValue in the shell | generic card per unclaimed key, theme surface default |

Visual parity is reviewed per module against today's render (decision D1).

### 9.5 Inspector schema per template
1. One `settings` array per template from its spec's widget-specific props, under rules 2–3 of §3.
2. Enums: segmented when ≤4 options, select otherwise (existing rule in `setting-control.tsx`).
3. New control sources: a `sensor` setting type for module widgets (reuses `SensorField`/`DataPicker`,
   `multiple` for SensorGroup), and `optionsFrom` values `cpu` · `gpu` · `disk` · `adapter` · `audio`
   derived from `hw()` and live keys. These go on the Data tab.
4. Colour props (`colors`, `vizRamp`, `heatRamp`, `ramp`) → Style › Advanced.
5. Test: a prop manifest per template (from the specs) — every prop reachable exactly once; no key
   collides with a standard key.

### 9.6 Remaining consolidation
`LegendRow`, `useFitRows`, `StatGrid`, `GlassPill` (each one commit, screenshots of affected widgets at
three spans). `LedLadder`, `RingStack`, `MediaProgress` land in 9.4 where first needed. Merge the two
duplicate `useHistory` hooks into the core one.

### 9.7 Panels
Per D4: renderers stay; with a skin set, bar/sparkline/gauge/numerals use `Bar`/`Spark`/`Ring`/`Num`. Overlay layout passes `surface="flat"`. ARCv2 and Sample must render as before.

### 9.8 QA and docs
1. `?widget-qa` grid: every widget at 1×1, 2×1, 3×1, 1×2, 2×2, 4×2, cell 110 and 150, `default` and
   `instrument` skins, both variants, fixture data. Compared side by side with `Widget Templates.dc.html`.
2. Overflow check (Playwright MCP, `browser_evaluate`): no descendant rect outside its zone, no text
   overlap. Fix and re-run until clean.
3. Performance: 20+ widgets on 1920×550 with visualisers running hold 60 fps; canvases pause off-screen.
4. FEATURE_MAP: add the CLAUDE_CODE §3 rows and tick them; update `docs/widget-settings.md`,
   `module-catalog.md`, `customization-guide.md`.

## 5. Dependencies
- No new npm packages. Google Fonts for skin families (lazy). Playwright MCP for QA only.
- A running Data API to capture the snapshot (9.0) and to check live keys.

## 6. Risks
| Level | Risk | Mitigation |
|---|---|---|
| HIGH | Existing zones look different after 9.4 | D1; before/after screenshots per module; legacy look keys applied by the shell |
| HIGH | 81 legacy keys need template extensions; templates grow well past their current size | gap table drives each port; split big templates into sub-files if a file passes ~800 lines |
| HIGH | Templates assume dark surfaces; Paper / Matte (light) break | text-colour variables (decision 5), checked in QA on a light profile |
| MED | Key namespace mismatch between templates and the live API | snapshot audit in 9.0 / 9.2 |
| MED | `oklch(from …)` relative colour (used by `hue()`) needs Chromium 119+ | confirm the kiosk browser; fallback to `color-mix` hue steps if needed |
| MED | `scale`/zoom interacting with tier measurement | measure after zoom; test at 50/100/150 % |
| MED | No DOM tests | pure-logic tests + `renderToString` smoke per widget × tier × variant; Playwright QA |
| LOW | Material Symbols names without a lucide match | closest match, listed in the icon map |
| LOW | Font load cost of 8+ skin families | lazy per skin, offline falls back to the stack |

## 7. Size
High. Roughly 35–45 commits: 9.0 (5), 9.1 (6–8), 9.2 (2), 9.3 (4), 9.4 (16), 9.5 (4–6), 9.6 (4), 9.7 (1–2), 9.8 (2–3).

## 8. Decisions (answered 2026-10-12)
- **D1 Same settings, new shell.** "Unchanged" means every stored key and feature keeps working and
  today's surfaces/colours stay the default. Zones render through the new `<Widget>` and old `Modern*`
  components are deleted. Each module gets a before/after screenshot review; pixel-identical output is
  not required.
- **D2 Template chip set.** Layouts · My panels · System · Hardware · Storage · Network · Media · Audio ·
  Info · Gaming · Generic. "Other" is removed; Generic covers it.
- **D3 New templates** for Departures, Bluetooth, Notifications, Text File, Stream Deck and Web Page,
  written in the library's style with compact and studio descriptors.
- **D4 Skin-aware primitives in panels.** Panel renderers stay. With skin `auto`, nothing changes. With a
  skin set, bars, sparklines, gauges and numerals render with `Bar` / `Spark` / `Ring` / `Num`.
