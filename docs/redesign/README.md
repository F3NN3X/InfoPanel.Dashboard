# Handoff: Widget Studio UI Redesign

> **For Claude Code — read in this order:**
> 1. `README.md` (this file): the UI spec, i.e. layout, components, interactions and tokens.
> 2. `DATA_MODEL.md`: how the app works today (dashboard → profile → zone → widget / panel / blank, the 16 widgets, panels, presets, the 4-layer styling model) and where each part lives in the new UI.
> 3. `FEATURE_MAP.md`: a checklist that maps every current feature to its new location. **No feature may be lost.**
> 4. `IMPLEMENTATION_PLAN.md`: the phased build order with acceptance criteria.
> 5. `CLAUDE.md`: standing rules. Copy it into the repo root.
>
> **What wins when sources disagree:**
> - For **behaviour**, `reference/design-overview.md` (the current app) and `DATA_MODEL.md` win.
> - For **look and placement**, this README and the prototype win.

---

## 1. Overview

InfoPanel Studio designs dashboards for one or more displays. Its building blocks:
- **Profiles:** one per display size. Each has its own grid, theme, style and background.
- **Zones** on each profile's grid. A zone holds a **widget** (16 kinds), a **panel** (a small layout of up to 10 kinds of panel widgets), or stays **blank**.
- **Live sensor data** from the local **InfoPanel Data API**. Widgets claim the data points they read.

The current UI has every feature, but its layout makes them hard to use:
- a bottom dock with up to 8 card columns;
- one long sheet with a category list on the left;
- global and per-widget looks mixed together;
- no data-source browser.

The redesign keeps every capability and changes the layout, information architecture and interactions:

1. **Classic 3-pane studio:** an icon rail plus left panel (Layers / Add / Profiles), then the canvas, then the inspector. The inspector docks **Side, Bottom or Auto**, as the current app's dock does.
2. **Schema-driven inspector:** tabs (**Content / Style / Data**) and collapsible sections. It adds search across tabs, an Advanced toggle, and **source dots** that show where each value comes from, with per-field and per-section reset.
3. **Dashboard inspector** when nothing is selected, with the tabs Profile / Appearance / Global style / General.
4. **Direct manipulation:** drag to move, resize, drag in from the library, multi-select, context menus, keyboard shortcuts, undo/redo.
5. **Sources mode:** a data explorer for all ~650 API data points. Bindings can be managed from there or from each widget's Data tab.

## 2. About the design files

The files in `reference/` are **design references in HTML**. They are not production code. Rebuild the design inside the existing React + Vite codebase, using its components, store, styling and data layer.

| File | What it is |
|---|---|
| `reference/Studio A.dc.html` | The full interactive prototype. To open it, serve the folder (for example `npx serve reference`); it needs `support.js` and `sources-data.js` next to it. |
| `reference/sources-data.js` | A snapshot of the Data API's `/` page, parsed into JSON. Production must use `/api/sources`, `/api/sensors` and `/events`. |
| `reference/design-overview.md` | The current app's own description of its widgets, panels, layouts, presets and styling. It is the source of truth for behaviour. |
| `reference/current-ui-before.png` | A screenshot of the current UI. |

The prototype's logic class (`class Component extends DCLogic`) is plain JavaScript. These parts are useful as executable spec:

| Part | What it specifies |
|---|---|
| `WT`, `OWN`, `STYLE_SECS`, `GENERAL_SEC`, `PANEL_SECS`, `itemSecs()`, `CANVAS_SECS`, `GSTYLE_SECS` | The settings registry |
| `getV` / `setV` / `resetV` / `srcOf` / `effStyle` | Value resolution and source dots |
| `free()` / `findFree()` / `dragMove()` | Grid maths |
| `buildData()` / `mkPoint()` | Data API normalisation |
| `key()` | Keyboard shortcuts |

Read these. Do not copy them.

## 3. Fidelity

**High fidelity.** The colours, type, spacing, radii and states are final. Map the tokens in §9 onto the codebase's existing theme system.

The prototype simplifies these things. Do not copy them:
- **Settings:** the prototype has a representative set. The real registry must contain **every** setting the app has today, with the same keys and defaults.
- **Live values:** the prototype simulates them. Production reads `/events`.
- **Tile content:** canvas tiles show stand-in content. Production renders the real widget components.
- **Starting data:** sample zones, bindings (`BIND0`), saved panels and the style-preset list are examples.
- **Reordering:** panel widgets are reordered with a ↑ button. Production uses **drag reorder**.
- **History:** undo covers zone changes only. Production must also undo setting changes, appearance presets (one step each) and panel JSON applies (one step each).

---

## 4. Screens and components

### 4.1 App shell
```
┌─────────────────────────────── Top bar 48 ───────────────────────────────┐
├──┬────────────┬──────────────────────────────────────┬───────────────────┤
│R │ Left panel │ Canvas (flex 1)                      │ Inspector         │
│a │ 256        │                                      │ Side: 340 wide    │
│i │ Layers/Add/│                                      │                   │
│l │ Profiles   │        [floating zoom bar]           │                   │
│52│ (closable) │                                      │                   │
└──┴────────────┴──────────────────────────────────────┴───────────────────┘
```
When the inspector is docked at the **Bottom**, canvas and inspector stack vertically. The inspector is then 320 high, and its sections flow into 300 px columns that scroll horizontally. **Sources** mode replaces everything right of the rail with the Data Explorer (§4.8).

### 4.2 Top bar (height 48, bg `#0f0f12`, bottom border `#1f1f24`, grid `1fr auto 1fr`, padding `0 12px`)
- **Left:**
  - App mark: a 26×26 accent square, radius 7.
  - **Profile switcher**: the profile name (13/600) with `expand_more`. Clicking it opens the Profiles panel.
  - Meta in Geist Mono 11 `#7c7c86`: `1920 × 550 · 12 × 6 · Fill · 10 zones`.
  - **Keep** the current dashboard/config dropdown items (switch, new, rename, duplicate, delete, import/export) in this menu or the overflow menu.
- **Centre:** a segmented **Design | Sources** control. Container bg `#17171b`, border `#24242a`, radius 8, padding 2. Buttons are 12.5/500, padding `5px 14px`. Active: bg `#2a2a31`, fg `#ededf0`. Inactive: `#8f8f99`.
- **Right:**
  - **Undo** and **Redo**: 32×32, `#c9c9cf` when enabled, `#4a4a52` when disabled.
  - A 1×20 divider.
  - **Kiosk view**: secondary button, 32 high, bg `#17171b`, border `#2a2a31`, radius 7.
  - **Save**: primary, bg `#ededf0`, text `#0c0c0e` 12.5/600. It shows a 6 px accent dot when there are unsaved changes, and reads "Saved" for 1.5 s after saving.
  - **Keep** the `⋯` overflow menu last.

### 4.3 Icon rail (width 52, bg `#0f0f12`)
Buttons are 38×38, radius 9, Material Symbols Rounded 21. Active: bg `#1e1e24` and fg `#ededf0`. Inactive: `#7c7c86`.
- `layers` → Layers
- `add_box` → Add (the library)
- `devices` → Profiles
- `database` → switches to Sources mode
- `keyboard` (at the bottom) → shortcuts sheet

Clicking the active icon again collapses the left panel.

### 4.4 Left panel (width 256, bg `#111114`, right border `#1f1f24`)

**Layers**
- **Header:** "Layers" 13/600, a mono count, and a `+` button (26×26) that opens Add.
- **Rows** have padding `6px 6px 6px 8px` and radius 7. Each row shows:
  - an icon for the zone type: the widget's own icon, `dashboard_customize` for a panel, or `crop_free` for a blank zone;
  - the name (12.5, ellipsis);
  - `format_paint` if the zone uses a custom style;
  - the size `3×2` in mono 10.5 `#6f6f79`;
  - eye and delete buttons, 24×24 each.
- The tooltip shows the position (`C1·R1 3×2`).
- Selected row: bg `oklch(0.72 0.15 255 / .14)`. Hidden zone: the row is at 50% opacity.
- Click selects; Shift/⌘/Ctrl-click toggles the row in the selection; right-click opens the context menu.
- **Footer:** "Shift-click to select several. Hidden widgets stay editable but don't show in kiosk view."

**Add (library)**
- **Search** (30 high).
- **Chips**: All · Layouts · My panels · System · Media · Network · Info · Other. Each chip is 24 high, radius 12, 11 px. Active: bg `#2a2a31`, border `#3a3a44`.
- **Groups:** uppercase 11/500 headers, then a 2-column card grid (gap 6). Each card has padding 10, border `#24242a`, radius 8, bg `#141418`. It shows an icon (20), the drop size in mono, the name (12/500) and a description (10.5 `#8a8a94`). Widget descriptions end with "· min W×H". On hover the border turns accent.
- **Content:**
  - the 16 widgets, grouped by category;
  - **Layout starters**: Blank zone plus 6 starters;
  - **Panel presets**: 10;
  - **My panels**.
- **Drag** a card onto the canvas, or **click** to auto-place it. When a blank zone is selected, a click fills that zone instead.
- **Footer:** "Drag onto an empty zone, or click to auto-place. With a blank zone selected, a click fills it."

**Profiles**
- **Header:** "Profiles" and a `+` button for a new profile. A new profile gets 6 or 12 columns and 4 or 6 rows depending on its size.
- **Rows:** a thumbnail outline (34 wide, height from the aspect ratio, border accent when active), the name (12.5), meta `1920×550 · 12×6 · Fill` (mono 10.5), and a `check` on the active profile. Click switches profile, which swaps size, grid and zones and resets the selection and history.
- **Footer:** an "Auto-pick by window size" toggle, and the note "Each profile has its own size, grid, zones, theme, style and background."

### 4.5 Canvas
- **Background:** `#0c0c0e` with a dot grid `radial-gradient(#1f1f25 1px, transparent 1px)` / 18 px.
- **Board:** drawn at a logical width of 980; height = 980 × profile h / w; scaled by zoom. Fit = the largest zoom that fits.
  - Grid: `repeat(cols)` × `repeat(rows)`, gap 6 at logical scale.
  - Dashed outline `#2a2a31`, offset 6.
  - Optional grid lines `#1a1a20`, toggled from the zoom bar.
- **Page background layer** behind the tiles: Color, Gradient, or an Image/Video placeholder. It is dimmed by `bgDim`, and a profile set to "None" hides it.
- **Rulers:** labels every 100 design px along the top and left, in mono 8 `#5a5a63`. Toggled from the zoom bar; on by default.
- **Tiles** render the **effective** style (§5.6): surface, opacity, radius, accent, font, border width and colour, glow. Widget kinds are rendered as follows:
  - **Widget zones:** stand-in content by kind (media / stat / meters / page).
  - **Panel zones:** their panel widgets in Stack (row or column, wrap), Grid (N columns), or Overlay (image plus scrim, items spread). The selected panel widget gets a 1.5 px accent outline.
  - **Blank zones:** a dashed border `#3a3a44` and "+ Pick a widget".
  - **Hidden zones** are at 35% opacity.
- **Selection:** 1 px accent border plus a `0 0 0 1px` accent ring. While dragging, the ring adds the shadow `0 14px 36px rgba(0,0,0,.55)`.
- **Selection chip:** sits 7 px above the primary tile. 24 high, accent bg, text `#0c0c0e` 11/600, radius 6. It shows the name (or "N selected"), the size, and buttons for Hide and More (which opens the context menu). **Keep** everything from the old selection toolbar (type dropdown, size, align/expand actions, duplicate, delete, Style, close) here or in More.
- **Resize handle:** 11×11 at the bottom-right, bg `#ededf0`, 2 px accent border. Minimum sizes are enforced.
- **Drop ghost:** a 1.5 px dashed accent border with "Drop here", or red `oklch(0.70 0.17 25)` with "No room".
- **Zoom bar:** floating, 16 px from the bottom, centred. 36 high, bg `#17171b`, border `#2a2a31`, radius 10, shadow `0 8px 24px rgba(0,0,0,.4)`. Contents:
  - Left-panel toggle · Grid · Rulers
  - | − · zoom % · + · **Fit**
  - | resolution button (`1920 × 550`, which opens Dashboard › Profile) · Magic wand (**keep the current action**) · Dock button (icon plus Side / Bottom / Auto; it cycles).
- **Quick tips card:** shown on first run, bottom-left at bottom 64, width 250, dismissible. The dismissal persists.
- **Toast:** top centre, bg `#ededf0`, about 1.8 s.
- **Empty state:** a card with `dashboard_customize`, "This layout is empty", and the buttons [Browse widgets] [Use sample layout].

### 4.6 Inspector
- **Dock:**
  - **Side:** 340 wide, left border.
  - **Bottom:** 320 high, top border, sections in 300 px columns. **Keep** the splitter that resizes it.
  - **Auto:** Bottom when the profile's aspect ratio is above 2.5, otherwise Side.
  - **Ctrl+\\** collapses or expands it.
- **Headers:**
  - **Single zone:** an icon box (32, radius 8, bg `#1c1c21`); an editable name (14/600, border on hover, accent border on focus); a meta line (11 `#8a8a94`); and Hide / Duplicate / Delete buttons (28×28; delete turns red on hover). The meta line depends on the zone:
    - widget: `3×2 · min 2×1 · N data points`
    - panel: `Panel · Stack · 3 widgets`
    - blank: `Blank zone · 2×1`
  - **Multiple zones:** "N zones selected", the subline "Style changes apply to all of them", removable chips, and Hide / Duplicate / Delete.
  - **Nothing selected:** a `space_dashboard` icon, "**Dashboard**", and `<profile> · nothing selected`.
- **Placement row** (single zone only): COL / ROW / W / H. Each field is 30 high with a mono label. Values are validated against collisions and minimum sizes.
- **Search:** "Search settings". While a query is entered, the tabs are hidden and results come from **all** tabs, each section labelled with its tab, plus a count "N settings across all tabs".
- **Tabs** (underline style, 12.5/500, a 2 px `#ededf0` line under the active tab, and a changed-count accent pill on each tab):
  - Widget and panel zones: **Content · Style · Data**.
  - Nothing selected: **Profile · Appearance · Global style · General**.
  - Blank zone and multi-select: no tabs. A blank zone shows Widget and Zone frame; multi-select shows only the Style sections.
- **Notes and banners** (bg `#17171b`, border `#24242a`, radius 8, 12 px):
  - **Follow banner** (Style tab while the widget follows): "Following the global style. Editing a look setting below switches this widget to Custom." plus the link "Edit global theme" (→ Dashboard › Appearance).
  - **Context notes:**
    - Global style: "Editing the dashboard style — applies to all profiles. Change the scope under Appearance." or "Editing the style of '<profile>' only. It sits above the dashboard style."
    - Blank zone: "This zone is blank. Pick a widget or a panel to fill it."
    - Web Page widget: "Web Page widgets have reduced style options."
    - Force global style on: "Force global style is on — this widget's own look values are ignored."
- **Bound data block** (Data tab): §4.9.
- **Sections:**
  - The header has a chevron that rotates −90° when collapsed (150 ms), the title (12.5/600), "N changed" in mono 10 accent, and **Reset**, which resets only that section.
  - Sections never split across dock columns (`break-inside: avoid`).
- **Field rows** (padding `6px 16px`):
  - **Label:** 12.5 `#c9c9cf`, optionally followed by an `info` (14) icon with a tooltip.
  - **Source dot:** 7 px, placed before the label. Its colours are in §5.6. Clicking a dot whose value is set here resets it.
  - **Inline controls** (right of the label):
    - toggle: track 30×18 (on = accent, off = `#2c2c33`), knob 14
    - select: 28 high, bg `#1a1a1f`
    - colour: "Auto" or hex plus a swatch
    - button: icon plus label
    - slider value box: mono
  - **Stacked controls** (below the label):
    - segmented: container `#0c0c0e`; active option `#2a2a31`
    - range slider: accent
    - text input; code area (mono 11.5, 96 high)
    - **icon grid:** 19 icons including "none", cells 30 high; selected cell has an accent border and tint
    - **3×3 alignment grid:** 22 px cells with dots, plus chips such as Auto / Spread or Spread / Stretch
    - **URL field:** input plus Upload button, and a file can be dropped on it
    - **device checklist:** checkbox icons
    - **sensor field:** name, key in mono, live value and `edit`; it opens the data picker in single mode
- **Special sections:**
  - **Widgets** (panel): rows with drag handle, kind icon, label, "Kind · sensor name", and buttons ↑ (drag in production) / hide / duplicate / delete. Then a "+ Add panel widget…" select listing the 10 kinds, and the helper text "Click a widget to edit it. Copy / paste and change kind keep the shared fields."
  - **Appearance presets:** a 3-column gallery of 9 cards. Each card is a 40-high swatch using the preset's radius; the active one has an accent ring. Below it: a "Replace the page background" toggle and "Save current look as preset".
  - **Panel JSON** (Code mode): a 260-high mono textarea, the hint "Ctrl+Enter to apply · one undo step", and an [Apply] button. Invalid JSON shows a toast with the parser error.
- **Footer:** a `help` icon whose tooltip is the dot legend; an "Advanced settings" label; and a toggle. Advanced is off by default and the preference persists. When advanced items are hidden, a dashed button "Show N advanced settings" appears at the end of the list.

### 4.7 Inspector contents by context
The full list is in `DATA_MODEL.md` §2–4 and §7. Summary:
- **Widget:**
  - Content: **Widget** (type, custom title, icon grid, hide when idle for idle-capable widgets only, visible), then the widget's **own categories**.
  - Style: **Size & alignment** (Layout for adaptive widgets only), **Typography**, **Spacing & shape**, **Colors & surface**, **Border & effects**, **Advanced** (CSS), plus any own colour categories, marked advanced.
  - Data: **Bound data**, plus data-related own categories (for example Audio source).
  - **Web Page** has reduced styling: Colors & surface, Border & effects and Advanced only.
- **Panel:**
  - Content: **Panel** (Visual/Code, Fill/Hug, gap, padding) → **Layout** (Stack / Grid / Overlay options) → **Background** (Overlay only) → **Widgets** → **Selected widget** cards: Kind, Display, Size & placement, Typography & colors, Advanced.
  - Style: the same general look cards as a widget.
  - Data: the sensors used by its widgets.
- **Blank zone:** **Widget** with a "Pick a widget" button, and **Zone frame** (accent, background, title header).
- **Dashboard (nothing selected):**
  - **Profile:** profile fields; This profile (Theme / Style / Background inherit); Auto-pick.
  - **Appearance:** Scope plus Force global style; Presets; Theme; Page background.
  - **Global style:** the look cards, written at dashboard or profile level depending on the scope.
  - **General:** Type; Clock & date; Display; Studio (inspector position); Connection (Data API URL).

### 4.8 Sources mode (Data Explorer)
- **Header** (bg `#0f0f12`):
  - "Data sources" 14/600 and "653 data points from 17 sources".
  - An API pill reading `● Data API running · live via SSE`. The dot is green when `system.bridge.status === 'running'`.
  - An **Endpoints** popover with the 9 routes from `GET /api` (method, mono path, description); clicking one copies the path.
  - An **Add source** primary button (install a plugin, push via `/api/push`, connect HWiNFO), wired to whatever exists today.
- **Source tree** (width 264):
  - A filter field.
  - Health chips: `● N healthy` / `● N no data` / `● N offline`. Clicking a chip filters the tree.
  - An "All data points" row.
  - Categories: Built-in / Plugins / Hardware monitors / Pushed via API.
  - Source rows: a chevron (only when the source has more than one container), icon, name, count and status dot. Healthy = `oklch(0.75 0.15 150)`, no data = `oklch(0.80 0.15 75)`, offline = `#5a5a63`. Container rows are indented 46.
- **Point table:**
  - A breadcrumb with "N of M".
  - A search field, a type control (All / Numbers / Text / Lists / Links), and chips for Hide empty and In use.
  - Sticky group header rows.
  - Columns `1.5fr | 1fr | 110px | 56px`: Data point (type icon, name, kind chip, mono key) | Live value | Used by | Copy key and Bind.
  - Paging is 150 rows plus "Show more" in the prototype. **Virtualise** the list in production.
- **Point inspector** (width 320):
  - Header with breadcrumb.
  - A value card: type, kind and "● Live" chips; the value at 24/600; and for live numeric points a 24-sample history with Min / Avg / Max. Lists and JSON show as a scrollable `pre`.
  - Key and stream URL, each copyable.
  - **Used by:** each widget links back to it.
  - Bind to a widget (a select plus [Bind]/[Unbind]).
  - "New widget from this value", which creates a panel zone with a stat bound to the point.
- **With no point selected,** the inspector shows a group summary: counts, a "Stream this group" prefix URL, and a status callout.
- **Responsive:** below a 1240 px viewport, the point inspector becomes an overlay drawer that appears only when a point is selected. Below 1000 px, the "Used by" column is hidden.

### 4.9 Data binding in Design mode
- **Data tab → "Bound data":**
  - A count and a **Bind** button.
  - Rows have bg `#0c0c0e`, border `#1f1f24` and radius 7. Each shows the type icon, name, `Source · Container`, the live value in mono (amber "No data" if empty), and an unbind ×.
  - Clicking a row opens that point in Sources mode.
  - For panels, the list shows the sensors of the panel's widgets. Bind needs a panel widget to be selected first; otherwise a toast says "Select a widget in the panel first".
- **Picker modal** (`min(600px, 100vw−32px)` wide, at most 72vh high, 10vh from the top):
  - An autofocused search with multi-word AND matching over name, key, source, container and kind.
  - Up to 80 results, then a footer with the count, "N bound", [Open data explorer] and [Done].
  - Two modes:
    - **Widget mode:** a multi-toggle; each row has a checkbox.
    - **Item mode** (from a panel widget's Sensor field): single select; picking a point sets the sensor and closes the modal.
- The widget context menu includes **Bind data…**.

### 4.10 Overlays
- **Context menu:** width 220, bg `#17171b`, border `#2e2e35`, radius 9. Rows are 30 high with an icon, a label and a mono shortcut hint. It is clamped to the viewport.
  - **Zone items:** Edit style · Bind data… · *(panels only)* Save to My panels · Duplicate ⌘D · Hide/Show H | Copy style ⌘⌥C · Paste style ⌘⌥V · Follow global style | Delete ⌫ (red).
  - **Canvas items:** Add widget… · Select all ⌘A · Zoom to fit ⌘0 · Edit global theme (→ Dashboard › Appearance) | Keyboard shortcuts ?.
- **Shortcuts sheet:** a modal listing every shortcut in §5.4.

---

## 5. Interactions and behaviour

### 5.1 Selection
- A click selects and makes that zone the primary. Shift, ⌘ or Ctrl-click toggles a zone in the selection.
- Clicking empty canvas deselects; so does Escape, which first closes any open menu or modal.
- Clicking a panel widget in the Widgets list selects it (`itemSel`). Changing the zone selection clears `itemSel`.

### 5.2 Move and resize
- **Pointer drag:** `dx = round(Δx / ((980 + 6) / cols · zoom))`, and the same for rows using the board height.
- A move is applied only if every selected zone stays inside the grid and does not overlap zones outside the selection.
- Resize uses the corner handle and respects minimum sizes.
- One drag = one undo step.

### 5.3 Library drop
- HTML5 drag shows the ghost. Dropping creates the zone (widget, panel, or blank) at the ghost's spot.
- Click places the item in the first free spot found by `findFree`, scanning rows first.
- With a blank zone selected, click fills that blank zone, growing it to the widget's minimum if there is room.

### 5.4 Keyboard (ignored while focus is in an input, select or textarea)
| Action | Keys |
|---|---|
| Move by 1 cell | ← → ↑ ↓ |
| Resize the primary zone | ⇧ + arrows |
| Toggle in selection | ⇧ / ⌘ click |
| Select all | ⌘/Ctrl A |
| Duplicate (first free spot of the same size) | ⌘/Ctrl D |
| Delete | ⌫ / Delete |
| Hide / show | H |
| Copy / paste style | ⌘⌥C / ⌘⌥V (use `e.code`) |
| Undo / redo | ⌘Z / ⇧⌘Z / Ctrl Y |
| Zoom in / out / fit | + / − / ⌘0 |
| Collapse inspector | Ctrl+\\ |
| Deselect / close | Esc |
| Shortcuts sheet | ? |
| Apply panel JSON | Ctrl+Enter (inside the code editor) |

In Sources mode the canvas keys are off; Escape closes the point inspector and the endpoints popover. While the picker is open, only Escape works, and it closes the picker.

### 5.5 Undo/redo
- Snapshots of the current profile's zones, capped at 50 entries.
- **Commit points:** add, delete, duplicate, hide, move or resize (one per drag), placement edits, type change, panel edits, panel JSON apply, restore sample.
- **Production must also** treat these as single undo steps: setting changes, theme and global-style changes, and an appearance preset apply.

### 5.6 Styling model (see DATA_MODEL §6)
- **Effective value** = widget value (only if the widget is Custom **and** Force global style is off) ?? profile style ?? dashboard style ?? schema default.
- **Follow global / Custom** is explicit (Colors & surface › Look). While a widget is on Follow, its own values stay stored but are ignored. **Decision:** editing any look field while on Follow switches the widget to Custom, and the banner warns about this. "Follow global style" in the context menu clears the widget's look overrides.
- **Source dots:**

  | Dot | Meaning |
  |---|---|
  | none | default |
  | teal `oklch(0.76 0.11 190)` | from the dashboard style |
  | violet `oklch(0.74 0.13 300)` | from the profile style |
  | blue = accent | set here |
  | blue with a ring `0 0 0 2px #111114, 0 0 0 3px accent` | set here, overriding a global value |
  | amber ring `inset 0 0 0 1.5px oklch(0.80 0.15 75)` | set here but ignored |

  Clicking a "set here" dot (blue, ringed blue, or amber) resets it.
- **Changed counts** on a section or tab count only the fields set here.
- **Surfaces as rendered on tiles:**
  - Glass: `linear-gradient(160deg, rgba(255,255,255,.08·a), rgba(255,255,255,.025·a))`, white text.
  - Matte (light): `#d6d6db` with text `#16161a`.
  - Matte (dark): `#141418`.
  - Theme: the theme's card colour.
  - Opacity `a` scales the alpha of each surface.
- **Glow:** Soft = `0 0 16px color-mix(glow 35%)`; Strong = `0 0 26px color-mix(glow 60%)`. Glow colour Auto uses the accent.
- **Radius Auto** = theme radius (rem) × 16 px.
- **Font Theme** = the General › Type font. Mapping: System = `system-ui`, Sans = Geist, Rounded = `ui-rounded`, Serif = Georgia, Mono = JetBrains Mono.
- **Theme primary** drives the accent wherever accent is Auto. Theme presets: Zinc (emerald primary), Neutral, Slate, Ocean, Forest, Paper (light).

### 5.7 Profiles
- Switching profile saves the current zones under the old profile and loads the target's. It resets selection and history and returns zoom to fit.
- Changing the grid columns or rows is refused, with a toast, if any zone would fall outside the new grid.
- "Design size" changes the board's aspect ratio.

### 5.8 Transitions
These are functional only:
- toggle background and knob `transform`, 150 ms;
- section chevron, 150 ms;
- tile `box-shadow`, 150 ms.

### 5.9 Persistence (user preferences)
These persist for each user:
- left panel open state and the active rail panel;
- the Advanced toggle;
- tip dismissed;
- zoom mode;
- grid and ruler toggles;
- inspector dock position, collapsed state and splitter size;
- Auto-pick profile.

---

## 6. State (suggested shape; adapt it to the existing store)
```ts
config: {
  profiles: Profile[], activeProfileId, autoPickProfile: boolean,
  theme: { preset, radiusRem, tokens: Record<19 tokens, color> },
  dashboardStyle: Partial<LookSettings>, pageBackground: PageBg,
  general: { font, clock: '12h'|'24h', seconds, locale, motion, hideCursorInKiosk, dataApiUrl },
  forceGlobalStyle: 'inherit'|'on'|'off',
  savedPanels: PanelSpec[], stylePresets: LookPreset[], appearancePresets: AppearancePreset[],
}
Profile: { id, name, width, height, cols, rows, fit: 'fill'|'scroll', gap, padding,
  theme: 'inherit'|Theme, style: 'inherit'|Partial<LookSettings>, background: 'inherit'|'none'|PageBg,
  forceGlobalStyle?: 'inherit'|'on'|'off', zones: Zone[] }
Zone: { id, name, c, r, w, h, hidden, look: { follow: 'global'|'custom', ...LookSettings }, frame: {...} } &
  ( { kind: 'widget', type: WidgetType, settings: Record<key, value>, bindings: string[] }
  | { kind: 'panel', panel: { layout: 'stack'|'grid'|'overlay', size: 'fill'|'hug', gap, padding, ...layoutOpts, items: PanelWidget[] } }
  | { kind: 'blank' } )
PanelWidget: { id, kind: 'stat'|'value'|'bar'|'gauge'|'sparkline'|'table'|'text'|'image'|'clock'|'shape',
  label, sensor, unit, color, placement, className, css, ...kindFields }
ui: { mode: 'design'|'sources', rail: 'layers'|'add'|'profiles', leftOpen, selection: string[], panelItemSel,
  inspectorTab, dashboardTab, openSections, settingsQuery, showAdvanced, dock: 'side'|'bottom'|'auto', dockOpen, dockSize,
  zoom: number|'fit', grid, rulers, contextMenu, dropGhost, dragging, picker: { open, target: 'widget'|'item', query },
  toast, shortcutsOpen, tipDismissed, styleClipboard, libraryChip, librarySearch, explorer: {...} }
history: { past, future }    // per profile; production also records settings / theme / preset changes
data: { sources, byKey, live, ringBuffers }   // from /api/sources + /events
```
**Data layer:**
- **Normalise** `/api/sources` into Source → Container → Point, following `buildData()` / `mkPoint()`:
  - Type detection: empty, url, list, bool, number + unit.
  - Unit → kind map, e.g. °C → Temp, MHz → Clock.
  - Strip the repeated device-name prefix from LibreHardwareMonitor point names.
- **Health:** off = 0 points; warn = every point empty or zero; otherwise ok.
- **Live values:** open **one** `/events` stream (or prefix streams for bound keys). Never open one per row. Keep ring buffers of 24 samples.
- **"Used by"** is derived from widget bindings plus panel widget sensors.

## 7. Copy (exact strings)
- **Placeholders:**
  - "Search settings", "Search widgets", "Filter sources", "Search key, name or value"
  - "Search 650+ data points — e.g. gpu temp, steam level"
  - "Uses the widget name", "https://… or drop a file"
- **Banners and notes:** see §4.6.
- **Empty states:**
  - "This layout is empty"
  - "No widgets yet."
  - "No widgets in this panel yet."
  - "Empty panel" (on a tile)
  - "+ Pick a widget" (on a blank tile)
  - "No data bound yet. Bind a value to make this widget live."
  - "No settings match '…'."
  - "No data points match these filters."
  - "Not used in this layout yet."
- **Toasts:**
  - "Added X", "Placed X", "Duplicated", "Deleted N widgets · ⌘Z to undo"
  - "Style copied", "Style pasted", "Saved 'X' to My panels", "Applied X to all profiles / this profile"
  - "Panel updated · one undo step", "Invalid JSON — …"
  - "No room there", "No free space — resize or remove a widget first", "That spot overlaps another widget", "Not enough room in this zone"
  - "X needs at least W×H cells", "Some zones would fall outside the grid — move or resize them first"
  - "Profile created", "Bound to X", "Unbound from X", "Copied to clipboard", "Select a widget in the panel first"

## 8. Assets
- **Icons:** Material Symbols Rounded (weight 300, FILL 0) in the prototype. If the codebase already has an icon library (for example lucide-react), use **that one**, with the nearest equivalents.
- **Fonts:** Geist and Geist Mono for the UI; JetBrains Mono is offered as a widget font. Keep the app's current font list.
- **Images:** none. Tile content and the overlay/page images are placeholders.

## 9. Design tokens (dark UI chrome)
| Token | Value | Use |
|---|---|---|
| bg/app | `#0c0c0e` | canvas, inputs |
| bg/chrome | `#0f0f12` | top bar, rail, explorer header |
| bg/panel | `#111114` | left panel, inspector |
| bg/raised | `#17171b` | buttons, menus, chips, notes |
| bg/tile | `#141418` | cards, Matte (dark) |
| bg/hover | `#1a1a1f` | row hover |
| bg/active | `#2a2a31` | active segment or chip |
| border/subtle | `#1f1f24` | dividers |
| border/default | `#24242a` | inputs, cards |
| border/strong | `#2a2a31` / `#2e2e35` | buttons, menus |
| text | `#ededf0` / `#c9c9cf` / `#9696a0` / `#7c7c86` / `#6f6f79` | primary → faint |
| accent (UI) | `oklch(0.72 0.15 255)` | selection, toggles, focus |
| accent/soft | `oklch(0.72 0.15 255 / .14)` | selected rows |
| accent/text | `oklch(0.82 0.12 255)` | accent text |
| success | `oklch(0.75 0.15 150)` | healthy, live |
| warning | `oklch(0.80 0.15 75)` | no data, ignored dot |
| danger | `oklch(0.72 0.17 25)` | delete, no room |
| dot/profile | `oklch(0.74 0.13 300)` | source dot |
| dot/dashboard | `oklch(0.76 0.11 190)` | source dot |
| inverse | `#ededf0` / `#0c0c0e` | primary buttons, toasts |

The UI chrome accent is fixed. The **dashboard theme** (Zinc etc.) only affects widgets on the canvas.

**Other values:**
- **Type:** Geist 400/500/600 and Geist Mono. Sizes 10.5 / 11–11.5 / 12–12.5 / 13 / 14 / 24.
- **Spacing:** 2 / 4 / 6 / 8 / 10 / 12 / 14 / 16 / 20.
- **Radii:** 5 / 6–7 / 8–10 / 12 / 50%.
- **Shadows:**
  - floating bars and toasts: `0 8px 24px rgba(0,0,0,.4)`
  - menus: `0 12px 32px rgba(0,0,0,.55)`
  - modals: `0 20px 60px rgba(0,0,0,.6)`
  - drawer: `-16px 0 40px rgba(0,0,0,.5)`
- **Control heights:** 24 / 26 / 28 / 30 / 32. Toggle 30×18. Rail button 38.

## 10. Files in this bundle
- `README.md`: this UI spec.
- `DATA_MODEL.md`: the dashboard model and where each part lives.
- `FEATURE_MAP.md`: the no-feature-loss checklist, current → new.
- `IMPLEMENTATION_PLAN.md`: phases and acceptance criteria.
- `CLAUDE.md`: standing rules for the repo.
- `reference/Studio A.dc.html` (+ `support.js`, `sources-data.js`): the interactive prototype.
- `reference/design-overview.md`: the current app's own description, the source of truth for behaviour.
- `reference/current-ui-before.png`: the current UI.
