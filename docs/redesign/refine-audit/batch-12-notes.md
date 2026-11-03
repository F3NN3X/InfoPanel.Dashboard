# Batch 12: Studio polish (A-11, A-17, A-18, A-19, A-20, A-06 chips, b5 nits, island level bar)

Screenshots: `scratchpad\refine\shots\b12\` (`before-*` is HEAD, `after-*` is this batch): Data, Gauges, Screens (card selected, detail panel), Edit on "Perf light" with its second tab hovered, the Add panel with the InfoPanel chip on, and the island's level notice (a harness page, the real `IslandPreview` fed a 62% notice).

## A-11 fixed
`explorer/point-table.tsx` shows a `PulseDot` (green, "Live") in the NOW header while `live`; no dot otherwise. `sources-panel.tsx` passes `dataApi.state === "connected"`, the state the Connection card's pill and the status bar read. Look at the Data header at 1440.

## A-17 fixed
`gauges/gauges-browse.tsx`: each preview sits in a fixed 96 px box and is scaled with `transform: scale()` by `previewScale` (`lib/gauge-studio/model.ts`): bar 1.3, grid 1.1, the rest 1. Look at Bar, Threshold bar and Striped loading bar against the rings in Presets; the scaled bar spans about 125 px of the 132 px minimum tile. Test in `tests/lib/gauge-studio/model.test.ts`.

## A-18 partial
Literals 131 to 120 (cap lowered to 120), `text-[Npx]` in the studio 58 to 54 (cap lowered to 54). Done: `add-row`/`add-panel` accent tints to `ui-accent/NN`; Help note box and kbd to `s-accent`, `s-accent-text`, `s-side-line` (Help and Settings load `tokens.css` only, so `ui-*` tokens do not exist there); Diagnostics dot to `s-faint`; the dev viz gallery and widget QA page `#0c0c0e` to `bg-ui-app`; four `text-[15px]` (alerts, first run x2, screens list) to `text-title` (exactly 15 px). Not done, no exact token: `#d4d4da`, `#a4a4ad`, `#d6d6db`, `#27272a`, `#3f3f46`, `#4a4a52`, the `oklch(0.78 0.15 150)` greens and the amber family (the nearest `ui-ok`/`ui-warn` differ), the widget files' own `#0c0c0e`/`#141418`/`#17171b` (skinned surfaces, not studio chrome), the `#141418`/`#9696a0` in Help and the app window (no token in the `s-*` set). Sizes left: 10 (the most, below the scale's 11), 14 (15), 16, 18, 24, 8.5 px, none matching a token. Only about 15 swaps had an exact token, not 40; I did not add tokens or pick near matches.

## A-19 fixed
`screens/shown-on.tsx`: "Settings" is quiet `text-ui-4` that goes `text-ui-1` on hover, with the `ExternalLink` icon on its right (the app's other external links), no blue and no arrow glyph. Look at the Screens detail's Shown on row. Help's wording `Settings ↗` is unchanged (the arrow there names the link, not the icon).

## A-20 fixed
`studio/page-thumb.tsx` (new): `usePageThumb` shows a tab's thumbnail after 350 ms of hover or keyboard focus (`:focus-visible` only), and hides it on leave, blur, pointer down or Escape (Escape stops there while it is open). `PageThumb` draws `PageMap` in a portal under the tab. `page-tabs.tsx` takes `thumbProfile` (set in `studio-view.tsx`, not for an InfoPanel screen, whose pages are canvases `PageMap` cannot draw). With thumbnails on, the tab's native `title` is replaced by `aria-description` with the same words, so the two tooltips do not stack. Tests: `tests/components/studio/page-thumb.dom.test.tsx`. The Edit spec (`tests/visual/one-editor/`) is untouched; no assertion changed.

## A-06 stays partial
`add-panel.tsx`: a second chip row (Text, Data, Media, Layout, Elements: `chipsFor("items")`, InfoPanel's palette groups) shows only while the InfoPanel chip is on and no query is typed; a group narrows the items, pressing it again shows them all. It has no "All" chip on purpose: a second `All` button would make the Edit spec's `button "All"` click ambiguous, so no spec line changed. Search still finds every tile. Live tile previews are won't-fix by the user's decision; recorded in the row's note.

## b5 nits
- N2: `zoom-toolbar.tsx` takes `hasSelection` and disables Selection without one (`studio-view.tsx` passes `sel.selected != null`); `use-studio-commands.ts` looks the frame up inside the canvas scroller, with `CSS.escape`, skipping `[data-hidden]` frames. Test: `tests/components/studio/zoom-toolbar.dom.test.tsx`.
- N3: `PageMap` and `PageStrip` are `memo`; `PageStrip.onOpen` is now `(screenId, pageId)` and `ScreensView` gives it one stable callback (a ref to the latest `onOpenScreenPage`). `page-strip.dom.test.tsx` expects the new call shape (`"p1", "pg1"`): same click, now with the screen id.
- N4: `StatusBar` takes `paused`; `studio-view.tsx` passes `kioskPageId ? !rotating : false`. Test in `shell-chip.dom.test.tsx` (the amber dot follows the flag, not the text).

## Island level bar
`dynamic-island.tsx`: the bar is full width with `transform: scaleX(progress)`; `index.css` has `transform-origin: left` and `transition: transform 160ms` (under `.island-motion`). `role="meter"` and `aria-valuenow` are unchanged. The bar has no rounded end of its own now (a scaled rounded end would squash); the track still clips the left end, so the right end of a part-full bar is flat (look at the island shot at 62%).

## Budgets raised (after fix round 1)
`tools/perf/budgets.json`: kiosk entry 276208 to 276492 B gzip, studio entry 615896 to 616806 B (Windows measurement; CI's Linux numbers can differ by a few bytes). `PageThumb` now loads lazily (`page-thumb-card.tsx`, default export, behind `Suspense` in `page-tabs.tsx`), which took the studio entry from 617963 to 616806 B. The measured +910 B left is the InfoPanel group chip row, the thumbnail hook in `PageTabs`, the zoom and status-bar props. Kiosk +284 B: the token class swaps, `previewScale` (gauge model) and the island bar.

## Fix round 1
- Escape cancels a thumbnail still waiting out its delay (`thumb.hide()` always, `stopPropagation` only when it was open); test added. A drag in progress no longer starts a thumbnail on tab enter.
- Island bar: a full-width pill (`rounded-full`) slides with `translateX(progress - 100 %)` behind the track's clip, so the round end holds at every value; checked at 0, 8, 50 and 100 in `shots12fter-island-level-*.png`. Replaces the scaleX text above.
- Zoom to selection is disabled for a hidden selected widget too (`sel.selected.visible`).
- Nit, focus path untested: happy-dom does not evaluate `:focus-visible` reliably, so the keyboard-focus branch is covered by the Edit spec's real browser only if it tabs there; left without a unit test.
- Nit, CSS.escape/hidden-frame lookup untested: the brief asked only for the disabled state; left.
