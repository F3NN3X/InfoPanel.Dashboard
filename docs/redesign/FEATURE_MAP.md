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

## 6. Layers
| Current | New |
|---|---|
| Rows with icon and name | Same; the icon shows the zone type |
| Position label "C1·R1 3×2" | Size `3×2` in the row; full position in the tooltip and the placement row |
| Eye | Same |
| Trash | Delete button in the row, context menu, ⌫ |
| Hint text | Footer note |

## 7. Library (Add drawer)
| Current | New |
|---|---|
| Chips: All, Layouts, My panels, System, Media, Network, Info, Other | Same chips |
| 16 widgets | Widget cards with "min W×H" |
| Layout starters (6) | Layouts › Layout starters, plus "Blank zone" |
| Panel presets (10) | Layouts › Panel presets |
| My panels (saved from the panel "…" menu; shared by all profiles; exported; each use is a fresh copy) | My panels; save via the context menu "Save to My panels" |
| Drag onto the grid | Drag with a drop ghost, or click to auto-place; a click fills a selected blank zone |

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
| Web Page | Page (URL) → C; Style reduced to Colors & surface, Border & effects, Advanced |
| Other sensors | no settings |

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

## 13. Data
| Current | New |
|---|---|
| Sources tab | Sources mode: tree, health, table, point inspector, endpoints |
| Widgets claim sensors by key prefix | Unchanged; shown as "Bound data" and "Used by" |
| Panel widget sensor field | Sensor field → picker in single mode |
| `/api/push`, `/api/clear` | Add source menu; Pushed via API category |
| Data API URL | Dash › General › Connection |
