# Dashboard model and how it maps to the new UI

This document comes from `design-overview.md`, which describes how the current app works. It is the source of truth for **what** exists. README/FEATURE_MAP describe **where** each piece lives in the redesigned studio. Where they disagree, keep the behaviour described here and only change where it sits in the UI.

## 1. Hierarchy

```
Dashboard config  → theme, global (dashboard) style, page background, fonts, presets
  └ Profile       → one per display size: size, grid cols × rows, Fill/Scroll, gap, padding,
                    own theme / style / background (each Inherit or Custom)
      └ Zone      → a box on the grid (col, row, w, h in cells). Holds ONE of:
          ├ Widget  (16 kinds, sensors claimed by key prefix)
          ├ Panel   (Stack / Grid / Overlay of 10 panel-widget kinds)
          └ Blank   (waits for "Pick a widget")
```

**In the UI:**
- **Profiles:**
  - The top-bar switcher shows the active profile name and opens the **Profiles** rail panel. That panel lists every profile with a thumbnail, size, grid and fit mode. It also has a "+" for a new profile and the "Auto-pick by window size" toggle.
  - Switching profile swaps the canvas: its size, its grid and its zones.
  - A new profile gets 6 or 12 columns and 4 or 6 rows, depending on its size.
- **Layers** lists zones. The icon tells you the zone type:
  - widget → the widget's own icon
  - panel → `dashboard_customize`
  - blank → `crop_free`
- Canvas tiles render all 3 zone types. A blank zone is drawn as a dashed tile reading "+ Pick a widget".

## 2. Widgets (16) and their own categories

| Widget | Min | Own categories (inspector sections) | Adaptive layout | Hide when idle | Tint |
|---|---|---|---|---|---|
| System (modern) | 2×1 | Devices · CPU · GPU · Memory · Drives · Trends · Thresholds · Units & labels · Device colors | | | |
| Spotify (modern) | 2×1 | Now playing · Cover art · Waveform · Visualizer · Waveform shape · Audio source (Data tab) | ✓ | ✓ | cover |
| Media (modern) | 2×1 | same as Spotify | ✓ | ✓ | cover |
| Steam (modern) | 2×1 | Content (dim banner, stats, news) | | ✓ | banner |
| Hardware (modern) | 2×1 | Content (list / temp gauges, rows, fans) · Dot colors | ✓ | | |
| Weather (modern) | 3×1 | Display (full/now/forecast/minimal, tint) · Current conditions · Forecast (days) | | | conditions |
| FPS (modern) | 2×1 | Content (gauge/trend, metrics, sparkline) · Gauge colors | | ✓ | |
| Audio (modern) | 2×1 | Content (device, meter/volume) · Meter (solid/segmented/gradient, orientation, ballistics, colors) | ✓ | | |
| Wave Link (modern) | 2×1 | Content (meters, dB readout, fader, mixes) · Meter | | | |
| Bluetooth (modern) | 2×1 | Content (full/devices/status) · Battery colors | ✓ | | |
| Network (modern) | 2×1 | Content (speeds/totals, sparkline) · Speed colors | | | |
| Departures | 2×1 | Content (status) | | | |
| Notifications | 2×1 | Content (history, max lines) | | ✓ | |
| Text File | 2×1 | Content (meta) | | | |
| Stream Deck | 3×2 | Content (profile, labels) | | | |
| Web Page | 4×2 | Page (URL); **reduced style** (only Colors & surface, Border & effects, Advanced) | | | |
| Other sensors | 4×2 | none (one generic card per unclaimed sensor) | | | |

**Rules:**
- Minimum sizes are enforced on resize (drag handle, ⇧arrows, the W/H fields) and on type change. A type change grows the zone if it can, and otherwise shows a toast: "X needs at least W×H cells".
- "Layout" (Auto/Card/Standard/Compact/Simple) appears only for adaptive widgets.
- "Hide when idle" appears only for the five idle-capable widgets.
- Own categories with colour pickers (e.g. "Device colors") go in the **Style** tab and are **Advanced**. All other own categories go in **Content**. Audio source goes in **Data**.

## 3. General cards (every zone) → tabs

| Card (current app) | New tab | Section |
|---|---|---|
| Widget: type (Change), custom title, icon, hide when idle, visible | Content | Widget (icon = 19-icon grid incl. none) |
| Size & alignment: layout, scale with zone, size %, 3×3 alignment (+ Auto / Spread) | Style | Size & alignment |
| Typography: text & secondary colors, font, value weight, label case | Style | Typography |
| Spacing & shape: inner padding, gap, corner radius, ring/bar thickness | Style | Spacing & shape |
| Colors & surface: Follow global/Custom, style preset, surface, accent, background image (+use as bg), opacity, blur, copy/paste/save style | Style | Colors & surface (copy/paste/save style also in the context menu) |
| Border & effects: border width/color, glow + glow color, zone frame (accent, background, title header) | Style | Border & effects (zone frame = Advanced) |
| Advanced: Custom CSS | Style | Advanced |

The old **category list on the left** that jumped to a card is replaced by the tabs plus collapsible sections plus search. Each card still shows **"N changed"** and resets **only its own** settings.

## 4. Panels

**Panel zone inspector (Content tab)**, top to bottom:
1. **Panel:**
   - Editor Visual / Code. Code = the panel as JSON in one textarea, applied with Apply or Ctrl+Enter as **one undo step**.
   - Size Fill / Hug.
   - Gap 0–200 px.
   - Padding 0–200 px.
2. **Layout:**
   - Stack / Grid / Overlay.
   - *Stack:* direction, wrap (on by default), one 3×3 alignment picker. Along the axis it offers start/center/end/spread; across it offers start/center/end/stretch.
   - *Grid:* columns 1–12, column sizes (1fr / auto / px), row sizes, 3×3 cell alignment.
   - *Overlay:* dark scrim, band alignment, bottom band columns 1–12. The title floats top-right.
3. **Background** (Overlay only): image and dim.
4. **Widgets:** the list of panel widgets.
   - Each row has drag-to-reorder (the prototype uses a ↑ button), hide, duplicate and delete.
   - Copy/paste and change kind are also available.
   - "+ Add panel widget…" picks one of the 10 kinds.
   - Click a row to select that panel widget.
5. **Selected widget cards**, shown when a panel widget is selected:
   - **Kind card:** "Change kind" keeps the shared fields, plus the kind-specific fields:
     - stat/value: sub sensor, decimals, scale, font size, align
     - bar: decimals, scale, max, inverted
     - gauge: + ring size
     - sparkline: history 5–200
     - table: rows, columns, header, align, font size
     - text: text, align, font size
     - image: height, use as panel background
     - clock: time/date/both, align, font size
     - shape: vbar/hbar/rect/circle, thickness
   - **Display:** label, sensor (opens the data picker in single-select mode), unit.
   - **Size & placement:**
     - Stack: Hug / Fill / Fixed.
     - Grid: column/row span and start.
     - Overlay: band Top / Middle / Bottom.
   - **Typography & colors:** colour. Force global style overrides it, and fills take the accent.
   - **Advanced:** class names, custom CSS scoped to the cell.

The panel's **Style** tab holds the same general look cards as a widget. The panel's **Data** tab lists the sensors its widgets use.

**CSS hooks stay as they are:**
- `.wp-panel[data-panel-layout]`, `.wp-widget--{kind}[data-widget-id]`
- parts: `.wp-label`, `.wp-value`, `.wp-unit`, `.wp-bar-fill`, `.wp-gauge`, `.wp-clock-time`
- variables: `--panel-gap`, `--panel-pad`, `--panel-direction`, `--wp-accent`, `--wp-fg`, `--wp-radius`
- `@scope` rules: panel CSS is scoped to the zone, widget CSS to its cell.

## 5. Library ("Add" drawer)

- **Chips:** All · Layouts · My panels · System · Media · Network · Info · Other. They are the same as today.
- **Widget cards** show the minimum size. A widget drops at max(min, 3×2), clamped to the grid.
- **Layouts:**
  - *Layout starters* (sensor-free; their widgets ask for a sensor): Blank zone, Row of stats 4×1, 2×2 stats 3×2, Hero overlay 4×2, Gauge row 4×1, Clock + date 2×1, Label / value list 2×2.
  - *Panel presets* (built in; bound to the author's sensors, so treat them as samples): Blank panel 2×1, System 4×2, RAM 2×2, CPU 2×2, GPU 3×2, FPS gauges 3×2, Steam 3×2, Weather 4×2, Network 2×2, Clock 1×1.
- **My panels:** saved from a panel's context menu ("Save to My panels"). Saved panels are shared by all profiles and exported with the config. Each use is a fresh copy.
- **Blank zone selected + click a card:** the card fills that zone (it grows to the widget's minimum if there is room).

## 6. Styling model

The effective look of a widget, from lowest to highest priority:
1. widget default
2. **dashboard style** (All profiles)
3. **profile style** (This profile)
4. the widget's own look values

Content settings (sensors, views, labels) always come from the widget itself.

- **Follow global / Custom:**
  - *Follow:* the widget's own look values are **kept but ignored**.
  - *Custom:* own values win key by key.
  - **Decision:** editing a look value while on Follow switches the widget to Custom; the banner warns about this. "Follow global style" clears the widget's look overrides.
- **Force global style:** Inherit / On / Off, at the dashboard or per profile. It makes every widget follow and overrides panel widgets' colours.
- **Setting dots** show where each value comes from. Hovering a set dot resets it.

  | Dot | Meaning |
  |---|---|
  | none | default |
  | violet | from the profile style |
  | teal | from the dashboard style |
  | blue | set here |
  | blue with ring | set here, overriding a global value |
  | amber ring | set here but ignored (the widget follows, or Force global is on) |

  A **legend** sits behind the `help` icon in the inspector footer.
- **Surfaces:**
  - **Glass** (the default for modern widgets): a translucent dark gradient, white text, emerald fill.
  - **Matte (light):** a light grey card with dark text.
  - **Matte (dark):** a near-black card.
  - **Theme:** built from the theme tokens.
  - **Panels only:** None / Card / Bordered card.
  - Opacity, blur, border and glow apply on top of any surface.
- **Theme:** 19 colour tokens plus a radius (in rem). There are 6 presets: Zinc, Neutral, Slate, Ocean, Forest, Paper (light). A profile can inherit the theme or set its own.
- **Page background:** None / Color / Gradient / Image / Video (URL or upload), with fit, position, dim, tint and blur.
  - A video loops muted, pauses when hidden, and shows only its poster when reduced motion is on.
  - Set it for all profiles; each profile then chooses Inherit / Custom / None.
- **Appearance presets:**

  | Preset | Theme | Radius (rem) | Look |
  |---|---|---|---|
  | Dark | Zinc | 0.5 | Matte (dark) |
  | Light | Paper | 0.75 | Theme |
  | Glass | Zinc | 0.75 | Glass, 60% opacity, 16 px blur, 1 px border; aurora background, dim 20 |
  | Frosted | Zinc | 1 | Glass, 40% opacity, 24 px blur, soft glow; aurora background, dim 35 |
  | Matte | Neutral | 0.75 | Matte (dark), 12 px radius |
  | Neon | Slate | 0.5 | Matte (dark), cyan accent, strong glow, mono font |
  | Minimal | Zinc | 0.5 | no card or border, 8 px padding |
  | Ocean | Ocean | 0.75 | Theme |
  | Forest | Forest | 0.75 | Theme |

  A preset applies to All profiles or This profile **in one undo step**. Its background is used only where none is set, unless "Replace the page background" is ticked. "Save current look as preset" adds the user's own.
- **Style presets:** look keys only, saved and applied per widget. The same menu copies or pastes a style, or uses it as the global style.

## 7. Nothing selected → "Dashboard" inspector

The tabs are **Profile · Appearance · Global style · General**. They use the same section, dot, search and advanced machinery as a zone.
- **Profile:**
  - name, design size, grid columns/rows, fit Fill/Scroll, gap, padding
  - This profile: Theme Inherit/Custom, Style Inherit/Custom, Background Inherit/Custom/None
  - Auto-pick profile
- **Appearance:**
  - Scope (All profiles / This profile) and Force global style
  - the Presets gallery
  - Theme (preset, radius, primary/accent, other tokens under Advanced)
  - Page background
- **Global style:** the general look cards (without Follow and Preset), editing the dashboard or the profile style depending on the scope. A note states which level you are editing.
- **General:**
  - Type (System / Sans / Rounded / Serif / Mono)
  - Clock & date (12/24 h, seconds, locale)
  - Display (motion System/Reduce/Full, hide cursor in kiosk mode)
  - Studio (inspector position)
  - Connection (Data API URL)

## 8. Studio layout

- **Inspector position:** Side / Bottom / Auto. Auto docks at the bottom for wide, short profiles (aspect ratio above 2.5, e.g. 1920×550). The control is in the zoom bar and under General › Studio.
- **Bottom dock:** 320 px high. Sections flow into **300 px columns** and scroll sideways.
  - **Keep** the splitter that resizes the dock.
  - In the current app the Add / Layers / Profiles drawer becomes the first column of the dock. In the redesign the left panel stays separate; if users depend on the drawer being inside the dock, add it back as an option.
- **Ctrl+\\** collapses the inspector, in either position.
