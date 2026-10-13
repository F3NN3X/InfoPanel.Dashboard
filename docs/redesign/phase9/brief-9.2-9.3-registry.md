# Brief 9.2 + 9.3a/b: data adapter, look settings, widget factory

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. Prereq: 9.1 core is
committed (`src/widgets/core/**`, `src/widgets/kit.ts`). Verify with `npm run typecheck` and
`npm test` (exit codes read directly). No new deps, no `console.log`.

Read first: `CLAUDE.md`, `docs/redesign/PHASE9_PLAN.md` (§3, §4 steps 9.2 and 9.3),
`docs/redesign/phase9/gaps.md`, `docs/redesign/DATA_MODEL.md` §6, `src/modules/types.ts`,
`src/modules/standard-settings.ts`, `src/lib/style-resolve.ts`, `src/components/studio/inspector-categories.ts`,
`src/components/studio/placement-content.tsx`, `src/components/studio/insert-panel.tsx`,
`src/components/studio/studio-modules.ts`, `src/hooks/useSensors.ts`.

## Commit 1 — `feat: add the widget data adapter` (9.2)
- `src/widgets/data-adapter.ts`: `toFlat(map: SensorMap): FlatData` — `{ key: text ?? (value + unit) }`
  with the formatting the templates' `num()` parses (number, a space, the unit; empty unit → number
  only; `text` wins when present and non-empty, else the value). Memoise per map identity (WeakMap).
  Image keys stay raw text; templates resolve `/api/images/...` through `resolveImageUrl` from
  `src/lib/image.ts` (export a `widgetImage(src)` helper templates call).
- `useWidgetData(prefixes)` = `toFlat(useSensors(prefixes))`. Never open another EventSource.
- Tests: normalisation cases (value+unit, text, empty unit, NaN, missing), memo identity, and a test
  that loads `src/widgets/__fixtures__/snapshot.json`, flattens it, and checks `hw()` from the core finds
  cpu, gpu, ≥1 disk and ≥1 adapter, and that `get/num` on `system.cpu.load` returns a finite number.

## Commit 2 — `feat: add skin, variant, graph and meter look settings` (9.3a)
- Add to `STYLE_SETTINGS` (so they enter `PROFILE_STYLE_KEYS` and resolve dashboard → profile →
  widget with Follow/Custom/Force and source dots automatically):
  `skin` select (`auto` + the 14 skin names from `SKIN_PACKS`, labels capitalised; default `auto`),
  `variant` segmented `default`/`studio` (default `default`), `graph` select (`auto` + area line step
  bars dots braille; default `auto`), `meter` select (`auto` + bar pill segments blocks hair wave square;
  default `auto`), `compactView` segmented `auto`/`off` (default `auto`, advanced).
  `auto` skin means the **default** skin; no existing stored key or default changes.
- New general category "Look" in `GENERAL_CATEGORIES` (style tab) holding `skin`, `variant`; Graph,
  Meter and compact view in the same category marked advanced (settings-level `advanced: true`).
  Order: Look comes first in the Style tab. Search keywords: skin/theme/style names.
- Panels: `PANEL_SETTINGS` gets `skin`, `graph`, `meter` too (D4: panel renderers become skin-aware in
  9.7). Cards (`CARD_SETTINGS`) get the full set.
- Tests: keys present in `PROFILE_STYLE_KEYS` with the defaults above; `resolveStyle` layering and
  `settingState` dots for `skin`; category placement (`inspector-categories.test.ts` style); existing
  tests stay green (update counts only where a test enumerates the style keys, and say so in the
  commit body).

## Commit 3 — `feat: add the template widget factory and Library categories` (9.3b)
- `src/widgets/module.tsx`: `templateModule({ meta, Component, settings, toProps, isIdle?, prefixes?, title? })`
  → `DashboardModule`:
  - `id = meta.id`, `title = meta.name`, `minCols/minRows = meta.minSize`, `prefixes = meta.prefixes`
    (plus any `reads`), `settings = [...STANDARD_SETTINGS (look + general), ...settings]`.
  - `render(sensors, settings)` returns `<TemplateZone …/>`, a component that calls
    `useMemo(() => toFlat(sensors))`, resolves `effectiveSettings`, and renders
    `<Component data={flat} {...shellProps(settings)} {...toProps(settings)} look={settings} />`
    where `shellProps` maps `accent`, `surface`, `radius`, `skin`, `variant`, `graph`, `meter`,
    `compactView`, `label`→`title` (`auto`/empty → undefined).
  - `ensureSkinFonts(skin)` on render when skin ≠ auto.
- Extend `DashboardModule` with optional `category?: string`, `icon?: string`, `description?: string`,
  `defaultSize?: [number, number]`, `libraryHidden?: boolean`. The Library (`insert-panel.tsx`,
  `studio-modules.ts`) reads them when present, falling back to `MODULE_CATEGORIES` / `MODULE_DESCRIPTIONS`.
  Drop size: `defaultSize` when present (still at least the min).
- Library chips (D2): All · Layouts · My panels · System · Hardware · Storage · Network · Media · Audio ·
  Info · Gaming · Generic. Remap the legacy ids: systemmodern→System, hardwaremodern→Hardware,
  networkmodern→Network, spotifymodern/mediamodern→Media, audiomodern/wavelinkmodern→Audio,
  weathermodern/vbz/notifications/textfile→Info, steammodern/fpsmodern→Gaming,
  bluetoothmodern/streamdeck/webpage/cards→Generic. "Other" is removed. `libraryHidden` modules are
  skipped in the Library but still load and render.
- Library card icon: `meta.icon` through the core `Icon` name map (lucide component).
- Registry: `src/widgets/registry.ts` exports `TEMPLATE_MODULES: DashboardModule[]` (empty for now;
  9.3c fills it) and `src/modules/index.ts` appends it to `modules`. `isClaimed` must **not** count
  template prefixes as claimed for the "Other sensors" catch-all unless the template is placed — keep the
  catch-all's behaviour identical: compute `claimedPrefixes` from the legacy modules only and document
  why in a comment.
- Tests: factory output (ids, min sizes, settings merge order, shell prop mapping incl. `auto`→undefined),
  Library grouping with the new chips (update `insert-panel.test.ts`), hidden modules excluded,
  drop size from `defaultSize`, catch-all claimed set unchanged.

Each commit must pass typecheck and tests on its own. Report in ≤15 lines: commits, test counts,
decisions taken, anything undone.
