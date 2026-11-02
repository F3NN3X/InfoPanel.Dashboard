# Batch 3: the kiosk (B-02, B-03, B-04, B-05, B-06, B-07, B-25)

Verify: `npm run verify` exit 0 (features: docs, layout-kiosk, infopanel-import-export, components-ui, studio, gauges, page-model, widgets,
coding-agents, tooling, config-model, budgets). All seven rows `fixed`.

Screenshots (scratch copies of `tests/fixtures/perf/data`, never the fixture itself): `scratchpad/refine/shots-b3/`
(`kiosk-*` top 140px at the five sizes, `full-*` whole screens, `edges-*`, `island-*`, `ink-*`, `default-layout-*`).
Scripts: `b3-shots.mjs`, `b3-skin.mjs`, `b3-ellipsis.mjs` in `scratchpad/refine/`. `b3-ellipsis.mjs` found no ellipsised status-bar value at any of
the five sizes, on the fixture and on three variants.

## B-02 + B-03: island sizes from the window, steps down, follows the skin; default bar drops the repeated time
- `src/App.tsx` (`islandPage`): on the kiosk the island sizes by the window, in the studio by the screen's design size.
- `src/components/island/island-model.ts` (`fitIslandSize`, `NARROW_PAGE` = 1100): a narrower page starts one size down (m -> s, l -> m). The
  gap maths is unchanged: `islandIdleWidth` uses `fitIslandSize`, `gapWidth` adds the margins, `fitAroundGap` / `needAroundGap` only see costs.
  Test: `tests/components/island/island-model.test.ts` (also the gap width and the reserve at a narrow page).
- New tint value `"skin"` (`src/lib/island/config.ts`, `island-look.ts` `SKIN_FILL`): the card colour 92% over the page, card text, 1px `--border`.
  It is the default for a new island (`ISLAND_DEFAULTS.tint`); a stored `"black"` stays black. "Match skin" is the first Color choice in the studio.
- B-03: `src/widgets/StatusBar.tsx` (unset centre = date alone while an enabled island shows the time) and `src/widgets/registry/b.ts`
  (`toProps` passes the centre only when stored). A stored centre, and every template that writes one, is untouched. The Center row's schema default
  still reads "date,time" in the inspector (it cannot depend on the island).
- Studio hint "Time is already in the status bar" not built (the row says "the default only").
- Look at: all five `kiosk-*` shots (the fixture stores `black` and a centre, so it looks as before except the size), `island-overlay-skin-tint-*`,
  `default-layout-*` (new island defaults, no stored centre: date only in the bar).

## B-25: island placement
- `IslandConfig.placement` `"overlay" | "skin"` (`config.ts`; missing or bad = overlay). Overlay is today's pill. "Part of the skin" wears the screen's
  widget surface (classes and style: its edge, fill, shadow), text colours and accent: `island-page-skin.ts` (`wornSurface`, loaded on demand), `island-look.ts`
  (`pageSkinOf`, `WornSurface`), `dynamic-island.tsx` (`useWornSurface`, `skinStyle`, notch ears, accent on the activity dot and progress).
- The studio: Look › Placement in Alerts & Island (`inspector/island-section.tsx`); Color and Opacity show for overlays only. The preview, the studio
  canvas and the kiosk pass the screen's skin (`island-preview.tsx`, `island-tab.tsx`, `studio-canvas.tsx`, `App.tsx`).
- Look at: `ink-overlay-1920x480.png` vs `ink-part-of-skin-1920x480.png`, `island-part-of-skin-*` (the default skin is dark glass, so the change is subtle there).

## B-04: edge inset
- `src/lib/profile-grid.ts`: `KIOSK_EDGE_INSET` = 8; `profilePadding` for a fill kiosk page with no padding = 8, or 0 when the new `MonitorProfile.edges` is
  `"touch"` (`"inset"` = unset). A set `padding` still wins. `layout.ts` guards and keeps `edges`; no migration or version bump (additive, unset = the documented default).
- Screens › Layout: "Touch the display edges" toggle (`screen-layout.tsx`, fill screens only); the hint and placeholder follow.
- Page-model geometry: the v15 migration (`page-model/migrate.ts`) converts a pre-v15 config's items as that page was drawn (edge to edge) and leaves
  the profile's `edges` unset. The `Pick` types of the grid helpers gained `edges`.
- InfoPanel export: reads none of tint, placement, padding or edges directly. Its item px come from the page model, which now sees the same padding
  as the kiosk (`import-check` passed, 6.7 s).
- Tests that pinned "unset = 0" got `padding: 0` in their fixtures (page-layout, v15 migrate, convert-view items, import-actions, placements-adapter):
  they test pixel maths, not the default. No assertion was loosened. The default has its own cases (`profile-grid.test.ts`, `layout.test.ts`,
  placements-adapter, a v15 case for an unset padding).
- Look at: `edges-inset-*` vs `edges-touch-*` (800x480, 1280x800).

## B-05: bar row share
- `barRowTemplate` (`profile-grid.ts`) used by the kiosk grid in `App.tsx`: only when a visible full-width Status Bar is alone in row 1 (rowSpan 1) of a
  fill page with 3+ rows and no item layers, and the even row is taller than the cap: row 1 = `clamp(56px, 8vh, 96px)`, the other rows share the rest.
  Kiosk only: the studio canvas keeps even rows, so a studio preview shows a taller bar than the kiosk.
- The perf fixture has free item placements, so it is not that layout and its shots do not change; `default-layout-*` (same fixture without them): bar
  86px at 1080 (was 170), 56px at 480.
- Cases: `tests/lib/profile-grid.test.ts` (`barRowTemplate`).

## B-06: portrait cells
- `AudioMeter.tsx`: a cell taller than 1.4 of its width and at least 200px lets the channel rows grow (48 to 160px). `Weather.tsx`: the same portrait cell with no
  stats or forecast puts the reading in the top third. The 1080p Audio card in the fixture is 1.2:1, so it is unchanged; Weather (1.7:1) moved up
  (`default-layout-1920x1080.png`).

## B-07: narrow labels
- `core/views.tsx` (`captionFit`, `NARROW_CARD` 160): a card under 160px whose caption the normal 0.08em tracking would cut gets 0.04em, and drops the icon when it
  still would not fit (the default header and the summary-card label). `core/primitives.tsx` `LegendRow`: a label that does not fit beside its value is hidden
  (`invisible`, swatch and value stay), never ellipsised. Markup of a legend that fits is unchanged (the v8 parity snapshot passes untouched).
- Uncertain: a hidden legend label has no accessible name (only a `title` on the span, which is also hidden); the header estimate is ~7px a character.
- Look at: `default-layout-800x480.png` (the VRAM row, "BREVIK, NORWAY").

## Other
- `tools/perf/budgets.json` raised to 273760 (kiosk) and 610440 (studio): the branch was already over (HEAD alone: 272742 / 609400, from batches 1 to 2b, whose
  verify did not run `budgets`); batch 3 adds about 1 KB gzip to each.
- Snapshots: none updated.

## Fix round 1 (review-b3.md)
- Existing islands keep their look: `normalizeIsland` reads a missing or invalid `tint` as "black" and a missing `placement` as "overlay"
  (`config.ts`); `ISLAND_DEFAULTS` (tint "skin") is only for islands made new through `withIsland` / Studio, saved explicitly. A screen with no island that the
  control channel forces on gets a black pill (`App.tsx`). Tests: `tests/lib/island/config.test.ts`, `tests/lib/layout.test.ts` (no tint, `tint: "red"`, new island saves skin, missing placement).
  Shot of a stored island with no tint field (copied data dir): `shots-b3/island-no-tint-*.png`, black.
- Status bar: the runtime default is back to date and time. Only a newly added Status Bar on a screen whose island shows the time starts with `center: "date"`
  (`studio/new-bar-settings.ts`, used by add and fill-blank in `use-studio-mutations.ts`; test `new-bar-settings.test.ts`). Saved bars are untouched.
- `edges` added to `PROFILE_KEYS` (`profile-file.ts`); round-trip and bad-value test in `profile-file.test.ts`.
- Bar-row cap: `room` now subtracts the real bottom padding (page-dots strip). Still kiosk only (not made opt-in; the studio keeps even rows).
- Legend label hidden by width stays in the accessibility tree (`opacity-0` instead of `invisible`, with the `title`).
- Docs and help updated (`customization-guide.md`, `settings-inventory.md` incl. the `edges` row, `help/articles/island-alerts.md`).
- Nits: the part-of-skin island stays hidden until its skin has loaded; a "Match skin" look preset and looks now set `placement: "overlay"`; the Placement hint says Color and
  Opacity come from the skin; the edges hint is one sentence. LegendRow cost (12) not measured separately; budgets (13): kiosk 273810, studio 611540 (this round +~1 KB studio).
