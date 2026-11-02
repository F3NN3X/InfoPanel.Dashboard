# Audit A: Studio (editor app)

Evidence: `scratchpad/refine/shots/studio-*.png` (all opened). Source read only to place fixes. Direction kept: near-black stepped surfaces, Geist + Geist Mono, white primary, one blue, small radius, lucide.

## 1. Critique

Keep:
- The shell is coherent: 72px rail with icon+label, top bar with a command palette in the middle, footer status strip. Surface steps (rail / panel / canvas) read cleanly without shadows.
- Mono is used well for sizes, counts and keys (`1920x550`, `Ctrl+K`, `COL 7`). The Place-on-grid X/Y/W/H row is compact and clear.
- Library and Gauges thumbnails carry the pages; Data's table (name over mono key, tabular NOW column) is dense and scannable.
- The inspector's Show/Style/Data/Behavior tabs with count badges, and the selected-widget tag on the canvas, are good orientation.

What holds it back, in order:
1. The Screens home is the first thing people see and shows three identical blank monitor icons. The thumbnail depends on an async screenshot (`screen-thumb.tsx:18-21`) and has no synchronous fallback.
2. Repeated metadata chrome: every Theme fine-tune row and every Style section carries a pill (`Lock` + `Built-in`, `From Perf heavy`) with an outline, so there are ~12 identical bordered pills per panel. They are state, not actions, and they outweigh the section titles.
3. Edit's canvas is under-used and cluttered at once: the board is 32% with 40% of the stage empty, a permanent Quick tips card sits on the rulers, the contextual toolbar floats at the top of the stage far from the selected widget (and clips its own segmented control), and Add is three stacked filter layers before the first tile.

## 2. Suggestions

### A-01 Screens cards show the screen, not an icon
- Where: studio-1440-home.png, studio-1024-home.png; `src/components/studio/screens/screen-thumb.tsx:12-25`
- Now: all three cards show a dim monitor glyph at 20% opacity in a black 80px band; the card has no visual identity until a shot is captured.
- Suggest: when `shot` is missing, draw a synchronous schematic from the profile's first page: scale `placements` (col/row/w/h on `cols x rows`) into rounded 2px rects filled `ui-raised` with a 1px `ui-strong` edge, on the resolved theme background, keep the object-contain letterbox at the real aspect ratio. Keep the monitor glyph only for an empty page. Raise the band to the screen's aspect ratio (cap 120px) so 1920x550 reads as wide. Swap to the real shot with a 120ms opacity fade (no layout shift).
- Why: Waza "if visible in a screenshot it is real"; uupm ux "Empty States: don't blank empty screens"; recognition over recall.
- Impact: high   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-02 Collapse the repeated state pills
- Where: studio-1440-theme.png (Lock + Built-in x7), studio-1440-w-weather-style.png (From Perf heavy x5); `theme-fine-tune.tsx:20-35,130`, `inherit-chip.tsx`, `section-inherit.tsx`
- Now: each row has two or three dashed/solid outlined pills at roughly the same weight as the title, so nothing is a scan anchor.
- Suggest: drop the outline and fill; render inherited state as 11px `text-ui-3` text with a 12px icon ("From Perf heavy"), only the not-inherited (changed here) state keeps the blue dot + `text-ui-accent-text`. Show Lock as an icon-only 24px ghost button (tooltip keeps the text), revealed at full opacity on row hover/focus and at 60% at rest; `Locked` keeps its coloured pill. Built-in becomes the same plain text.
- Why: Waza "state is quieter than action"; uupm "dense-but-scannable", visual-hierarchy.
- Impact: high   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-03 Quick tips should not live on the canvas
- Where: studio-1440-edit.png and every Edit shot; `canvas-cards.tsx:61-89`
- Now: a 250px card with a close icon sits over the ruler corner and canvas bottom-left on every Edit screenshot, 64px above the toolbar.
- Suggest: move the tips into the empty layers-panel footer (above "8 parts · 1 group") or the inspector's "Nothing selected" body, and auto-dismiss after the first drag/select. Keep `dismissTips()` persistence. If it stays floating: 11.5px text on `#b4b4bc` (hard-coded) becomes `text-ui-soft`.
- Options: A) move to the inspector empty state; B) one-line hint in the footer strip ("Drag to move · Shift multi-select · ? shortcuts"); C) keep card but auto-dismiss on first selection.
- Why: Waza app-shell: transient help must not cover the work surface; uupm ux "progressive onboarding".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-04 Contextual widget toolbar clips and floats away
- Where: studio-1440-w-core-show.png ("Radial" cut off, a stray bracket at x~1056), studio-1440-w-status-data.png; `style-toolbar.tsx`
- Now: the toolbar is pinned at the top of the stage, 280px above the widget it controls; for Core Heatmap the Shape segmented control overflows its container ("Radial" half hidden); the Status Bar's "Icon and value" fills the button edge to edge.
- Suggest: set the toolbar to `max-w-[calc(100%-32px)]` with `overflow-x-auto` or wrap the 3rd+ control into a "More" overflow; segmented buttons get `px-2.5` min and never `overflow-hidden` clip text. Optionally anchor it 8px above the selected rect when there is room, else keep top.
- Why: Waza "no truncation of control labels"; uupm ux touch/target and label clarity.
- Impact: med   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-05 Fit the board to the stage and drop dead air
- Where: studio-1440-edit.png, studio-1024-edit.png; canvas stage/zoom code in `src/components/studio/canvas*`
- Now: 1920x550 at 32% leaves ~290px above and below the board; at 1024 only 28%. Widgets are unreadable at that scale and the first instinct is to zoom by hand.
- Suggest: add "Zoom to selection" (key `2`, a bottom-bar button next to Fit) that fits the selected widget rect to 70% of the stage and a 100% preset; the empty vertical room gets used by the floating toolbar. Also collapse the left panel automatically at <=1100px so 1024 gets 700px stage instead of 520.
- Why: Waza app-shell "the work surface gets the space"; uupm ux "zoom controls for dense canvases".
- Impact: high   Effort: M   Risk: none
- Kind: refinement
- Prototype: no

### A-06 Add panel: one filter row, one count, real previews
- Where: studio-1440-add.png; Add tab components under `src/components/studio/explorer/`
- Now: tabs (Widgets/Panels/Layouts), segmented (All/Widgets/InfoPanel items), chips (All/System/Hardware/Network/Mi... clipped) and a heading ("STUDIO WIDGETS 106") stack before the tiles; tiles are 100x60 icon cards with names truncated ("System Overview ...") on three near-identical variants.
- Suggest: (1) drop the second segmented row into the category chips (add "InfoPanel" as a chip); (2) make the chip row `overflow-x-auto` with a right fade so "Mi..." is not guillotined; (3) tile names `line-clamp-2` at 12px with the variant suffix on a second line instead of "...", and show a 56px mini-render of the widget (from the QA fixture) instead of the generic category icon.
- Options: A) previews only on hover card; B) previews in tiles always (heavier); C) keep icons, fix names only.
- Why: Waza "filters earn their row"; uupm ux "progressive disclosure, no label truncation".
- Impact: high   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-07 Theme header: Save as theme collides with the differences pill
- Where: studio-1024-theme.png (pill overlaps the blue button at x~600-640), 1440 is tight; `theme-preview.tsx:106-136`, `theme-look-card.tsx:114`
- Now: at 1024 "0 widgets differ · hide tags" paints over "Save as theme" so the primary action reads "Save".
- Suggest: the `bar` slot is `flex-1 justify-end` with no min width; set `shrink-0` on the bar and the pill, and let the row `flex-wrap` earlier (`gap-x-3 gap-y-2`); at 0 differences hide the pill (state "0 widgets differ" is noise) or shorten to "0 differ".
- Why: Waza app-shell "no overlapping controls at supported widths".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-08 Inspector gutters: one right edge
- Where: studio-1440-w-weather-main.png, w-core-show.png; `settings-panel.tsx`, `inspector/inspector-view.tsx`
- Now: Widget type select, Custom title input and "Change here" end at x~1430 while headers, X/Y inputs and toggles end at x~1426 and the panel edge is 1440: the content breaks the 14px gutter by up to 8px, and the inputs touch the scrollbar track.
- Suggest: apply `px-3.5` once on the scroller and `min-w-0 max-w-full` to select/input rows; make the select `w-full` only inside a grid cell. Same 14px on the Style tab's `Change here` link.
- Why: Waza app-shell alignment; uupm "consistent spacing rhythm".
- Impact: low   Effort: S   Risk: none
- Kind: refinement
- Prototype: no

### A-09 Alerts and Island: a real empty state
- Where: studio-1440-alerts.png; `src/components/studio/alerts*`
- Now: the page is 90% black: a toggle floating 390px away from its label ("Alerts on" ... toggle) and a one-line outlined box for no rules.
- Suggest: put the toggle directly after its label (gap 12px, `justify-start`), turn the empty box into a centred empty state: 40px bell icon at 40% opacity, "No alert rules yet", one body line, and two actions: `New rule` (primary) and `Start from GPU temperature high` (secondary); list 3 preset chips ("CPU > 90 °C", "RAM > 90%", "Disk almost full") that create the rule in one click.
- Why: uupm ux "Empty States: show helpful message and action".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-10 Library: toast on the grid, truncated search, shelf of chips
- Where: studio-1440-library.png, studio-1024-library.png
- Now: the "Added 1 earlier upload..." toast sits over the last visible card row; the search field is cut to "Search the" at 1440 and collapses to an icon at 1024; the header has 5 controls of competing weight (view toggle, Used by any screen, Canvas files, New InfoPanel profile, Add files).
- Suggest: anchor toasts bottom-centre above the status bar, 16px from it, never over content cells; give the search `min-w-[200px] flex-1` and let "Canvas files . Perf heavy" shrink to its chip first; demote "New InfoPanel profile..." to the menu of Add files (split button) so there is one white primary.
- Why: Waza "one primary per surface"; uupm ux "toast placement, do not occlude content".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: no

### A-11 Data table: display-name column is a wall of inputs
- Where: studio-1440-data.png; Data explorer rows
- Now: every row shows a boxed input holding "System" / "HWiNFO" (the default), so ~300 bordered inputs repeat the source name; NOW values are 13px mono white with units spaced `63.98 %`.
- Suggest: render the display name as plain text in `text-ui-3` placeholder style and only draw the input border on hover/focus or when overridden (then in `text-ui-1`); align NOW right with `tabular-nums` and unit in `text-ui-3` at 11px so digits line up (`63.98 %` vs `945.11 RPM`). Add a "Live" pulse dot in the NOW header only when the connection is live, uupm "live/stale labelling".
- Why: Waza data-viz "numbers right-aligned, units quiet"; uupm "dense-but-scannable".
- Impact: med   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-12 Footer strip: three kinds of status in one line
- Where: all shots, bottom bar; status bar component in `src/components/studio/`
- Now: "Data API · connected", "Served by 127.0.0.1", "No kiosks" and the dashed green "Kiosks show Main · rotation paused" pill share one 11px row; the dashed pill is the loudest thing on every screen and the Live pill at top says the same ("Live · 0").
- Suggest: make "Kiosks show Main · rotation paused" plain 11px text with a 6px dot like its neighbours (green only when a kiosk is actually attached; amber for paused); remove the dashed border; keep one place that says kiosk count (footer or top Live pill, not both).
- Why: Waza "status is quiet until it needs action"; uupm "status colours semantic".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-13 Rail active state and label size
- Where: all shots, left rail; `src/components/studio/studio-rail*` (or `app-rail`)
- Now: active item is a `#18181b`-ish rounded tile (very low contrast vs the rail); "Alerts & Island" wraps to two lines and the labels sit at 11px against 20px icons with 4px gap; Screens and Edit icons are 24px but the rest 22px visually.
- Suggest: add a 2px `ui-accent` bar on the rail's left edge for the active item (inset 8px top/bottom) and raise the active tile one step; rename the label to "Alerts" (title tooltip keeps "Alerts & Island") to stop the wrap and even the rhythm; icon strokeWidth 1.75 everywhere.
- Options: A) accent edge bar; B) filled tile plus white icon; C) both.
- Why: Waza app-shell "active nav state at 3:1 non-text contrast"; uupm "navigation state clarity".
- Impact: med   Effort: S   Risk: none
- Kind: refinement
- Prototype: yes

### A-14 Segmented selected state
- Where: Layers/Add (edit shots), All/Widgets/InfoPanel (add), Fill/Scroll (home), page switcher in Theme; `theme-preview.tsx:120` uses `bg-[#27272a]`
- Now: selected segment is a slightly lighter grey; in Layers/Add the unselected "Layers" tab (with the white outline of the whole container on Layers-selected) looks selected on `studio-1440-selected.png` because the outer white ring wraps the pair, not the active segment.
- Suggest: one `Segmented` primitive: no outer white ring (the focus ring only on `:focus-visible`), active segment `bg-ui-raised` + `text-ui-1` + 1px `ui-strong` inner border, inactive `text-ui-soft`. Replace the hard-coded `#27272a`/`#fafafa` with tokens.
- Why: Waza "one selected-state treatment"; uupm ux "active state clarity".
- Impact: med   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-15 Command palette: group, recent and key hints
- Where: studio-1440-palette.png, studio-1024-palette.png
- Now: an empty query lists 16 identical "Go to setting: Series 1..6" rows under one THEME heading; the right-hand path ("Theme > Status & series colors") is repeated on each row; the input has no scope hint.
- Suggest: with an empty query show 3 groups only: Recent (5), Actions (Save, Export, New screen, Show on kiosks), Go to (rail pages); settings appear only once the user types. Collapse repeating setting siblings into one row ("Series 1-6 colors"). Add a footer line `Enter run · Up/Down move · Esc close` (11px mono). Drop the "Go to setting:" prefix when the right column already says Theme >.
- Why: uupm ux "search: show recents, group, shortcuts"; Waza "palette is a launcher, not an index dump".
- Impact: med   Effort: M   Risk: none
- Kind: refinement
- Prototype: yes

### A-16 Layer rows: kind tag and drag handle noise
- Where: studio-1440-selected.png; layers tree
- Now: each row's right side repeats `widget` / `item` mono words and a drag-handle glyph on items, adding 3 columns of low-contrast text; group rows show `group · 2` plus lock.
- Suggest: drop the `widget`/`item` word (the leading icon already says it); show it as the tooltip. Show drag handle, lock and eye only on hover/selection, except a hidden/locked state which stays visible. The freed width lets names like "Core Heatmap" never truncate in the 330px panel.
- Why: Waza "remove what repeats"; uupm ux "visual noise reduction".
- Impact: low   Effort: S   Risk: none
- Kind: refinement
- Prototype: no

### A-17 Gauge cards: names clip and previews differ in scale
- Where: studio-1440-gauges.png, studio-1024-gauges.png
- Now: "Ring with a hex fa...", "Segmented tacho...", "SVG template (ani..." clip at one line; the thin Bar / Threshold bar are almost invisible in a 90px tile while rings fill it.
- Suggest: line-clamp-2 for the name (cards already have a name band); normalise every preview to the same optical size (bars drawn 60% of tile width at 6px stroke, `bg-ui-raised` track); the "In Perf heavy" and "My library" sections should show a muted dashed placeholder tile ("Add one from the canvas") instead of text only.
- Why: Waza gotchas "metric and label footers must not tail-truncate"; uupm ux consistency of preview scale.
- Impact: low   Effort: S   Risk: none
- Kind: refinement
- Prototype: no

### A-18 Replace hard-coded greys with tokens
- Where: `canvas-cards.tsx:54,81` (`#b4b4bc`), `theme-preview.tsx:120,132` (`#27272a`, `#fafafa`, `#1e3a8a`, `#0b1530`), 299 `text-[NNpx]` instances across `src/components/studio/`
- Now: many one-off sizes (11.5, 12.5, 13) and hex greys exist beside the `text-micro/caption/body/title` scale and `ui-*` tokens, so adjacent labels drift by half a pixel.
- Suggest: map 11.5 -> `text-micro`(11) or `text-caption`; 12.5/13 -> `text-body`; `#b4b4bc` -> `text-ui-soft`; `#27272a` -> `bg-ui-raised`; accent-pill colours -> `ui-accent-soft` bg/border tokens. A lint grep in verify (`text-\[\d`) keeps it from regrowing.
- Why: Waza "one type scale"; uupm "token-only styling".
- Impact: low   Effort: M   Risk: none
- Kind: refinement
- Prototype: no

### A-19 Home: a screen detail that is quieter, and a hover on the card
- Where: studio-1440-home.png (right panel); `screen-detail.tsx`
- Now: the right panel fits form fields (display name, width, height, size preset, grid) in one tall scroller below a single Open button; the card's own "Open" row duplicates the panel's "Open"; "Settings ↗" link floats in blue at the row end.
- Suggest: card footer becomes the only Open; panel header action becomes "Edit screen" is redundant so drop it. Group the panel as three collapsible headed sections (Shown on, Size & fit, Grid) with the first two open; show the real thumbnail (A-01) at the panel top at 16:9 so selection is confirmed visually.
- Why: Waza "one primary per context"; uupm "progressive disclosure".
- Impact: med   Effort: M   Risk: none
- Kind: refinement
- Prototype: no

### A-20 Direction: live canvas mini-map and page strip on Screens
- Where: Screens home and Edit page tabs
- Now: pages are only a tab "Main" in Edit and a count ("2 pages") in Screens.
- Suggest: on Screens, expand a selected card to a strip of its page thumbnails (same schematic as A-01), click opens Edit on that page; in Edit, the page tabs show 48px thumbnails on hover. Same renderer, no new data.
- Why: uupm ux "recognition over recall".
- Impact: med   Effort: L   Risk: none
- Kind: direction
- Prototype: no

## 3. Cross-cutting

- State chips (Built-in / From X / Lock / differs) are one pattern drawn five ways; one `StateTag` primitive (plain text + icon, accent only when changed) fixes Theme, Style, inspector and Library at once.
- Selected state differs per control: segmented, rail, tabs, chips, layers each pick their own greys; one `selected` token set removes the hard-coded `#27272a`.
- Half-pixel type (11.5/12.5) and ~300 `text-[Npx]` should collapse to the shared scale.
- Truncation by ellipsis in cards (Add tiles, Gauges, Library names) wants `line-clamp-2` as the card-name default.
- Empty states are single sentences (Alerts, Gauges "In Perf heavy", "My library"): one `EmptyState` (icon, line, action) primitive.
- Overlays on work surface (Quick tips, toast) need a reserved lane, not absolute positions on content.
- Header rows with several floating controls (Theme preview, Library header) need `shrink-0` on primary and flex-wrap at 1024.
