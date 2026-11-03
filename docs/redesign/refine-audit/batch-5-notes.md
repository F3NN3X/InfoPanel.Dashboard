# Batch 5: Studio (A-01 to A-20)

Screenshots: `scratchpad\refine\shots-b5\` (1440 and 1024: screens, edit, selected, zoom to selection, add, library, theme, gauges, alerts, data, palette). Before: `scratchpad\refine\shots\studio-*.png`.

## Edit reference spec (`tests/visual/one-editor/`): conflicts, assertions not touched
- **A-16** (drop the `widget` / `item` kind word): `fixtures.spec.ts:126-136` asserts every Layers row contains "widget", and line 359 reads the kind words to name rows. Kept the word. Done instead: the eye and lock show on hover and on the selected row only (a hidden or locked row keeps its icon). Both buttons stay in the DOM, so the spec's `data-row-action` counts hold.
- **A-06** (drop the All / Widgets / InfoPanel items segmented row, add an InfoPanel chip): `fixtures.spec.ts:875` opens `radiogroup "Show"` > "Widgets"; the hover check (`:512-516`) needs tiles 64 px tall (the prototype's 76 px would fail). Kept the segmented row and the 64 px tile. Done instead: names `line-clamp-2` (no "..."), section heading count dropped (the tab already says "106 · 14 items"). Not done: the InfoPanel chip, real widget previews in tiles (106 live renders; the hover card already shows a live render). Chip row already scrolls with a fade (spec'd), so item 2 needed no change.

## Rows
- **A-01** `screens/page-map.tsx` (new, shared schematic: visible placements as `ui-active` boxes with a `ui-edge` stroke, higher contrast than the prototype, on the screen's resolved background, monitor glyph only for an empty page), `screens/screen-thumb.tsx` (schematic first, the kept shot fades in over it in 120 ms on load, no layout shift). Band aspect was already the screen's (`aspectOf`, 3:1 cap). Card meta line now wraps (`profile-card.tsx`) since "2 pages" tail-truncated.
- **A-02** `inherit-chip.tsx`, `theme-fine-tune.tsx`: inherited / theme / built-in are 11 px `text-ui-3` with a 12 px icon, no border or fill; changed here (custom, base) keeps a blue dot and `text-ui-accent-text`; Locked keeps its amber pill. Lock is a 24 px icon-only ghost button (60% at rest, full on row hover or focus; `aria-label` "Lock", title keeps the text). Removes 3 colour literals. The Library has no such chip (its tags were already quiet text), nothing to change there.
- **A-03** `canvas-cards.tsx`, `page-inspector.tsx`, `studio-canvas.tsx`: the tips are a card at the top of the page inspector (nothing selected), not over the canvas. `dismissTips()` persistence kept. Not built: auto-dismiss after the first select (the inspector already shows the part once selected, so the tips go out of sight on their own).
- **A-04** `quick-bar.tsx`: the controls wrap instead of scrolling under a mask, the bar grows in height, segmented buttons `px-2.5`. (The audit's "stray bracket" was the mask cutting the Shape control.)
- **A-05** `use-canvas-zoom.ts` (`zoomToElement`: fit the element to 70% of the canvas, then scroll to it), key `2` (`use-studio-shortcuts.ts`, cheat sheet, `use-studio-commands.ts`), a "Selection" button and a "100%" preset in `zoom-toolbar.tsx`. The left panel already overlays instead of docking at 1024 (`leftPanelFits`), so no change there. No palette entry, to keep `commands.test.ts`'s "zoom" ranking as is.
- **A-07** `theme-preview.tsx`: bar `shrink-0 ml-auto`, row `gap-y-2`, pill `shrink-0 whitespace-nowrap`, pill hidden when 0 widgets differ; its colours and the page switcher use tokens.
- **A-08** `settings-panel.tsx`: `SettingField` fieldset `px-4` (was `pl-4 pr-2.5`), one 16 px gutter like the headers.
- **A-09** `alerts-rules.tsx`: "Alerts on" toggle sits next to its label; the empty list is a centred state (40 px bell at 40%, title, line, New rule, Start from GPU temperature high, three preset chips that create the rule).
- **A-10** `library/add-files-button.tsx` (new split button: Add files, menu with New InfoPanel profile), `library-page.tsx` (search `min-w-[200px]`, Used by and Canvas files shrink first), `ui/toast.tsx` (bottom 38 to 42 px: 16 px above the status bar). A toast still overlays the grid for its few seconds.
- **A-11** `explorer/point-table.tsx`: display name is quiet text until hover, focus or overridden; NOW is right-aligned `tabular-nums` with the unit at 11 px `text-ui-3`. Not built: the "Live" pulse dot in the NOW header (the table has no live-connection prop; the status bar says it).
- **A-12** `status-bar.tsx`: the kiosk chip is plain text with a dot (green with kiosks, amber when paused, hollow with none), no dashed border; the footer's "No kiosks" count is removed (the top Live pill keeps the count).
- **A-13** `left-rail.tsx`: 2 px accent bar on the rail's left edge for the active item, icon stroke 1.75, label "Alerts" (`aria-label` and tooltip keep "Alerts & Island"; `studio-nav-alias` test unchanged).
- **A-14** `ui/segmented.tsx` exports `SEGMENT_ON` / `SEGMENT_OFF` (active: `ui-active` + 1 px inner `ui-edge` ring, inactive `text-ui-soft`); the outer ring drops from `ui-control` to `ui-strong`. Used by Segmented, Screens' filter, the Theme scope bar and page switcher.
- **A-15** `command-launcher.ts` (new), `command-palette.tsx`, `commands.ts`: empty query shows Recent (last 5 run, kept in localStorage), Actions, Go to; settings only when typing. Numbered siblings collapse ("Series 1-6"); the "Go to setting:" prefix is dropped on Theme rows (their hint says Theme >). Footer `Enter run / move / Esc close`. A command list with none of the launcher entries still shows whole (`command-palette.dom.test.tsx`).
- **A-16** partial, see conflicts.
- **A-17** `gauges/gauges-browse.tsx`: names `line-clamp-2`; empty sections are a dashed tile. Not done: normalising preview scale (the bars are drawn by the gauge itself, `GaugeView`).
- **A-18** partial: `#b4b4bc`, `#d4d4da`, `#27272a`, `#fafafa`, `#1e3a8a`, `#0b1530`, `#3f3f46`, `#5f5f68`, `#3f3f48`, `#ededf0` literals replaced by tokens; every `text-[11.5px]` and `text-[12.5px]` in `src/components/studio` became `text-micro` / `text-body` (0.5 px shifts, look at dense rows). `color-literals.test.ts`: cap 148 to 131, and a new guard caps `text-[Npx]` in the studio at 58 (what is left: 10, 14, 15, 16, 18, 24 px). Not done: the remaining 58.
- **A-19** `screen-detail.tsx`: the panel's Open button is gone (the card's footer is the only one); a 16:9 thumbnail (`ScreenThumb`) tops the panel; Shown on and Size & fit are collapsible and open, Grid is collapsible and closed. Not done: the "Settings ↗" link restyle.
- **A-20** `screens/page-strip.tsx` (new), `profile-card.tsx` (`strip` slot), `screens-view.tsx`, `studio-view.tsx` (`openScreenPage`): a screen with 2+ pages shows a strip of mini-maps (same `PageMap`) on its card; a click opens Edit on that page. Not built: hover thumbnails on the Edit page tabs.

## Tests
Added `command-launcher.test.ts`, `screens/page-strip.dom.test.tsx`, a `2` case in `use-studio-shortcuts.test.ts`; `color-literals.test.ts` lowered / extended. No snapshots changed. Bundle: no budget change.

## Look at in screenshots
Screens (cards with 2 pages, the panel thumbnail), Edit selected + zoom to selection (1440, 1024), Add tiles (two-line names), Alerts empty state, palette empty and "series", Theme header at 1024, Library header at 1024, rail active state.
Not captured: Add at 1024 (the left panel is an overlay there).

## Fix round 1
- `screens/screen-thumb.tsx`: the last loaded shot stays up under the next one until that has loaded (no shot, schematic, shot blink); test `screen-thumb.dom.test.tsx`.
- `screens/page-strip.tsx`: no strip for an InfoPanel screen; `studio-view.tsx` `openScreenPage` routes an InfoPanel screen through `openScreen`. The strip is now a `div` group (not list items) lying along the thumbnail's bottom edge (`profile-card.tsx` wraps button and strip in one relative box), so thumbnail height and title baseline match across a row.
- `profile-card.tsx`: the meta line is one line always (`@container`: the "grid" part is dropped below 260 px).
- Nits: `collapseNumbered` merges only consecutive numbers; the preset chips group has `role="group"`. Not done: N2, N3, N4, N6.
