# Implementation plan (for Claude Code)

Work in phases. At the end of every phase the app must **build, run and keep every existing feature working**. Commit after each phase. Do not delete an old component until its replacement is wired in and ticked off in `FEATURE_MAP.md`.

> **The model comes first.** Everything must respect `DATA_MODEL.md`:
> - the hierarchy dashboard → profile → zone (widget / panel / blank);
> - the 4-layer style resolution (default → dashboard → profile → widget);
> - Follow / Custom and Force global style;
> - setting source dots.
>
> **The existing config format must load unchanged.**

## Phase 0: Inventory (no UI changes)
1. Map the code:
   - shell and dock (Side / Bottom / Auto, splitter, Ctrl+\\)
   - drawers (Add / Layers / Profiles)
   - canvas, rulers, selection toolbar
   - the settings sheet (header, category list, general cards, widget categories, panel editor)
   - nothing-selected sheet
   - theme, presets and background
   - Sources tab and the data client
   - config persistence and export
2. Write `docs/settings-inventory.md`. For **every** general card, every widget type (16), the panel editor, every panel-widget kind (10), the dashboard / profile / page / general / connection settings, and every preset type, list each setting's key, label, control, options, default, conditions and the level it is stored at.
3. Add anything you find that is missing to `FEATURE_MAP.md`.
4. **Acceptance:** the inventory covers every setting.

## Phase 1: Tokens and primitives
1. Map README §9 onto the existing theme system. The UI chrome tokens stay separate from the dashboard theme.
2. Build or adapt the primitives:
   - `IconButton`, `Button`, `Toggle` (role=switch), `Segmented` (radiogroup), `Select`, `Slider` with value box, `ColorField`, `TextField`, `CodeField`
   - `IconGrid`, `AlignGrid` (3×3 + chips), `UrlField` (upload / drop), `DeviceChecklist`, `SensorField`
   - `Section` ("N changed" + Reset), `FieldRow` (source dot, hint, inline/stacked control)
   - `Tabs`, `Toast`, `ContextMenu`, `Modal`, `Popover`, `Kbd`
3. **Acceptance:** a primitives story or preview page matches the prototype.

## Phase 2: Settings registry and resolution
1. Write the registry from the Phase 0 inventory:
   ```ts
   type Field = { key, label, control, options?, labels?, min?, max?, step?, unit?, default,
     tab: 'content'|'style'|'data'|'profile'|'appearance'|'gstyle'|'general', section, advanced?, hint?,
     visibleIf?: (get) => boolean, level?: 'zone'|'panel'|'panelWidget'|'profile'|'dashboard', noDot? }
   ```
   It contains one general schema, one schema per widget type, the panel schema, one schema per panel-widget kind, and the dashboard schemas.
2. Write the resolver:
   - `effective(zone, key)` = widget value (only if Custom and Force global is off) ?? profile style ?? dashboard style ?? default
   - `source(zone, key)`, which returns default / dashboard / profile / here / overriding / ignored
   - `reset(level, keys)`
3. Write a generic `<Inspector>`:
   - contexts: single zone, multi-select (style only), blank zone, panel plus selected panel widget, Dashboard
   - search across all tabs
   - the Advanced filter, persisted
   - changed counts and resets
   - special sections: panel Widgets, panel JSON, Appearance presets
4. **Acceptance:** every inventory setting appears exactly once, and editing it behaves exactly as before. The source dots match what the current app shows.

## Phase 3: Shell
1. Top bar: profile switcher, Design/Sources, undo/redo, Kiosk, Save, `⋯`.
2. Rail and left panels: Layers (zone-type icons, delete, multi-select), Add (chips, groups, drag and click, fill a blank zone), Profiles (list, new, auto-pick).
3. Inspector dock: Side / Bottom / Auto, splitter, Ctrl+\\, bottom dock with 300 px columns.
4. Zoom bar: panel toggle, grid, rulers, zoom, fit, resolution, magic wand, dock button.
5. Empty states and the Quick tips card.
6. **Acceptance:** FEATURE_MAP §1–3, 5–8 are ticked.

## Phase 4: Canvas interactions
1. Selection model: an array, the last entry is the primary; panel-widget selection is separate.
2. Drag to move (the whole selection) and resize (corner, plus edges if they exist today). Snap to the grid, check collisions, enforce minimum sizes. **One undo step per drag.**
3. Library drag with a ghost; click to place; click to fill a selected blank zone.
4. Context menus (zone and canvas), including Save to My panels and Bind data.
5. Keyboard shortcuts (README §5.4).
6. Undo/redo that also covers settings, theme, global style, presets and panel JSON.
7. Selection chip carrying every action from the old toolbar.
8. **Acceptance:** FEATURE_MAP §4 is ticked. Overlaps are impossible.

## Phase 5: Panels
1. Panel inspector: Panel (Visual/Code), Layout (Stack / Grid / Overlay), Background, Widgets list (**drag reorder**, hide, duplicate, copy/paste, change kind, delete), Selected-widget cards.
2. Code mode: JSON editing, Apply / Ctrl+Enter as one undo step, inline parse errors.
3. Keep the CSS hooks and `@scope` behaviour.
4. **Acceptance:** FEATURE_MAP §11 is ticked, and existing panels (ARCv2, Sample) render the same as before.

## Phase 6: Dashboard inspector and presets
1. Profile tab, Appearance tab (scope, Force global, presets gallery, theme, page background), Global style tab (scope-aware), General tab.
2. Appearance presets apply in one undo step and follow the background rule (only where none is set, unless "Replace the page background" is ticked). Saving your own preset works.
3. Style presets (per widget), and copy/paste/use as global.
4. **Acceptance:** FEATURE_MAP §12 is ticked.

## Phase 7: Data layer and Sources mode
1. Data client:
   - normalise `/api/sources`;
   - one `/events` stream;
   - a `live` map;
   - ring buffers;
   - health states.
2. Explorer UI (README §4.8), including a virtualised table and the responsive drawer.
3. Binding from both sides: the Data tab "Bound data" list and picker (widget mode and item mode), and the explorer's Bind and Used by.
4. **Acceptance:** all points are browsable and live; bindings round-trip through a saved config; HWiNFO shows offline and OpenWeatherMap shows no data when that is their state.

## Phase 8: Polish and QA
1. Persistence of UI preferences (README §5.9).
2. Responsive checks at viewport widths 1024, 1280, 1440 and 1920. Bottom dock checks on 1920×550.
3. Accessibility: labels or titles on every icon button, ARIA roles, focus traps in menus and modals, Escape to close, text contrast of at least 4.5:1.
4. Load every shipped profile and several user configs; confirm identical rendering.
5. Tick every row of `FEATURE_MAP.md` in the PR.

## Guardrails
- Never rename keys or change defaults without a migration.
- Never remove a feature. If something has no obvious home, put it in the most relevant section, mark it `advanced`, and note it in the PR.
- Prefer the libraries already in the repo (icons, store, virtualisation, drag-and-drop).
- None of the prototype's simulated data, sample bindings or sample presets is production behaviour.
