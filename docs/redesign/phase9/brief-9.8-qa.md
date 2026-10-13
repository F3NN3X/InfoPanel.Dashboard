# Brief 9.8: QA sweep fixes, FEATURE_MAP and docs

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`, main checkout. Verify with
`npm run typecheck` (project script only), `npm test`, and `npm run build`, exit codes read directly.
No trailers. The controller runs the browser sweeps and hands you the failing list in
`docs/redesign/phase9/qa-findings.md`.

1. **Probe** (ledger #17) — `feat: report clipped content in the QA probe`: `window.__qaOverflow()` adds
   kind `clipped` for zone descendants with `overflow: hidden|clip` whose `scrollWidth > clientWidth + 1`
   or `scrollHeight > clientHeight + 1`, excluding elements that intentionally truncate text with an
   ellipsis (`text-overflow: ellipsis` and `white-space: nowrap`) and canvases/images. Pure helper in
   `qa-geometry.ts` with tests.
2. **Fixes** — every row in `qa-findings.md` (overlaps, clipping, light-theme contrast, missing data),
   one commit per widget `fix: <widget> fits at <spans>`. Rules: `docs/redesign/widgets/CLAUDE.md` (fit,
   don't overflow; row counts from inner height; fitted big numbers).
3. **FEATURE_MAP** — `docs: add the widget library to FEATURE_MAP`: the rows from
   `docs/redesign/widgets/docs/CLAUDE_CODE.md` §3 (44 templates in the Library by category, Skin (14),
   Variant, Graph/Meter style, per-widget layout options, shape-aware compact views) plus the six new
   templates and Other sensors, each with where it lives; tick them. Re-check every existing FEATURE_MAP
   row that pointed at a deleted `Modern*` component and repoint it to its new home.
4. **Docs** — `docs: describe the widget library` (ledger #24): update `docs/widget-settings.md`,
   `docs/module-catalog.md`, `docs/system-widget.md`, `docs/customization-guide.md`,
   `docs/architecture.md` (widget rendering path, shell, skins, data adapter, QA harness) so none names a
   deleted component and each describes the new look settings. Keep their existing style.
Report in ≤10 lines.
