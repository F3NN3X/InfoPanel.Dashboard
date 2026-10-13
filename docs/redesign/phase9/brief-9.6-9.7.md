# Brief 9.6 (consolidation) and 9.7 (panels)

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`, main checkout. Verify with
`npm run typecheck` (project script only) and `npm test`, exit codes read directly. One commit per item,
explicit `git add` paths (another implementer may run the other half at the same time), retry on
`index.lock`, no trailers. Behaviour unchanged unless stated.

## 9.6 — consolidation (owner: files under `src/widgets/**` and dead legacy code)
From `docs/redesign/widgets/docs/AUDIT.md` "Remaining consolidation" (RingStack, LedLadder,
MediaProgress are done):
1. `refactor: share legend rows as LegendRow` — `<LegendRow color label value>` in core primitives;
   use in GpuRings, PlaytimeShare, StorageHealth (read/write).
2. `refactor: fit row counts with useFitRows` — `useFitRows(h, rowH, gap)` (pure `fitRows` + hook)
   replacing the inline `floor((h + gap) / (rowH + gap))` in ProcessList, Thermals, DriveSpace,
   VolumeMixer, NetworkAdapters, SensorGroup, ServiceHealth and any other widget doing the same.
3. `refactor: share stat footers as StatGrid` — `<StatGrid items cols>` (border-t footer) for
   CpuMonitor, GpuMonitor, StorageHealth, PowerDraw lg footers.
4. `refactor: promote GlassPill` — GameSpotlight `GlassPill` + SteamGame chip → one primitive.
5. `refactor: one useHistory` — the core `useHistory` replaces `src/components/widgets/hooks.ts` and
   `src/lib/sparkline.tsx` history hooks wherever still imported (panel widgets included); keep each
   call site's length/ease semantics (raw values where the old hook was raw: `ease = 1`).
6. `chore: remove code left unused by the widget port` — delete `src/components/SmartValue.tsx`
   (ledger #38) and anything else now unreferenced (grep each candidate: old surfaces/chrome helpers,
   `src/components/ui/{level-meter,db-readout,db-scale}`, `modern-chrome.tsx` if no importer remains,
   `src/lib/sparkline.tsx`). Keep anything still imported. List each deletion and why in the body.
Tests for each new primitive/hook (pure parts + `renderToString` of an affected widget).

## 9.7 — panels (owner: `src/components/widgets/**`, `src/lib/panel-*`)
Decision D4: panel renderers stay. With the panel's resolved `skin` = `auto`, render **exactly** as
today. With a skin set (panel look settings `skin`, `graph`, `meter` already exist in
`PANEL_SETTINGS`), wrap the panel body in the core `SkinCtx.Provider` (via a small helper exported from
the core, e.g. `skinContext(skin, graph, meter, look)`) and:
- stat / value: numerals with `numFont(sk)` (font, weight, stretch, glow);
- bar: core `Bar` (meter style), `inverted` pre-computed, the widget's colour as accent;
- gauge: core `Ring` (thickness × `skin.ring`);
- sparkline: core `Spark` (graph style; history length = the widget's `history`);
- table / text / image / clock / shape: numerals/fonts only, layout unchanged.
- Overlay layout passes `surface="flat"` semantics (no extra card).
Commit `feat: skin-aware panel widgets`. Tests: with skin `auto` the rendered HTML of every shipped
panel (`shipped-panels.test.ts` presets, ARCv2, Sample) is byte-identical to before (snapshot the
`renderToString` output before your change and assert equality after); with a skin set the core
primitives render (assert their markers). Also add `skin`/`graph`/`meter` to the panel inspector
sections if they aren't visible yet (check `inspector-model.ts` `panelSections`).

Report in ≤10 lines per half.
