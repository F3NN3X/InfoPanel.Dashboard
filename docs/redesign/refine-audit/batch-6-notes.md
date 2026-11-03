# Batch 6: Edit reference spec changes (A-06, A-16) and Connections (B-13)

Screenshots: `scratchpad\refine\shots-b6\` (`before-*` is batch 5, `after-*` is this batch; Add panel and Layers at 1440).

## A-06 partial: the Add panel
- `add-panel.tsx`: the Show radiogroup is gone. One chip row: All, InfoPanel, then the widget categories (the InfoPanel chip sits second, inside the first screenful at 1440). All shows widgets, items and elements; InfoPanel shows items and elements; a category shows widgets. `INFOPANEL_CHIP` is shown only where the page takes items (`onAddPart`). A fixture's `start.segment: "items"` selects the chip. `addSections` is unchanged (the chip maps to its segment).
- `add-tile-grid.tsx`: tiles 64 to 76 px (names were already two lines, no section count).
- `add-prefs.ts`: `useAddFilter` and `FILTER_KEY` removed (nothing reads the stored segment now); `parseAddFilter` stays (tests, `addSections`).
- Lost: the InfoPanel palette-group chips (Media, Data, Elements...) that showed under the InfoPanel items segment. Search still finds those tiles. Uncertain whether to bring them back as a second row.
- Not built: real widget previews in tiles. 106 tiles, each a live widget render, would make opening Add slow and the hover card already shows one; visible-only rendering would need an IntersectionObserver per tile plus theme and fixture data. Left partial.

## A-16 fixed: Layers rows
- `layers-tree.tsx`: the visible `widget` / `item` / `element` word is now `sr-only` text (`data-testid="layers-row-kind"`) and the icon tile's tooltip (`title`). A group shows only its child count visibly (`2`), with `group` as sr-only text. There is no drag-handle glyph in the rows (they drag as a whole); the lock and eye already show on hover and selection only (batch 5), so that part was done.

## B-13 fixed
Most of it was in batch 4 (status pill with dot, accent Save while dirty, "Not set" placeholder, Host/Port grid). Added: `components/connections/obs-block.tsx` Save OBS is `disabled` while the form is clean.

## Spec and test assertions changed (old, new, why)
- `tests/visual/one-editor/fixtures.spec.ts` screen[3] (Layers rows): old `row toContainText("widget")`; new: the row's `layers-row-kind` has text `widget` and class `sr-only`, and the icon tile has `title="widget"`. Same row-by-row check, now also proves the word is not visible and still reaches screen readers.
- Same file, profile[2]: old `cpu toContainText("item")`; new `layers-row-kind` has text `item` and class `sr-only`.
- Same file, hover[0]: tiles 64 px tall becomes 76 px (the user's decision); the three-per-row check is unchanged. Comment says the fixture shows the All chip.
- Same file, hover[3]: `radio "InfoPanel items"` click becomes `button "InfoPanel"` (exact) click, same item and element hover-card checks follow.
- Same file, "Add puts InfoPanel items on the page": same retarget; the sections list `["INFOPANEL ITEMS", "ELEMENTS"]` assertion is unchanged.
- Same file, "category chips scroll sideways": the setup click on `radiogroup "Show"` > "Widgets" is replaced by assertions that the Show group is gone, the chips start `["All", "InfoPanel"]`, and the InfoPanel chip lies inside the row's box (not off-screen). All scroll and fade checks after it are unchanged. The row still fades at its end at 1440 (the category chips continue past it).
- Same file, layersG[0] and the keyboard-only test: old `toContainText("group · 2")`; new: the group's `layers-row-kind` has text `group` and its count span has text `2`. Same facts (a group of two); the word is now screen-reader text.
- Same file, "Add puts InfoPanel items": the last step clicked `radio "All"` of the Show row; now it clicks the `All` chip. The `RECENTLY USED` first-section assertion is unchanged.
- `tests/visual/one-editor/checks.ts`: two check texts reworded (kind word becomes screen-reader text and tooltip; 64 px becomes 76 px, names up to two lines; "item" noted as screen-reader text). They are keys, used by the spec, so both sides move together.
- `tests/components/studio/layers-tree.dom.test.tsx`: old `Overlay textContent contains "group · 2"` and `Weather contains "widget"`; new: group kind text `group` plus visible `2`; widget and item kind elements carry `sr-only` and the right word (one more assertion than before, for the item). The new output is correct because the word is no longer a visible column.
- `tests/settings/connections.dom.test.tsx` "lists a saved mic ...": old saved an unchanged form; new asserts Save OBS is disabled when clean, edits the host, asserts it is enabled, then saves. The `streaming` payload assertion is unchanged.

## Look at in screenshots
Add at 1440 (chip row: All, InfoPanel, System; 76 px tiles with two-line names), Layers with a widget selected (no kind words, lock and eye on the selected row). Not run here: Playwright one-editor spec if `verify` did not select it (see the verify summary).
