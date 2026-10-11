# Customization guide

How to make a widget look the way you want, from the studio. For the setting
keys and how they are stored, see [widget-settings.md](widget-settings.md);
for what happens behind the scenes, [architecture.md](architecture.md).

Open the studio with the wrench button on the dashboard (or
`http://127.0.0.1:3922/?studio=1`). Changes save automatically; **Save**
saves immediately, and open kiosk pages update within about a second.

## The studio layout

The bar along the top holds, from left to right:

- the active profile's name - click it to switch to another profile or to
  **Auto (match window)**, the same as in the Profiles drawer - with its
  design size, grid (columns × rows) and zone count;
- **Design | Sources** - the canvas, or the sources manager (the same as the
  rail's Sources button);
- **Undo** and **Redo** (see [Undo, shortcuts and the command
  palette](#undo-shortcuts-and-the-command-palette));
- **Save**, **Kiosk view** (leave the studio) and the **...** menu:
  **Export config** downloads the whole config as a JSON file, **Import
  config...** loads one, **Copy profile JSON** copies the active profile,
  **Command palette...** and **Keyboard shortcuts** open those dialogs, and
  **Reset everything...** restores the default dashboard after a
  confirmation (it wipes every profile, the theme, the style presets and
  all widget settings; Undo brings it back only until you leave the studio,
  so export first). The menu also shows the build id.

The canvas's floating pill at the bottom toggles the grid, zooms (or
**Ctrl + wheel** over the canvas, **Ctrl + =** / **Ctrl + -**), fits the
design width to the window (**Ctrl + 0**) and shows the design size.

A narrow icon rail on the left opens one drawer at a time; click the open
drawer's icon again to collapse it and give the canvas the full width. The
studio remembers the open drawer, also after a reload.

- **Add** - every widget and panel, with a search box and category chips
  (All, System, Media, Network, Info, Other). Drag a row onto the canvas, or
  click **+** to add it at the first free spot. The numbers are the minimum
  zone size in grid cells, and a badge counts how often a widget is already
  on the profile. *Other sensors* is listed here too.
- **Layers** - every zone of the profile in grid order (row, then column),
  with its column, row and size. Click a row to select the zone and scroll
  it into view; the eye hides or shows it and the bin removes it. Hidden
  zones are dimmed but stay selectable.
- **Profiles** - the monitor profiles. Click one to pin it, or pick **Auto
  (match window)**, which shows the profile closest to the window size (the
  entry names the one it picks, and that profile is tagged *auto*). **New**
  adds a profile for the current window size, the bin deletes the active
  one. Below the list are the active profile's **Name**, **W** and **H**
  (design size in px), **Cols** and **Rows** steppers and **Scroll / Fill
  viewport**.
- **Sources** - swaps the canvas for the sources manager (see
  [widget-settings.md](widget-settings.md#the-studio-sources-view)). Click it
  again, any drawer icon, or **Design** in the top bar to go back to the
  canvas.

An empty profile shows a card on the canvas: drag across the grid to draw a
zone, or click **Open Add** to open the Add drawer. A drawn zone starts blank;
its **Pick a widget** button opens the widget picker.

Hovering a zone shows its size in grid cells. Clicking selects it and shows
a toolbar above it (below when there is no room), which keeps its size at
any zoom: the widget name (click it to pick another widget), the size,
**Narrower / Wider / Shorter / Taller**, **Hide / Show**, **Duplicate**,
**Remove** and **Style**, which opens the inspector's Style tab. The size
steps never overlap another zone: a step that would run into a neighbour
or past the grid is disabled. A zone you draw on the canvas is selected
straight away, with its toolbar. With a zone selected, the arrow keys move
it one cell and **Shift + arrows** resize it; like dragging, a move that
would overlap another zone or leave the grid does nothing.

The widget picker lists every widget and panel with a search box (focused
when it opens), the category chips and each one's minimum size; **Blank
zone** removes the widget. Picking one assigns it to the zone and grows the
zone to the widget's minimum size.

## Undo, shortcuts and the command palette

Every studio edit can be undone: zones, widgets, settings, the theme,
profiles and sources. **Undo** and **Redo** in the top bar are greyed out
when there is nothing to undo or redo. A run of changes to the same thing -
dragging a slider, moving or resizing a zone, typing in a field, holding an
arrow key - counts as one step as long as the changes come less than half a
second apart. The studio keeps the last 100 steps; leaving the studio, or the
server's copy arriving when the studio opens, starts a fresh history. Undone
changes are saved and synced like any other edit.

**Ctrl + K** opens the command palette: type part of a name and press
**Enter** (or click) to run it, **arrow keys** to move through the list,
**Esc** to close. It reaches the same actions as the mouse:

- add any widget or panel (at the first free spot), switch profile (or
  Auto), select a zone by name, open the Add, Layers or Profiles drawer or
  Sources, toggle the grid, zoom, save, export, import, copy the profile
  JSON, undo, redo and the shortcut list;
- for the selected zone: pick a widget, duplicate, hide or show, remove,
  the Content or Style tab, and **Go to setting: ...** for each of the
  widget's options, which opens the right tab with the option in the
  settings search.

Matches that start with what you typed come first, then matches at the
start of a word, then anywhere in the name.

| Keys | Action |
|---|---|
| Ctrl + K | Command palette |
| Ctrl + S | Save |
| Ctrl + Z | Undo |
| Ctrl + Shift + Z, Ctrl + Y | Redo |
| ? | Keyboard shortcuts (also in the **...** menu) |
| Esc | Clear the settings search, else deselect, else close the drawer |
| Arrow keys | Move the selected zone one cell |
| Shift + Left / Right | Selected zone narrower / wider |
| Shift + Up / Down | Selected zone shorter / taller |
| Ctrl + D | Duplicate the selected zone |
| H | Hide / show the selected zone |
| Del, Backspace | Remove the selected zone |
| Ctrl + 0 | Fit the design width to the window |
| Ctrl + = / Ctrl + - | Zoom in / out |

While you type in a field (a setting, the search box, the zone box), the
plain keys go to the field; Esc, Ctrl + S, Ctrl + K, undo and redo still
work. With a dialog or menu open, its own keys win (Esc closes it). The
tooltips of the toolbar and top bar buttons show their shortcut.

## Where the options are

Select a zone on the canvas. The right-hand inspector then shows a fixed
header with the widget's name and live-sensor count, **Hide / Show**,
**Duplicate** and **Remove** buttons, the zone box (column, row, width,
height in grid cells) and a **Search settings** box. Below it are two tabs
(the studio remembers the last one while you click between zones):

- **Content** - the **Widget** button (opens the widget picker; a panel
  zone shows *Custom panel*), the panel editor for panel zones, and
  what the widget shows: its own options and sections (for the System
  widget: devices, the show toggles, *Thresholds*, *Units & labels*) and
  **Hide when idle**.
- **Style** - the style tools (below), **Preset**, **Layout** and
  **Surface**, then the look sections *Title & background*, *Size &
  alignment*, *Spacing & shape*, *Colors & type* (including the widget's
  per-element colors) and *Border, glow & CSS*, and finally **Zone frame**:
  the zone's own **Frame accent**, **Frame background** (none / panel /
  bordered) and **Frame title header**. A blank zone shows only the Zone
  frame here.

Sections start collapsed and remember whether you opened them, also after a
reload. A section header shows how many options in it you changed. **Reset**
at the top of each tab restores that tab's options to their defaults.

Type in **Search settings** to find an option in either tab: matches are
listed flat, each under a breadcrumb such as *Style > Border, glow & CSS*,
and the search covers labels, keys and option names (a section name such as
"thresholds" finds the whole section). **Esc** clears the search.

With nothing selected (click empty grid space or the inspector's close
button), the inspector shows a short hint and three tabs; the studio
remembers the last one:

- **Theme** - the presets (each with its colours and full name), the
  **Corner radius** slider and, collapsed under **Custom colours**, a colour
  picker per theme token (background, foreground, card, primary, accent,
  border and so on). The section header says *edited* when the colours no
  longer match a preset.
- **Profile style** - the defaults for every widget in this profile (see
  [Profile style](#profile-style)), with its own **Search settings** box.
- **Connection** - the **Data API URL** and its connection test.

"Auto" or an empty value always means the widget's own look. Not every widget
has every option: the modern widgets have the full set, while the plain ones
(Departures, Notifications, Text File, Stream Deck) offer size, alignment,
spacing, colors, type and CSS, and Web Page only Size % and corner radius.

## Scaling with the zone and Size %

Every widget is designed for a certain size. With **Scale with the zone** on
(the default), the content zooms to fit the zone: text, rings and spacing
grow together when you make the zone bigger. It only grows content, between
1x and 3x. A zone smaller than the design size is handled by the widget's
compact layouts instead of shrinking.

**Size (%)** (50-200) multiplies on top of that. Use it to make everything
smaller or larger than the automatic fit. With **Scale with the zone** off,
only Size % applies and the content keeps its natural size.

A widget whose content grows with its options can raise its design size to
match; the System widget does (see [system-widget.md](system-widget.md)), so
the same zone zooms less when you switch more details on.

## Alignment

**Horizontal alignment** (Left / Center / Right / Spread) and **Vertical
alignment** (Top / Middle / Bottom) place the content inside the zone. Left,
center and right keep items at their natural size and move them; Spread
distributes them across the width. When the content is wider than the zone, a
centered or right-aligned layout overflows at its end instead of cutting off
its start.

## Spacing and shape

- **Inner padding**: space between the surface edge and the content.
- **Gap between items**.
- **Corner radius**, up to a pill shape.

Each is a pixel step, or Auto for the widget's own value.

## Colors and type

- **Accent color** (in *Title & background*) tints the widget's main fill,
  such as the progress bar or the big temperature; each widget decides where
  it lands.
- **Text color** and **Secondary text color** override the surface's text.
- **Font** (theme, sans, rounded, serif, mono), **Value weight** and **Label
  case** (UPPERCASE, as written, Capitalized).
- **Ring / bar thickness (%)** (50-250) scales rings and bars.
- Widgets with several parts add their own colors here (the System widget has
  a color per device).
- The **Surface** (glass, matte light, matte dark) and the **Preset** (a
  one-click bundle of surface and accent) are at the top of the list.

## Border, glow, opacity and blur

In *Border, glow & CSS*, for widgets with a surface box:

- **Border width** and **Border color** (the default is a 1 px edge).
- **Edge glow** (None, Soft, Strong) and **Glow color** (empty = the accent
  color). The glow is drawn inside the edge, because an outer glow would be
  clipped by the zone.
- **Surface opacity (%)** fades the surface background, gradients included.
  At 0 the background is fully transparent.
- **Background blur** blurs what is behind the surface (visible on glass or a
  faded surface).

A **background image** (in *Title & background*) needs both the image URL and
**Use as background**. Glass surfaces let it show through; matte ones cover
it.

## Custom CSS

The **Custom CSS** field takes CSS that applies to this widget only. The
dashboard wraps it in `@scope`, so selectors match inside the widget, and
`:scope` is the widget's root, which fills the zone. This needs a browser with
CSS `@scope` support; InfoPanel's web page profile uses a current WebView2.
The CSS is not checked beyond that scope, since it is your own dashboard.

The structure you can rely on (from `src/components/modern-chrome.tsx`):

```
:scope                       the root; fills the zone, position: relative
├─ img + overlay             only with a background image in use
├─ div.z-10                  the zoomed content: scaled by Scale / Size %
│    └─ the widget (surface box, rings, text, …)
└─ div                       the title header, only when an icon or title is set
```

Lengths inside the content are scaled by the zoom; `:scope` itself and its
`::before` / `::after` are not.

Four examples that work with this structure:

```css
/* 1. Steadier numbers and a little letter spacing, everywhere in the widget */
:scope {
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}
```

```css
/* 2. A soft light sheen over the top of the widget */
:scope::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 40%);
}
```

```css
/* 3. A dashed inner frame (z-index keeps it above the content) */
:scope::after {
  content: "";
  position: absolute;
  inset: 6px;
  z-index: 30;
  pointer-events: none;
  border: 2px dashed rgba(255, 255, 255, 0.35);
  border-radius: 12px;
}
```

```css
/* 4. Glow around rings and icons (widgets that draw SVG, such as System) */
svg {
  filter: drop-shadow(0 0 6px rgba(56, 189, 248, 0.6));
}
```

Examples 2 and 3 both use `::after`, so use one or the other, or merge their
declarations.

## Profile style

Look-only options can be set once for a whole profile instead of per widget.
With nothing selected, the **Profile style** tab lists them: surface,
accent, size and alignment, spacing, colors and type, border, glow, opacity,
blur and custom CSS. Content settings, layout, title, icon and the
background image are always per widget.

The order of precedence is: the widget's default, then the profile style, then
the widget's own value.

A dot left of an option says where its value comes from (hover it for the
explanation):

- no dot - the default;
- accent dot - set on this widget;
- amber dot - from the profile style;
- accent dot with an amber ring - set on this widget, overriding the profile
  style.

Hovering an option you set turns its dot into a reset button: it drops the
widget's value, so the option falls back to the profile style (or the
default). In the Profile style tab the same dots and reset apply to the
profile's own values, and **Search settings** filters them (for example
"radius").

**Reset** in the Profile style tab clears the profile style.

## Copy, Paste, Use for profile and presets

The buttons next to the **Style** heading on the Style tab work on a
widget's look-only options:

- **Copy** remembers the selected widget's style; **Paste** replaces another
  widget's style with it. Paste replaces the style as a whole: options the
  copied style does not set go back to the profile style or defaults, the
  widget's content settings are untouched, and options the target widget does
  not have are skipped.
- The **...** menu holds the rest. **Use for profile** makes the selected
  widget's style the profile style. **Save as preset...** asks for a name and
  stores the widget's style as a named preset; **Apply preset** applies one
  to the widget (same replace rules as Paste) and **Delete preset** removes
  one. Presets are saved in the config and are shared by all profiles.

## Hide when idle

Some widgets have a **Hide when idle** option. When it is on, the kiosk hides
the zone while the widget is idle, and the zone's space is left empty. In the
studio the zone stays visible with an "idle - hidden in kiosk" badge so you can
still edit it.

| Widget | Idle means |
|---|---|
| Spotify (modern) | not playing (paused or stopped) |
| Media (modern) | not playing (paused or stopped) |
| Steam (modern) | no game running (no current game) |
| FPS (modern) | no frames counted (no FPS value, or 0) |
| Notifications | no notifications (the notification count is not above 0) |

Other widgets have no idle state. A widget with no data at all is hidden in
the kiosk regardless of this option.
