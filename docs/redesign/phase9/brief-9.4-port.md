# Brief 9.4: port one legacy widget onto the shell

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. You get one legacy module id
(or a pair). Verify with `npm run typecheck` and `npm test` (exit codes read directly). No new deps.

Read first: `CLAUDE.md`, `docs/redesign/PHASE9_PLAN.md` §3 (decisions 1–3, 9) and §4 step 9.4,
your row in `docs/redesign/phase9/gaps.md`, the legacy module `src/modules/<file>.tsx` and the components
it renders (`src/components/Modern*.tsx` or similar), its inventory rows in `docs/settings-inventory.md`,
the target template(s) `src/widgets/<Id>.tsx` with spec `docs/redesign/widgets/docs/widgets/<Id>.md`,
`src/widgets/module.tsx` (`templateModule`), `src/widgets/kit.ts`.

## Goal
The legacy id keeps loading every existing config and renders through `<Widget>` via the template,
with **every** stored setting honoured and no feature lost. Old component(s) deleted at the end.

## Steps
1. **Extend the template** with each "Extend" feature in your gaps row: new widget props, rendered in
   the template's own layouts (tiers/shapes) and its `compact` / `studio` descriptors. Follow the
   library rules (`docs/redesign/widgets/CLAUDE.md`): shell only, accent via `--accent`/`hue()`,
   `STATE` for fixed colours, `--w-*` text variables, `<Num>`, unconditional hooks, `useHistory` for
   graphs, fit to the zone. User colour settings (e.g. `cpuColor`) override the derived colours.
   If a template file would pass ~800 lines, split helpers into `src/widgets/<Id>/` sub-files.
2. **Legacy module** `src/modules/<file>.tsx` becomes a `templateModule(...)` call (or a thin module
   around it) with: the same `id`, `title`, `minCols/minRows`, `prefixes/reads`, `isIdle`; the same
   `settings` array (same keys, defaults, options, groups, tabs, `visibleIf`) — **do not rename or
   re-default any key**; a `toProps(settings)` that maps stored keys to template props (gaps row
   "Mapped"); fixed props for an alias (e.g. `source: "spotify"`); `libraryHidden: true` when a
   template supersedes it in the Library (the template entry stays visible). New template props get
   new keys per decisions 2–3 and appear in the template's own module too.
3. **Template module** (`src/widgets/registry/<group>.ts`): add the same new props as settings so a
   new zone of the template can use them (reuse the legacy keys where semantics match).
4. **Tests**: `toProps` mapping for every stored key (table-driven), defaults identical to before
   (snapshot the settings array keys + defaults before you change anything and assert equality after),
   `isIdle` unchanged, `renderToString` of the legacy module with fixture data
   (`fixtureSensors()` from `src/widgets/__fixtures__`) at forced sizes xs/sm/md/lg and both variants,
   and one render per non-default value of each enum setting. Update existing tests that imported the
   deleted component to target the new path; don't weaken assertions.
5. **Delete** the old component(s) and their now-unused helpers (grep for imports first). Keep shared
   helpers other modules still use.
6. **Commit** `refactor: render <title> through the widget shell`. Body: a "Where each feature lives
   now" list — every setting key and visual feature of the old component → template prop / layout /
   section. No Co-Authored-By or generated-by trailer.

## Report (≤12 lines)
Commit hash, files, tests added, any feature you could only approximate (be explicit), anything
left undone. The controller takes before/after screenshots with the QA harness.

## Working in a worktree
You may be running in an isolated git worktree. If `node_modules` is missing there, link the main
checkout's instead of installing: `cmd //c mklink //J node_modules E:\GitHub\MyRepos\InfoPanel.Dashboard\node_modules`.
Commit on your worktree branch; the controller merges. Do not push.

## Known issues to fix while porting
- `hardwaremodern`: key rows by sensor key, not display name (duplicate React keys today).
- Images: root-relative `/assets/...` paths load directly, not through `/api/image-proxy` (`widgetImage`).
- NowPlaying: the template's `layout` is stored as `playerLayout` (the standard `layout` keeps its meaning).
