# Feature map: current app → redesigned studio

This is the **no-feature-loss checklist**. It is built from `reference/current-ui-before.png` and `reference/design-overview.md`. Tick every row before you call the redesign done, and paste the ticked list into the PR.

**Rules**
- Keep every setting's **key, default and behaviour**. Only its position in the UI changes.
- If you find a control in the code that is not listed here, add it. Place it like this:
  - what the widget shows or does → **Content**
  - how it looks → **Style**
  - where its values come from → **Data**
  - rarely used → mark it **Adv**
- The inspector is driven by **one registry**:
  - one general schema shared by all zones;
  - one schema per widget type;
  - the panel schema;
  - one schema per panel-widget kind.

  Do not hard-code panels for individual widgets.

Legend: **C / S / D** = the Content / Style / Data tab. **Adv** = hidden until "Advanced settings" is on. **Dash** = the Dashboard inspector (nothing selected).

Rows marked **(+)** were added by the Phase 0 code inventory (`docs/settings-inventory.md`): they exist in the code today but were missing from this list. Their "New" column is a proposal that follows the rules above.

---

## 1. Top bar
| Current | New |
|---|---|
| Dashboard/config name dropdown ("MyDefault ▾") and its menu | Top-bar **profile switcher** shows the active profile; the config-level items (switch/new/rename/duplicate/delete/import/export) stay in this menu or in `⋯` |
| Meta "1920×550 · 12×6 · 10 zones" | Top-bar meta `W × H · cols × rows · Fit · N zones` |
| Design / Sources | Segmented control, centre |
| Undo / Redo | Top bar right, plus ⌘Z / ⇧⌘Z |
| Save | Primary button with an unsaved-changes dot |
| Kiosk view | Secondary button |
| `⋯` overflow | Last item on the right |
| (+) `⋯` › Export config / Import config… | Keep in `⋯` (config-level items) |
| (+) `⋯` › Copy profile JSON | Keep in `⋯`; also in the Profiles panel row menu |
| (+) `⋯` › Reset everything… (confirm dialog with "Export first") | Keep in `⋯`, last item before the build id; same confirm dialog |
| (+) `⋯` › Command palette… (Ctrl+K) and Keyboard shortcuts (?) | Keep in `⋯`; the palette is also on Ctrl+K and is unchanged (see §14) |
| (+) `⋯` › build id (disabled item) | Keep as the last line of `⋯` |
| (+) Save button shows "Saved" for a moment after saving; Save pushes to the dashboard server | Keep: primary button, checkmark flash; the dot means "edits not pushed yet" |
| (+) Profile switcher menu: Auto (match window) entry with a check, profile size on each row | Keep inside the profile switcher |

## 2. Rail and drawers
| Current | New |
|---|---|
| Add / Layers / Profiles drawer (in the dock, it becomes the first column) | Rail `add_box` / `layers` / `devices` → left panel |
| Grid/apps rail icon | Check what it opens today; keep it (layouts/templates → Add › Layouts) |
| Monitor rail icon | Check what it opens today; keep it (kiosk/display settings → `⋯` or Dash › General › Display) |
| Database rail icon | Rail `database` → Sources mode |
| — | Rail `keyboard` → Shortcuts sheet |

## 3. Profiles
| Current | New |
|---|---|
| Profiles list and switching | Profiles panel rows; top-bar switcher |
| New profile (6 or 12 cols, 4 or 6 rows by size) | "+" in the Profiles panel |
| Auto: pick the profile closest to the window | Profiles panel footer toggle; Dash › Profile › Profile selection |
| Size, grid cols × rows, Fill / Scroll, gap (default 12), padding | Dash › Profile › Profile |
| Profile theme / style / background: Inherit / Custom (/ None for the background) | Dash › Profile › This profile |
| Shipped profiles (Sample 1920×550, ARCv2, Main display, Kiosk strip, Small 1024×600) | Same list; content unchanged |
| (+) Delete the active profile (disabled when only one is left; Auto afterwards) | Profiles panel: delete button on the row; Dash › Profile |
| (+) Profile name | Dash › Profile › Profile (editable name) |
| (+) Design size W / H (free number fields) | Dash › Profile › Profile; the zoom-bar resolution button jumps here |
| (+) Grid Cols (2–24) and Rows (1–24) −/+ steppers; zones are clamped into the grid | Dash › Profile › Profile |
| (+) Gap and padding empty = default (placeholder shows it; padding default is 0 in a fill kiosk, 24 in scroll) | Dash › Profile › Profile; keep "empty = default" |
| (+) Profile theme (Inherit / Custom colours + radius), profile Force global style (Inherit / On / Off) | Dash › Profile › This profile; editors in Dash › Appearance when the scope is This profile |

## 4. Canvas
| Current | New |
|---|---|
| Pixel rulers | Kept; Rulers toggle in the zoom bar |
| Grid / dot background | Kept; Grid toggle in the zoom bar |
| Click a zone to select | Kept, plus multi-select, drag to move, corner resize, context menu, shortcuts |
| Selection toolbar: type dropdown | C › Widget › Widget type; also the chip's More menu |
| Selection toolbar: size readout | Selection chip and the placement row |
| Selection toolbar: 4 align/expand icons | Chip **More** menu and the canvas context menu; **keep the exact current actions** |
| Selection toolbar: hide / duplicate / delete / Style / close | Chip, context menu, inspector header, H / ⌘D / ⌫, Esc |
| Edge resize handles | Corner handle and ⇧arrows; **keep the edge handles too** if they exist today |
| Minimum zone sizes per widget | Enforced on resize, on the W/H fields and on type change |
| Blank zone ("Pick a widget") | Dashed tile; inspector Widget › Pick a widget plus Zone frame |
| (+) Draw-to-create: drag across empty grid cells to draw a blank zone (clamped to the grid; nothing is added when there is no room) | Keep on the canvas; the new blank zone is selected; the empty-canvas card reads "Draw a zone, or drag a widget from Add" |
| (+) Selection toolbar: four span-step buttons (Narrower / Wider / Shorter / Taller by one cell, disabled when blocked; Shift+arrows) | These are the "4 align/expand icons" above: chip More menu and context menu, keep the exact actions |
| (+) Selection toolbar: widget-type crumb with Change widget, second crumb for the selected panel widget | Chip name (opens Widget type) plus a widget crumb for panels |
| (+) Selection toolbar "Style" button (jumps to Colors & surface) | Chip action → opens the Style tab at Colors & surface |
| (+) Arrow keys nudge a zone one cell; Shift+arrows resize it | Keep (README §5.4) |
| (+) Drag a widget or panel from Add and drop on the canvas (auto-placed at its minimum size) | Keep, with a drop ghost |
| (+) Move / resize ghost with a size label while dragging; 4 px drag threshold; hover size chip | Keep |
| (+) Click inside a selected panel zone selects the panel widget under the pointer | Keep (Esc steps widget → zone → none) |
| (+) Hidden zones stay selectable and editable on the canvas but do not show in the kiosk | Keep; Layers row dims them |

## 5. Bottom bar → zoom bar
| Current | New |
|---|---|
| Grid toggle | Zoom bar |
| Zoom − / % / + / fit | Zoom bar (Fit = ⌘0) |
| "1920 × 550" | Zoom bar resolution button → Dash › Profile |
| Magic wand | Zoom bar; same action |
| Panel layout toggles (Side / Bottom / Auto) | Zoom bar dock button (cycles); Dash › General › Studio |
| Dock splitter | Keep it on the Bottom dock |
| Ctrl+\\ collapse | Same |
| (+) Click the zoom % to reset to 100%; Ctrl+wheel zooms; Fit is "sticky" (stays fitted on resize) | Zoom bar % button and canvas; keep |
| (+) Rulers are always on today (no toggle) | The Rulers toggle in the row above is new; default on |
| (+) The "Magic wand" in the table above is today the **Auto** inspector-position icon (no canvas auto-arrange action exists) | Zoom bar dock button (cycles Auto / Side / Bottom); confirm before building a separate auto-arrange action |
| (+) Dock collapse button at the left end of the zoom strip (bottom dock) | Keep |

## 6. Layers
| Current | New |
|---|---|
| Rows with icon and name | Same; the icon shows the zone type |
| Position label "C1·R1 3×2" | Size `3×2` in the row; full position in the tooltip and the placement row |
| Eye | Same |
| Trash | Delete button in the row, context menu, ⌫ |
| Hint text | Footer note |
| (+) Click a row selects the zone and scrolls it into view on the canvas | Keep |
| (+) Rows are in grid reading order (top to bottom, left to right) | Keep |
| (+) Hidden zones dimmed in the list | Keep |

## 7. Library (Add drawer)
| Current | New |
|---|---|
| Chips: All, Layouts, My panels, System, Media, Network, Info, Other | Same chips |
| 16 widgets | Widget cards with "min W×H" |
| Layout starters (6) | Layouts › Layout starters, plus "Blank zone" |
| Panel presets (10) | Layouts › Panel presets |
| My panels (saved from the panel "…" menu; shared by all profiles; exported; each use is a fresh copy) | My panels; save via the context menu "Save to My panels" |
| Drag onto the grid | Drag with a drop ghost, or click to auto-place; a click fills a selected blank zone |
| (+) Search box (matches title, id and description, every word) | Library search; Esc clears it |
| (+) Usage count badge on each widget row (how many zones of the profile use it) | Keep on the widget cards |
| (+) Section notes (minimum size, "sensor-free starters", panels note) | Keep as the section footers |
| (+) My panels rows: Rename… / Delete in the row's "⋯" | Keep in the My panels group |
| (+) Widget picker dialog for a zone (Change widget / Pick a widget) with the same search, chips and list | Keep: opened by the chip's name, Widget type, and Ctrl+K "Pick widget…" |

## 8. Inspector header and navigation
| Current | New |
|---|---|
| Zone name | Editable name input |
| "11 live sensors" | Meta: `W×H · min · N data points` / `Panel · layout · N widgets` / `Blank zone` |
| Hide / duplicate / remove / close | Header icon buttons; close = Esc or click on empty canvas |
| Zone box (column, row, width, height) | Placement row COL / ROW / W / H |
| Search | Search across all tabs |
| Category list that jumps to a card | Tabs plus collapsible sections plus search |
| "N changed" per card; reset of only that card | "N changed" plus Reset on every section; changed-count badge on each tab |
| Setting dots (default / set here / dashboard / profile / overriding; hover a set dot to reset) | Source dots (README §5.6), legend behind `help` in the footer; click a set-here dot to reset |
| Inspector side / bottom dock, 300 px columns | Side 340 / Bottom 320 with 300 px columns / Auto |
| (+) Esc clears the search first, then steps out (panel widget → zone → none), then closes the left drawer | Keep this order |
| (+) Palette entries "Go to setting: …" and "Go to Widget settings / Colors & surface" scroll to and flash the card | Keep: the registry feeds the palette; the jump now switches tab and opens the section |
| (+) Section open/closed state is remembered (`studio.sections`); beside the canvas sections collapse, in the dock all show | Keep as a persisted UI preference |
| (+) Changed count, Reset and the info-tooltip hint on every card | Already listed; keep the hint tooltip too |
| (+) Rows are locked (read-only) while the zone follows the global style or Force is on | Keep; shown as the amber "ignored" dot plus the Customize link |
| (+) Zone-header breadcrumb "Panel › Widget" (crumbs select the panel / show the widget editor) | Keep above the tabs when a panel widget is selected |

## 9. General cards (all zones)
| Current field | Tab › Section | Notes |
|---|---|---|
| Widget type + Change | C › Widget | select of the 16 types |
| Custom title | C › Widget | |
| Icon (grid of about 20, including none) | C › Widget | icon grid |
| Hide when idle | C › Widget | only Spotify, Media, Steam, FPS, Notifications |
| Visible | C › Widget, plus header eye | |
| Layout auto/card/standard/compact/simple | S › Size & alignment | adaptive widgets only |
| Scale with the zone | S › Size & alignment | Adv |
| Size % | S › Size & alignment | |
| 3×3 alignment (+ Auto / Spread) | S › Size & alignment | alignment grid |
| Text color, secondary color | S › Typography | |
| Font, value weight | S › Typography | |
| Label case: Auto / UPPERCASE / As written / Capitalized | S › Typography | |
| Inner padding, gap, corner radius (Auto + values) | S › Spacing & shape | |
| Ring / bar thickness | S › Spacing & shape | |
| Follow global / Custom | S › Colors & surface › Look | |
| Style preset | S › Colors & surface | |
| Surface: Glass / Matte (light) / Matte (dark) / Theme | S › Colors & surface | |
| Accent | S › Colors & surface | |
| Background image (upload / URL / drop), use as background | S › Colors & surface | Adv |
| Surface opacity, background blur | S › Colors & surface | |
| Copy / paste / save style | Context menu (⌘⌥C / ⌘⌥V) + Style preset "Save" | |
| Border width, border color | S › Border & effects | |
| Glow none/soft/strong, glow color | S › Border & effects | the colour shows only when glow ≠ none |
| Zone frame: accent, background, title header | S › Border & effects | Adv |
| Custom CSS (`@scope`, `:scope` = root) | S › Advanced | Adv |
| (+) Preset (Default / Dark / Light / Vivid / Mono quick look; writes surface, tint, accent) | S › Colors & surface, next to Surface (not a look key: absent from Global style) |
| (+) Use as global… (All profiles / This profile) | Colors & surface "…" menu and the context menu |
| (+) Style presets: Apply preset, Save as preset…, Delete preset | S › Colors & surface "…" menu (already named above as "Style preset"; Delete is also needed) |
| (+) Frame background hidden on panels (they have their own surface) | S › Border & effects › Zone frame; keep the panel exception |
| (+) Layout appears in the code for all 11 modern widgets, not only adaptive ones | See `settings-inventory.md` open question 2; default: keep on all 11 |
| (+) Departures, Notifications, Text File, Stream Deck and Other sensors have no title, icon, preset, layout or background image, and their Surface defaults to Theme | Their Widget section shows only the type and Visible; Style shows the rest |

## 10. Widget-own categories
| Widget | Section → tab |
|---|---|
| System | Devices, CPU, GPU, Memory, Drives, Trends, Thresholds, Units & labels → C; Device colors → S (Adv) |
| Spotify / Media | Now playing (times, progress), Cover art (tint, blurred bg), Waveform (live, style, mode, gain, active), Visualizer (on, count, alignment, idle, mirrored · resting · loading sweep · orientation = Adv) → C; Waveform shape (bar width, gap, radius, min height, line width, edge fade, fade width) → C (Adv); Audio source (level source, live capture, capture devices checklist, microphone access) → D |
| Steam | Content (dim banner, stats, news) → C |
| Hardware | Content (list / temp gauges, rows, fans) → C; Dot colors → S (Adv) |
| Weather | Display (full/now/forecast/minimal, tint), Current conditions, Forecast (days) → C |
| FPS | Content (gauge/trend, metrics, sparkline) → C; Gauge colors → S (Adv) |
| Audio | Content (device, meter/volume) → C; Meter (solid/segmented/gradient, orientation, ballistics; colours Adv) → C |
| Wave Link | Content (meters to show, dB readout, fader, mixes) → C; Meter → C |
| Bluetooth | Content (full/devices/status) → C; Battery colors → S (Adv) |
| Network | Content (speeds/totals, sparkline) → C; Speed colors → S (Adv) |
| Departures | Content (status) → C |
| Notifications | Content (history, max lines) → C |
| Text File | Content (meta) → C |
| Stream Deck | Content (profile, labels) → C |
| Web Page | Page (URL) → C; Style reduced to Colors & surface, Border & effects, Advanced. **Code today:** also `scale` (Size & alignment) and `radius` (Spacing & shape), accent and the four border/glow keys, and no Custom CSS: keep what exists, see `settings-inventory.md` question 5 |
| Other sensors | no own settings; it still has the card style (Surface default Theme, accent, size, spacing, typography, border and effects) |

Enter each widget's **exact** current fields from its settings component. The prototype's fields are representative only.

## 11. Panels
| Current | New |
|---|---|
| Panel card: Visual / Code | C › Panel › Editor; Code = JSON textarea, Apply / Ctrl+Enter, one undo step |
| Fill / Hug, gap 0–200 / auto, padding 0–200 / auto | C › Panel (keep the **auto** option for gap and padding) |
| Layout Stack: direction, wrap (on), 3×3 alignment (along: start/center/end/spread; across: start/center/end/stretch) | C › Layout |
| Layout Grid: columns 1–12, column sizes, row sizes, 3×3 cell alignment | C › Layout |
| Layout Overlay: scrim, band alignment, bottom band columns 1–12, title top-right | C › Layout |
| Background card (Overlay) | C › Background |
| Widgets list: drag reorder, hide, duplicate, copy/paste, change kind, delete | C › Widgets |
| Selected widget: kind card (kind-specific fields) | C › Selected · … |
| Selected widget: Display (label, sensor, sub sensor, unit, decimals, scale) | C › Display, plus the kind card |
| Selected widget: Size & placement (Hug / Fill / Fixed · span / start · band) | C › Size & placement |
| Selected widget: Typography, Colors | C › Typography & colors |
| Selected widget: Advanced (class names, CSS scoped to the cell) | C › Selected · Advanced (Adv) |
| Panel surfaces None / Card / Bordered card | S › Colors & surface (panels show these options) |
| Save panel to My panels (panel "…" menu) | Context menu "Save to My panels" |
| CSS hooks (`.wp-panel`, `.wp-widget--{kind}`, parts, variables, `@scope`) | Unchanged |
| (+) Code view: Revert (drops the draft), inline parse errors, panel title change also updates the shown title | C › Panel › Code |
| (+) Widget list keyboard: Up/Down select, Alt+Up/Down reorder, Delete removes; row menu Duplicate / Copy / Paste after / Change kind / Remove | C › Widgets; keep (README §5.4 shortcuts also apply) |
| (+) Panel widget shortcuts: Del, Ctrl+D, Ctrl+C, Ctrl+V, Alt+Up/Down; palette "Select widget: …" for each widget | Keep |
| (+) Grid track editor: chips accept any CSS track (`1fr`, `auto`, `120px`, `minmax(0, 1fr)`), +/− add or drop the last track, Equal | C › Layout (Column sizes / Row sizes) |
| (+) Overlay Background: choose which image widget fills it; dark scrim toggle | C › Background |
| (+) Panel widget: width/height Fixed px (1–4000), Align self, Column/Row start (1–24), Column/Row span (1–12) | C › Size & placement |
| (+) Panel widget table: Rows 1–20 (7), Columns, Header; sparkline history 5–200 (40); image Max height; clock Show; shape Shape and Thickness | C › Display (per kind, `settings-inventory.md` §3.3) |
| (+) "Not in the live sensor list" warning on a bound sensor | Keep under the Sensor field |
| (+) Panel Gap and Padding empty = auto | Already noted in this section; keep the "auto" placeholder |
| (+) Saved panels: Rename… / Delete in Add › My panels | Library (§7) |

## 12. Nothing selected → Dashboard inspector
| Current | New |
|---|---|
| Appearance: scope All profiles / This profile | Dash › Appearance › Scope |
| Force global style (Inherit / On / Off; dashboard or per profile) | Dash › Appearance › Scope |
| Presets gallery (9 appearance presets, one undo step; background only where none is set unless "Replace the page background") | Dash › Appearance › Appearance presets |
| Save the current look as a preset | Same section |
| Global style (general cards at dashboard or profile level) | Dash › Global style (scope-aware note) |
| Page › Theme colors (19 tokens, 6 presets, radius) | Dash › Appearance › Theme (rarely used tokens = Adv) |
| Page › Background (none/color/gradient/image/video, fit, position, dim, tint, blur; video rules) | Dash › Appearance › Page background |
| General › Type (font) | Dash › General › Type |
| General › Clock & date (12/24 h, seconds, locale) | Dash › General › Clock & date |
| General › Display (motion, hide cursor in kiosk) | Dash › General › Display |
| Connection (Data API URL) | Dash › General › Connection |
| (+) Connection: Test connection (testing / connected / not reachable) and the "Open API index" link | Dash › General › Connection |
| (+) Appearance gallery: Rename… / Delete on saved looks; image badge on looks that bring a background | Dash › Appearance › Appearance presets |
| (+) After applying a preset: banner "N widgets keep their own style · N profiles have their own look" with **Make them follow** and Dismiss | Dash › Appearance › Appearance presets |
| (+) Commands "Make all widgets follow global style", "Force global style…" and "Apply appearance: …" | Palette entries; also an action row in Dash › Appearance |
| (+) Page background media: Upload… (drop a file on the field too), typed URL (Enter or blur), Library popover (delete a file, clean up unused files after a confirm), live preview, poster image | Dash › Appearance › Page background |
| (+) Video options: Loop, Muted, Speed (0.5×–2×), Poster, performance hint | Dash › Appearance › Page background |
| (+) Background Effects: Dim, Tint colour + opacity, Blur (0–40 px) | Dash › Appearance › Page background |
| (+) Per-profile background modes Inherit / Custom / None; Custom starts from the dashboard background | Dash › Profile › This profile |
| (+) Theme: six colour-only swatches that leave the radius alone; "edited" tag when tokens match no preset; Custom starts from the dashboard theme for a profile | Dash › Appearance › Theme |
| (+) Six theme tokens (`popover`, `popover-foreground`, `secondary-foreground`, `accent-foreground`, `destructive-foreground`, `input`) are in the config and presets but not editable | Keep unreachable, or Adv (`settings-inventory.md` question 7) |
| (+) General › Clock & date locale list (14 locales plus System; an unknown saved locale is kept as an option) | Dash › General › Clock & date |

## 13. Data
| Current | New |
|---|---|
| Sources tab | Sources mode: tree, health, table, point inspector, endpoints |
| Widgets claim sensors by key prefix | Unchanged; shown as "Bound data" and "Used by" |
| Panel widget sensor field | Sensor field → picker in single mode |
| `/api/push`, `/api/clear` | Add source menu; Pushed via API category |
| Data API URL | Dash › General › Connection |
| (+) Sources mode: per-source show/hide (eye) and Display name (`sourcePrefs`, stored on the dashboard) | Sources mode, source row and detail; today nothing outside the Sources panel reads them |
| (+) Sources mode: Bind to widget / Unbind (writes the widget's `source` setting) | Sources mode "Used by" actions and Data tab › Bound data |
| (+) Sources mode: filter box, refresh (reload from the Data API), "Open API index" link, live value chip on each source | Sources mode toolbar and rows |
| (+) Audio source (live level source, live capture, capture devices, microphone access) | D › Audio source (already stated in §10; listed here for the data checklist) |

## 14. Keyboard, command palette and persistence (+)
| Current | New |
|---|---|
| (+) Command palette (Ctrl+K): Add, Profiles, Zones, selected zone/widget actions, Go to setting, drawers, document tabs, layout modes, zoom, appearance presets, export/import/copy profile/shortcuts | Keep every command; the registry supplies the setting and tab entries; palette stays on Ctrl+K and in `⋯` |
| (+) Shortcuts (cheat sheet `?`): Ctrl+S / Z / Shift+Z / Y / K / D / 0 / = / - / `\`, Esc, Del / Backspace, H, arrows, Shift+arrows; widget: Del, Ctrl+D, Ctrl+C, Ctrl+V, Alt+Up/Down | Keep (README §5.4); shortcuts never fire while focus is in an input |
| (+) Copy style / Paste style clipboards and the copied panel widget are session-only | Keep session-only |
| (+) Autosave: the studio pushes the config to the server 400 ms after a change; Save flushes; the kiosk reloads from `/events/config` | Keep (CLAUDE.md "Save") |
| (+) Undo history: whole-config snapshots, limit 100, edits to one field within 500 ms coalesce | Keep; one drag / panel JSON apply / appearance preset = one step |
| (+) Studio UI preferences in `localStorage`: `studio.layout`, `studio.dockHeight`, `studio.dockCollapsed`, `studio.drawer`, `studio.sections` | Keep; README §5.9 |
| (+) Import config… runs the v1→v2 migration; invalid files are logged and ignored | Keep |
