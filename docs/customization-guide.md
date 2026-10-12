# Customization guide

How to make a widget look the way you want, from the studio. For the setting
keys and how they are stored, see [widget-settings.md](widget-settings.md);
for what happens behind the scenes, [architecture.md](architecture.md).

Open the studio with the wrench button on the dashboard (or
`http://127.0.0.1:3922/?studio=1`). Changes save automatically; **Save**
saves immediately, and open kiosk pages update within about a second.

## The studio layout

```
┌──────────────────────────── top bar ────────────────────────────┐
├──┬────────────┬───────────────────────────────┬─────────────────┤
│  │ left panel │ canvas                        │ inspector       │
│R │ Layers /   │                               │ (Side: 340 px)  │
│a │ Add /      │      [ floating zoom bar ]    │                 │
│i │ Profiles   │                               │                 │
│l │ (256 px)   ├───────────────────────────────┴─────────────────┤
│  │            │ inspector (Bottom: 320 px high)                 │
└──┴────────────┴─────────────────────────────────────────────────┘
```

The bar along the top holds, from left to right:

- the active profile's name - click it to switch to another profile or to
  **Auto (match window)** - with its design size, grid (columns × rows),
  fit and zone count;
- **Design | Sources** - the canvas, or the [Data Explorer](#data-explorer-and-binding)
  (the same as the rail's Sources button);
- **Undo** and **Redo** (see [Undo, shortcuts and the command
  palette](#undo-shortcuts-and-the-command-palette));
- **Kiosk view** (leave the studio), **Save** and the **...** menu.
  Changes are pushed to the server automatically; **Save** flushes them at
  once, and the small dot on it means "edits not pushed yet". The **...**
  menu holds **Export config** (downloads the whole config as a JSON file),
  **Import config...**, **Copy profile JSON**, **Command palette...**,
  **Keyboard shortcuts** and **Reset everything...** (restores the default
  dashboard after a confirmation: it wipes every profile, the theme, the
  style presets and all widget settings; Undo brings it back only until you
  leave the studio, so export first). The menu also shows the build id.

The **icon rail** (52 px) at the left opens one **left panel** at a time -
**Layers**, **Add** and **Profiles** - or switches to **Sources**; the
keyboard icon at its bottom opens the shortcut list. Click the open panel's
icon again to collapse it and give the canvas the full width. The studio
remembers the open panel, also after a reload. The left panel stays beside
the rail in every inspector placement.

A **floating zoom bar** sits over the bottom of the canvas, centred. It
toggles the left panel, the grid and the rulers, zooms out and in (or
**Ctrl + wheel** over the canvas, **Ctrl + =** / **Ctrl + -**), fits the page
(**Fit**, **Ctrl + 0**), shows the design size (click it to open Dashboard ›
Profile) and holds the [inspector position
button](#inspector-placement-side-bottom-auto). The page is centered in the
canvas whenever it is smaller than the view. The grid and ruler toggles are
remembered.

On first run a **quick tips** card sits at the bottom left of the canvas;
dismiss it and it stays away. A profile without zones shows a card instead:
**Browse widgets** opens Add, **Use sample layout** loads the shipped sample.

**Fit is sticky.** The studio opens fitted: the zoom is the largest one at
which the whole page (width and height) fits the canvas, and it follows the
window, the profile and the panels as they change. Any manual zoom (the
buttons, **Ctrl + wheel**, **Ctrl + =** / **Ctrl + -**, the percentage button
that resets to 100%) stops that; **Fit** (the button, **Ctrl + 0** or the
palette) turns it back on. A scroll profile (not *Fill viewport*) is fitted to
the width only. The zoom mode is remembered.

### Inspector placement: Side, Bottom, Auto

The inspector sits **beside** the canvas (**Side**: a 340 px column on the
right) or **below** it (**Bottom**: a dock 320 px high). Wide, short side
displays such as 1920 x 550 leave most of a normal window empty under the
page, so the dock puts the inspector there and lets the page use the full
width. The dock button at the right of the zoom bar cycles **Auto → Side →
Bottom** (the palette has **Layout: Auto / Side / Bottom**, and the same
choice is under Dashboard › General › Studio); it is remembered per browser.

- **Auto** (the default) picks Bottom when the profile's design size is wider
  than 2.5 : 1 (width / height), otherwise Side. Only the profile's aspect
  ratio counts, not the window.
- **Side** and **Bottom** force the placement.

In the dock the inspector's sections flow into columns about 300 px wide that
scroll horizontally; sections are never split between columns.

- **Resize** the dock by dragging the splitter above it; the height is
  applied when you release. **Double-click** the splitter to reset it. The
  dock is never smaller than 200 px nor larger than 70% of the studio.
- **Collapse and expand** it with `Ctrl + \` (or the chevron in its top row).
  Collapsed, the dock is just that row and the canvas takes the full height.
  The collapsed state and the dragged height are remembered too.

### The left panel

- **Layers** - every zone of the profile, with an icon for its type (the
  widget's own, a panel, or a blank zone), its name, a paint-brush when it has
  its own look and its size in cells. Click a row to select the zone and
  scroll it into view; **Shift / Ctrl-click** adds or removes it from the
  selection; right-click opens the zone menu. The eye hides or shows it and
  the bin removes it. Hidden zones are dimmed but stay selectable (and do not
  show in the kiosk).
- **Add** - every widget and panel, with a search box and category chips
  (All, Layouts, My panels, System, Media, Network, Info, Other), in the
  groups Widgets, Layouts, Panels and My panels (see
  [Creating a panel](#creating-a-panel)). **Drag** a card onto the canvas -
  a dashed ghost shows where it lands, or **No room** in red - or **click** it
  to place it at the first free spot. With a blank zone selected, a click
  fills that zone instead. The numbers are the minimum zone size in grid
  cells, and a badge counts how often a widget is already on the profile.
  *Other sensors* is listed here too.
- **Profiles** - the monitor profiles. Click one to pin it, or pick **Auto
  (match window)**, which shows the profile closest to the window size (the
  entry names the one it picks, and that profile is tagged *auto*). **New**
  adds a profile for the current window size, the bin deletes the active
  one. A profile's name, design size, grid, fit, gap and padding are edited
  in Dashboard › Profile (see [Grid spacing: gap and
  padding](#grid-spacing-gap-and-padding)).
- **Sources** - swaps the canvas and inspector for the Data Explorer (see
  [Data Explorer and binding](#data-explorer-and-binding)). Click it again,
  any panel icon, or **Design** in the top bar to go back to the canvas.

### Selecting, moving and resizing zones

Drag across empty grid cells to draw a new, blank zone; its **Pick a widget**
button opens the widget picker. Hovering a zone shows its size in grid cells.
Clicking selects it. **Shift / Ctrl-click** (on the canvas or in Layers) adds
or removes a zone from the selection; **Ctrl + A** selects all. The last zone
you picked is the *primary* one: it shows the handles, the keyboard resize
and the inspector. With several zones selected the inspector shows only the
shared look (Style) and a chip row with Hide, Duplicate and Delete; a style
change applies to all of them.

A small **selection chip** sits above the primary zone (below it when there is
no room) and keeps its size at any zoom. It shows the widget name (or "N
selected"), the size, **Hide / Show** and **More**, which opens the zone menu.
The selected zone shows knobs on its corners and edges: drag a corner to
resize both ways, or any point along an edge to resize that side. Dragging
a tile moves it (all selected zones move together). Moves and resizes never
overlap another zone or leave the grid, and widget minimum sizes are
enforced. **Esc** during a drag cancels it; one drag is one undo step.
To deselect press **Esc** or click empty canvas (the page padding, the gaps
between zones, or the area around the page).

**Context menus.** Right-click a zone (or click **More** on the chip) for:
**Change widget...**, **Edit style**, **Bind data...**, **Save to My panels**
(panels), **Duplicate**, **Hide / Show**, the size steps **Narrower / Wider /
Shorter / Taller** (a step that would run into a neighbour or past the grid
is disabled), **Copy style**, **Paste style**, **Follow global style**,
**Deselect** and **Delete**. With several zones the widget-only rows and the
size steps are left out. Right-click empty canvas for **Add widget...**,
**Select all**, **Zoom to fit**, **Edit global theme** (Dashboard ›
Appearance) and **Keyboard shortcuts**.

The widget picker lists every widget and panel (layout starters and your
saved panels included) with a search box (focused when it opens), the
category chips and each one's minimum size; **Blank zone** removes the
widget. Picking one assigns it to the zone and grows the
zone to the widget's minimum size — unless that would cover another zone;
then the zone keeps its size and you can resize it yourself.

## Undo, shortcuts and the command palette

Every studio edit can be undone: zones, widgets, settings, the theme,
profiles and sources. **Undo** and **Redo** in the top bar are greyed out
when there is nothing to undo or redo. A run of changes to the same thing -
dragging a slider, typing in a field, holding an arrow key - counts as one
step as long as the changes come less than half a second apart. A pointer
drag (moving or resizing zones, however long it takes), applying a panel's
JSON and applying an appearance preset are one step each. The studio keeps
the last 100 steps; leaving the studio, or the server's copy arriving when
the studio opens, starts a fresh history. Switching profile does not clear
it (the switch is itself a step). Undone changes are saved and synced like
any other edit.

**Ctrl + K** opens the command palette: type part of a name and press
**Enter** (or click) to run it, **arrow keys** to move through the list,
**Esc** to close. It reaches the same actions as the mouse:

- add any widget or panel - layout starters and your saved panels included
  (at the first free spot), switch profile (or
  Auto), select a zone by name, open the Add, Layers or Profiles panel or
  Sources, toggle the grid, zoom, save, export, import, copy the profile
  JSON, undo, redo and the shortcut list, and **Appearance...**,
  **Background...**, **General settings...** and **Connection...** (each
  opens that part of the Dashboard inspector);
- for the selected zone: pick a widget, duplicate, hide or show, remove,
  copy / paste / follow-global style, and **Go to setting: ...** for each of
  the widget's options, which puts the option in the inspector's search;
- for a selected panel zone: **Save panel as preset...** (opens the name
  input), **Select widget: ...** for each of its widgets, and with a widget
  selected: duplicate, copy, paste after, move earlier / later and remove
  that widget.

Matches that start with what you typed come first, then matches at the
start of a word, then anywhere in the name.

Keyboard shortcuts (**?** lists them in the studio):

| Keys | Action |
|---|---|
| Ctrl + K | Command palette |
| Ctrl + S | Save |
| Ctrl + Z | Undo |
| Ctrl + Shift + Z, Ctrl + Y | Redo |
| ? | Keyboard shortcuts |
| Esc | Close a menu or dialog, then clear the search, step out (widget → zone → none), or close the left panel |
| Ctrl + Enter | Apply the panel JSON (inside the code editor) |
| Shift / Ctrl + click | Add a zone to or remove it from the selection |
| Ctrl + A | Select all zones |
| Arrow keys | Move the selection one cell |
| Shift + Left / Right | Primary zone narrower / wider |
| Shift + Up / Down | Primary zone shorter / taller |
| Ctrl + D | Duplicate the selected zones (or the selected panel widget) |
| H | Hide / show the selected zones |
| Ctrl + Alt + C / V | Copy the primary zone's style / paste it onto the selection |
| Del, Backspace | Remove the selected zones (or only the selected panel widget) |
| Ctrl + C / Ctrl + V | Copy the selected panel widget / paste the copy after it |
| Alt + Up / Down | Move the selected panel widget earlier / later |
| Ctrl + 0 | Fit the page to the canvas and keep it fitted |
| Ctrl + = / Ctrl + - | Zoom in / out (stops the sticky fit) |
| Ctrl + wheel | Zoom |
| Ctrl + \ | Collapse / expand the bottom dock |

While you type in a field (a setting, the search box, the zone name), the
plain keys go to the field; Ctrl + S and Ctrl + K still work, and so does
undo / redo outside text fields (inside one they are the browser's own). With
a dialog or menu open, its own keys win (Esc closes it). While a pointer drag
is in flight only Esc (cancel) works. In Sources mode the canvas keys are off.
The tooltips of the top bar buttons show their shortcut (the zone's Duplicate
and Remove only while no panel widget is selected, since Ctrl + D and Del
then act on the widget).

## Where the options are

The inspector is driven by one registry: the widget's own `settings` (each
with a `tab`, `advanced`, `hint` and `visibleIf`), the general look settings
every widget shares, the panel and panel-widget fields, and the dashboard
settings. It never hard-codes a panel per widget.

**Header.** A selected zone shows its icon, an editable name, a meta line
(`3×2 · min 2×1 · N data points`, `Panel · Stack · 3 widgets` or `Blank zone
· 2×1`), and **Hide**, **Duplicate** and **Delete**. Under it is the
**placement row** (column, row, width, height in grid cells; values are
checked against neighbours and minimum sizes) and a **Search settings** box.

**Tabs.** A widget or panel zone has **Content**, **Style** and **Data**; a
small pill on a tab counts the options set on this zone. The open tab is
remembered per kind of selection. A blank zone and a multi-selection have no
tabs. **Search settings** looks through all tabs at once: the tabs give way
to the matching options, each section labelled with its tab, and a line says
"N settings across all tabs". It covers labels, keys and option names, and
the custom cards by title and keywords; **Esc** clears it, and a message says
when nothing matches.

**Sections.** Each section is collapsible (the studio remembers which are
open), shows "N changed" and has its own **Reset**, which restores just that
section's options. A short hint sits behind an **i** icon on a row.

**Source dots.** A 7 px dot before a label says where its value comes from
(hover it for the explanation; the **?** in the footer lists them):

- no dot - the default;
- teal - from the dashboard style (all profiles);
- violet - from the profile style;
- blue - set here (on this widget, or in the scope being edited);
- blue with a ring - set here, overriding a global value;
- amber ring - set here but **ignored** (the widget follows the global style,
  or the global style is forced).

Click a dot that is set here to reset that option.

**Advanced.** The footer has an **Advanced settings** toggle (off by default
and remembered). While it is off, advanced options are tucked away and a
dashed **Show N advanced settings** button at the end of the list reveals
them.

**What each context shows:**

- **Widget zone** -
  - *Content*: **Widget** (type, custom title, icon, **Hide when idle** for
    the five widgets that have an idle state, **Visible**), then the
    widget's own categories (for example Media: *Now playing*, *Cover art*,
    *Waveform*, *Visualizer*, *Audio source*; System: *Devices*, *CPU*,
    *GPU*, *Memory*, *Drives*, *Trends*, *Thresholds*, *Units & labels*;
    Weather: *Display*, *Current conditions*, *Forecast*).
  - *Style*: **Size & alignment** (**Layout** for the adaptive widgets,
    **Scale with the zone**, **Size %**, the 3×3 **Alignment**),
    **Typography** (**Text color**, **Secondary text color**, **Font**,
    **Value weight**, **Label case**), **Spacing & shape** (**Inner
    padding**, **Gap between items**, **Corner radius**, **Ring / bar
    thickness**), **Colors & surface** (**Follow global | Custom**, the style
    tools, **Preset**, **Surface**, **Accent color**, **Background image** with
    **Use as background**, **Surface opacity** and **Background blur**),
    **Border & effects** (**Border width** and **color**, **Edge glow** and
    **Glow color** - only while the glow is not none - and the **Zone
    frame**: **Frame accent**, **Frame background**, **Frame title
    header**) and **Advanced** (**Custom CSS**, see [Custom CSS](#custom-css));
    the widget's own color pickers (e.g. the System widget's device colors)
    sit here too, marked advanced.
  - *Data*: **Bound data** (see [Data Explorer and
    binding](#data-explorer-and-binding)) and data-related own categories
    (for example *Audio source*).
  - **Web Page** has reduced styling: Colors & surface, Border & effects and
    Advanced only. The plain card widgets (Departures, Notifications, Text
    File, Stream Deck and the *Other sensors* cards) offer fewer of the
    standard options than the modern widgets.
- **Panel zone** - *Content*: **Panel** (Visual or Code, Fill or Hug, gap,
  padding), **Layout** (Stack / Grid / Overlay options), **Background**
  (Overlay only), **Widgets**, and with a widget selected its cards under
  **Selected widget** (see [Panels](#panels)); *Style*: the same look
  sections as a widget; *Data*: **Sensors used** by its widgets.
- **Blank zone** - **Widget** with a **Pick a widget** button, and **Zone
  frame**.
- **Several zones** - only the shared Style sections.
- **Nothing selected: the Dashboard inspector.** Click empty canvas or press
  Esc. Its tabs:
  - **Profile** - the profile's name, design size, grid, fit, gap and
    padding; **This profile** (Theme / Style / Background: **Inherit** or
    custom); and **Profile selection** (**Auto-pick by window size**).
  - **Appearance** - **Scope** (**All profiles | This profile**, plus **Force
    global style**, see [Appearance (global style)](#appearance-global-style)),
    the [appearance presets](#appearance-presets) gallery, **Theme** (theme
    colors, corner radius, see [Theme colours per
    profile](#theme-colours-per-profile)) and **Page background** (see
    [Page background](#page-background)).
  - **Global style** - the look itself, in the same sections as a widget's
    Style tab, written at the dashboard or profile level by the Scope.
  - **General** - *Type*, *Clock & date*, *Display*, *Studio* (the inspector
    position: Side, Bottom or Auto) and *Connection* (the Data API URL and
    its test); see [General settings](#general-settings).

"Auto" or an empty value always means the widget's own look.

### Data Explorer and binding

**Sources** mode replaces everything right of the rail with the Data
Explorer: a header (the number of data points and sources, whether the Data
API is running and live over SSE, an **Endpoints** popover that copies a
route, and **Add source**), a **source tree** (filter, health chips for
healthy / no data / offline, categories Built-in / Plugins / Hardware
monitors / Pushed via API, and a row per source and container), a **point
table** and a **point inspector**. The table has a search, a type control
(All / Numbers / Text / Lists / Links), **Hide empty** and **In use** chips,
and for each point its name, live value, which zones use it, and copy-key and
**Bind** buttons. The point inspector shows the value (numbers get a
24-sample Min / Avg / Max history), the key and stream URL to copy, **Used
by** (each zone links back to the canvas), a select to **Bind** the point to a
zone, and **New widget from this value**. With no point selected it shows a
summary of the group, a "stream this group" prefix URL and the sources'
**Show in dashboard** and display-name preferences. Below a 1240 px window
the point inspector becomes a drawer, and below 1000 px the table drops its
**Used by** column. All values come from the page's one live sensor stream.

A zone's bindings are the keys it reads; nothing extra is stored. A panel
widget claims its **Sensor** (and sub sensor); a widget zone claims its
module's data prefixes, narrowed to one container when the widget's source
setting is set (a widget can be bound to a container, never to a single
key). The Data tab's **Bound data** lists them with their live value (amber
**No data** when empty), an unbind button and **Bind**; click a row to open
the point in the Explorer. **Bind** opens a search over every data point
(multi-word, over name, key, source, container and kind): in a widget zone
each row toggles a binding, and from a panel widget's **Sensor** field
picking a point sets the sensor and closes the picker. The zone menu's
**Bind data...** opens the same picker.

## Panels

A *panel* is a zone that holds your own group of small widgets - stats,
values, bars, gauges, sparklines, tables, text, images, clocks and shapes -
each bound to any sensor. Its **arrangement** (stack, grid or overlay) and
its widgets are edited in its own cards (next to the general ones); its
**look** (title, card, spacing, colors, font, border, glow, CSS) in the
general sections, like any widget's. A panel draws its own card, so the zone frame's background does not
apply to it.

### Creating a panel

The Add panel and the widget picker list three kinds of panel, each with a
category chip:

- **Layouts** - sensor-free starters that show what the arrangements can do:
  *Row of stats* (a stack that spreads three stats across one row), *2×2
  stats* (a 2-column grid, centered in its cells), *Hero overlay* (an image
  background with a title, a big stat and two values in the bands), *Gauge
  row* (three rings spread across a row), *Clock + date* (time over date,
  centered) and *Label / value list* (a grid of labels and right-aligned
  values). Their widgets are unbound: in the studio each one says *pick a
  sensor* under itself until you bind it (the kiosk shows just "-").
- **Panels** (System, Network, Info, Other) - ready-made panels bound to
  sensors (CPU, GPU, RAM, network, weather, FPS gauges, Steam, clock).
- **My panels** - panels you saved yourself.

Drag a row onto the canvas, click **+** to add it at the first free spot,
use the widget picker to put it in the selected zone, or type **Add panel:
...** in the command palette. A new panel zone is ready to edit straight
away: its title and card are already settings of its general sections.

**Save as panel preset**: in a panel zone's *Panel* section, the **...** next to
**Visual / Code** has **Save as panel preset...** (the command palette has
*Save panel as preset...* too). Type a name (it starts as the panel's
title) and press **Enter**; **Esc** cancels. The preset keeps the panel's
arrangement, widgets and sensors, its look (the panel's general settings)
and the zone size, and appears under **My panels**. Saving is one undo step.
The **...** on a My panels row renames it (in place: Enter or clicking away
saves, Esc cancels) or deletes it. Saved panels are stored in the config, shared by all
profiles, and travel with an exported config. Every use is a fresh copy:
changing a placed copy never changes the preset or other copies.

Duplicate a panel zone with the zone's **Duplicate** (or Ctrl + D with no
panel widget selected).

### The panel sections

The panel's **title** (empty = hidden) is the *Widget* section's **Custom
title**, and its card and accent are *Colors & surface*'s **Surface**
(none / card / bordered card, glass, matte, theme) and **Accent color**;
the panel sections below do not repeat them. The **Panel** section has **Visual
/ Code**, which switches between the editors and the panel as JSON (see
[Code view](#code-view)), and **...** with Save as panel preset. **Layout**
is the arrangement (next section), **Background** (overlay panels) picks the
image widget that fills the overlay and the dark scrim - not to be
confused with *Colors & surface*'s **Background image**, which is a
picture behind the whole panel - and **Widgets** lists the widgets (see
[Editing widgets](#editing-widgets)).

### Layouts

**Layout** picks the arrangement; each one shows its own options.

- **Stack** - the widgets in a line.
  - **Direction**: **Row** (left to right) or **Column** (top to bottom).
  - **Wrap**: start a new line when the row (column) is full; off keeps
    everything on one line.
  - **Alignment**: a 3×3 picker. Along the stack the cells give start /
    center / end, and **Spread** spreads the widgets with equal space
    between them; across the stack they give start / center / end, and
    **Stretch** makes every widget as tall (in a row) or as wide (in a
    column) as the line. Click the active cell again for Auto.
- **Grid** - the widgets in columns and rows, filled in order.
  - **Columns**: the column count (1-12), all equal.
  - **Column sizes**: one size per column instead: `1fr` (a share of the
    free space), `auto` (as wide as the content) or a fixed `120px`. Adding
    or removing a size changes the column count.
  - **Row sizes**: the same for rows (empty = equal rows).
  - **Cell alignment**: where each widget sits inside its cell,
    horizontally and vertically; **Stretch** fills the cell's height.
- **Overlay** - an image widget paints the whole panel, and the other
  widgets sit on top of it in three bands.
  - **Background image**: which image widget is the background (default:
    the first image widget).
  - **Dark scrim over the image**: keeps light text readable on any image;
    turn it off for art with its own contrast.
  - **Band alignment**: Start / Center / End / Spread for the top, middle
    and bottom band.
  - **Bottom band columns**: lay the bottom band out as N equal columns
    (for values that must line up under columns printed on the art); empty
    = a row.

For every layout:

- **Gap (px)**: space between the widgets, and **Padding (px)**: space
  inside the panel's card. Empty (auto) uses *Spacing & shape*, then
  the layout's own spacing.
- **Fit in zone**: **Fill** (default) stretches the panel over the whole
  zone; **Hug** shrinks it to its content.

Switching from Stack to Grid drops Spread (a grid has no free space to
spread over); everything else carries over, so switching back restores the
stack.

### Alignment at two levels

1. **The panel in its zone.** A panel fills its zone unless **Fit in zone**
   is **Hug**. A hugging panel is placed by the zone's own alignment, the
   3×3 picker in *Size & alignment* (left / center / right × top /
   middle / bottom).
2. **The content in the panel.** The layout's alignment (Stack:
   *Alignment*; Grid: *Cell alignment*; Overlay: *Band alignment*) places
   all widgets. A single widget can differ: its **Layout** section has
   **Align self** (across the stack, or inside its grid cell) and its own
   **Width** and **Height**:
   - in a stack: **Hug** (its content's size), **Fill** (share the free
     space; bars, tables, images and sparklines fill by default) or
     **Fixed** px;
   - in a grid: **Cell** (fill the cell, the default) or **Fixed** px.

### Editing widgets

- The **Widgets** section is a layer list. Drag a row to reorder it (or select
  it and press **Alt + Up / Down** with the list focused), the eye hides a
  widget, and **...** offers Duplicate, Copy, Paste after, Change kind and
  Delete. **Add widget** (at the top of the section) inserts the chosen kind
  after the selected widget. An unlabeled widget is listed by its sensor's
  name.
- The selected widget's editor is a set of sections under **Selected widget**,
  in the same order as a zone's own (only the cards its kind uses):
  - **<Kind> widget** (with **Change kind**): label, sensor, sub sensor
    (shown small below the value), unit, decimals, scale (multiplier, e.g.
    bytes to GB), max (the 100 % of a bar or gauge), invert fill, and the
    static text or image URL;
  - **Display**: the kind's own options (shape and thickness, image max
    height, table rows / columns / header, sparkline history, clock time /
    date, text alignment);
  - **Size & placement**: width, height and align self (see above), in a
    grid the column / row span and start column / row, in an overlay the
    band and *Use as panel background*;
  - **Typography**: font size (a gauge's ring diameter);
  - **Colors**: the widget's color;
  - **Advanced**: **Class names** (hooks for the panel's CSS) and **Custom
    CSS** scoped to the widget, with the list of hooks.
  **Change kind** (in the first section or the layer's **...**) keeps the
  label, sensor, unit, color, layout and CSS.
- With **Code** chosen in the *Panel* section, the layout, widgets and widget
  sections give way to one wide **Code** section (see [Code view](#code-view)).

### Selecting widgets on the canvas

With the panel zone selected, click one of its widgets (a double-click on a
widget of an unselected panel does both at once). The widget gets an outline
(the others show a faint one on hover), the selection chip and the inspector
header show *Zone > Widget* (click the zone crumb to go back to the panel,
the widget crumb to scroll to its editor), and the inspector shows its
sections under **Selected widget** (the widget's data, display, size &
placement, typography, color and advanced sections, in the zone's own order). Clicking empty space in the panel selects the panel again; dragging
still moves the zone.

With a widget selected:

| Keys | Action |
|---|---|
| Del, Backspace | Remove the widget |
| Ctrl + D | Duplicate it |
| Ctrl + C / Ctrl + V | Copy it / paste the copy after the selected widget (also in another panel) |
| Alt + Up / Down | Move it earlier / later |
| Esc | Step out: first to the panel, then to nothing |

The arrow keys still move and resize the zone, and the zone's own Duplicate
and Remove buttons stay available (their tooltips drop the key while a
widget has it). The outlines and *pick a sensor* hints are studio-only; the
kiosk never shows them.

### Code view

**Code** shows the whole panel as JSON: edit it and press **Apply** (or
**Ctrl + Enter**). Invalid JSON or an unknown widget kind is reported and
nothing changes; missing or repeated widget ids get fresh ones. One Apply
is one undo step, and a changed `title` also updates the shown title. The
JSON has the fields the editor sets (`layout`, `direction`, `wrap`,
`justify`, `align`, `gap`, `padding`, `columns`, `gridCols`, `gridRows`,
`overlayAlign`, `scrim`, `bottomGridCols`, `fit`, and per widget `box`,
`span`, `rowSpan`, `overlayZone`, …) plus `css`: CSS for the panel that
travels with it into saved panels. It works like *Advanced* > Custom CSS (both
apply).

### Styling panels with CSS

Panel CSS (*Advanced* > **Custom CSS**, or the Code
view's `css`) is scoped to the zone: `:scope` is the zone's root and the
selectors below match inside it. A widget's own **Custom CSS** (its *Advanced*
card) is scoped to that widget's cell: `:scope` is the
`.wp-widget` element.

```
:scope                                   the zone's root (fills the zone)
└─ div.z-10
   └─ div                                 places a hugging panel by the zone alignment
      └─ .wp-panel                        the card
           [data-panel-layout="stack|grid|overlay"] [data-panel-id]
         ├─ .wp-panel-title               the title line (accent dot or icon + text)
         │
         │  stack / grid:
         ├─ div                           the stack (flex) or grid container
         │  └─ .wp-widget.wp-widget--{kind}.{your class names}
         │       [data-widget-id] [data-widget-kind]
         │     └─ the widget (below)
         │
         │  overlay:
         ├─ img.wp-panel-bg               the background image (div when there is none)
         ├─ .wp-panel-scrim               the dark scrim
         └─ div
            └─ .wp-band[data-band="top|middle|bottom"]
               └─ .wp-widget …
```

Inside a widget (by kind):

| Kind | Hooks |
|---|---|
| stat | `.wp-label`, `.wp-value` (with `.wp-unit` inside), `.wp-sub` |
| value | `.wp-value` (with `.wp-unit`), `.wp-label`, `.wp-sub` |
| bar | `.wp-label`, `.wp-value`, `.wp-unit`, `.wp-bar-track` > `.wp-bar-fill` |
| gauge | `.wp-gauge` > `[data-gauge]` > `svg` (two `circle`s: track, then fill) |
| sparkline | `.wp-label`, `.wp-value`, `svg.wp-spark` |
| table | `.wp-label`, `.wp-table` |
| text | `.wp-label`, `.wp-value` |
| image | `img`, `.wp-label` |
| clock | `.wp-clock-time`, `.wp-clock-date` |
| shape | `.wp-shape` |

The panel's layout fields are CSS variables on `.wp-panel`, read with the
Spacing & shape value and then the built-in spacing as fallbacks:

| Variable | From | Used for |
|---|---|---|
| `--panel-gap` | Gap | space between widgets (and bands) |
| `--panel-pad` | Padding | space inside the card |
| `--panel-direction` | Direction | `row` / `column` |
| `--panel-wrap` | Wrap | `wrap` / `nowrap` |
| `--panel-justify` | Alignment (along) / Cell alignment (horizontal) | `justify-content` / `justify-items` |
| `--panel-align` | Alignment (across) / Cell alignment (vertical) | `align-items` |

A field you set in the editor is written on the element itself and wins
over CSS; leave it on auto to set it from CSS. The same goes for values a
widget sets inline (its color, its font size): override those with
`!important`. The panel's colors are the theme variables `--accent`,
`--foreground` and `--muted-foreground` (HSL triplets: `hsl(var(--accent))`).

Four examples (each tried in the kiosk):

```css
/* 1. Panel CSS: tighter spacing (Gap and Padding left on auto) */
.wp-panel {
  --panel-gap: 4px;
  --panel-pad: 6px;
}
```

```css
/* 2. Panel CSS: accent-colored, glowing numbers on every stat */
.wp-widget--stat .wp-value {
  color: hsl(var(--accent));
  text-shadow: 0 0 10px hsl(var(--accent) / 0.5);
}
```

```css
/* 3. Panel CSS: divider lines between the widgets of a row stack */
.wp-panel[data-panel-layout="stack"] .wp-widget + .wp-widget {
  border-left: 1px solid hsl(var(--border));
  padding-left: 12px;
}
```

```css
/* 4. A bar widget's own Custom CSS: thinner track, traffic-light fill */
:scope {
  padding-block: 4px;
}
.wp-bar-track {
  height: 6px;
}
.wp-bar-fill {
  background-image: linear-gradient(90deg, #22c55e, #f59e0b, #ef4444);
}
```

Example 2 leaves a widget with its own **Color** as it is (the color is
set on the element); to target a few widgets only, give them a class name
(*Advanced* > **Class names**, e.g. `hot`) and select `.wp-widget.hot` in the
panel's CSS.

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

The **Alignment** picker is a 3×3 grid: click a cell to place the content
inside the zone horizontally (left / center / right) and vertically (top /
middle / bottom) in one go, and click the active cell again to go back to
Auto. With the grid focused, the arrow keys move and pick. **Spread**
distributes the items across the width (the cells then pick only the
vertical position). Left, center and right keep items at their natural size
and move them. When the content is wider than the zone, a
centered or right-aligned layout overflows at its end instead of cutting off
its start.

## Spacing and shape

- **Inner padding**: space between the surface edge and the content.
- **Gap between items**.
- **Corner radius**, up to a pill shape.

Each is a pixel step, or Auto for the widget's own value.

## Colors and type

- **Accent color** (in *Colors & surface*) tints the widget's main fill,
  such as the progress bar or the big temperature; each widget decides where
  it lands.
- **Text color** and **Secondary text color** override the surface's text.
- **Font** (Theme, or any font of the [catalog](#fonts)), **Value weight** and **Label
  case** (UPPERCASE, as written, Capitalized). *Theme* uses the page font,
  which is **General > Font** (see [General settings](#general-settings)).
- **Ring / bar thickness (%)** (50-250) scales rings and bars.
- Widgets with several parts add their own colors here (the System widget has
  a color per device).
- The **Surface** (glass, matte light, matte dark, theme) and the **Preset**
  (a one-click bundle of surface and accent) are at the top of the list.
  **Theme** builds the surface from the theme's colours (card, text, muted,
  border, primary), so it follows the theme preset: with *Paper (light)* a
  theme-surface widget is light, with a dark preset it is dark.
- The accent, text and secondary text colours (hex) also recolour the
  theme colours inside the widget, so parts drawn in theme colours (labels,
  values, gauges, the plain cards' text) follow them too.

## Border, glow, opacity and blur

In *Border & effects* (border and glow) and *Colors & surface* (opacity
and blur), for widgets with a surface box:

- **Border width** and **Border color** (the default is a 1 px edge).
- **Edge glow** (None, Soft, Strong) and **Glow color** (empty = the accent
  color). The glow is drawn inside the edge, because an outer glow would be
  clipped by the zone.
- **Surface opacity (%)** fades the surface background, gradients included.
  At 0 the background is fully transparent.
- **Background blur** blurs what is behind the surface (visible on glass or a
  faded surface).

A **background image** (in *Colors & surface*) needs both the image URL and
**Use as background**. Glass surfaces let it show through; matte ones cover
it. The field takes a URL, or upload a file with **Upload...** or by dropping
it on the field, or pick an uploaded one from the library button; see
[Uploading images and videos](#uploading-images-and-videos).

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

## Page background

The page behind the zones can be a color, a gradient, an image or a video. With
nothing selected, open the Dashboard inspector's **Appearance** tab and its
**Page background** section (or **Background...** in the command palette). The studio canvas shows the background as the kiosk will,
with the dotted grid drawn over it.

At the top, choose what you edit:

- **All profiles** - the dashboard's background, shown on every profile that
  has none of its own. **None** turns it off: the theme's background color
  shows.
- **This profile** - the active profile only. **Inherit** uses the
  dashboard's background, **Custom** gives the profile its own (it starts as
  a copy of the dashboard's), and **None** shows no background on this
  profile even when the dashboard has one.

Then pick the type:

- **Color** - one color.
- **Gradient** - **From** and **To** colors and an **Angle** (0° runs bottom
  to top, 90° left to right).
- **Image** - an **Image**: type an `http(s)` address or a path served by
  the dashboard such as `/assets/ip/arcv2/arc-mono-ref.png` (applied when you
  press Enter or leave the field), or upload a file (see
  [Uploading images and videos](#uploading-images-and-videos)). A preview
  shows below it.
  **Fit**: *Cover* fills the page and crops, *Contain* shows the whole image
  with the **Fill** color around it, *Stretch* distorts it to the page size,
  *Center* uses its natural size and *Tile* repeats it. **Position** (the 3x3
  picker) anchors the image; clicking the selected cell goes back to the
  center.
- **Video** - a **Video** (MP4, WebM or MKV, by URL or upload) and a **Poster
  image**, the still shown until the video plays. **Loop** and **Muted** are
  on by default; with Muted off the video tries to play with sound and plays
  muted if the browser does not allow it. **Speed** sets the playback rate
  (0.5x to 2x). **Fit** and **Position** work as for an image, except that a
  video can't tile.

  The video pauses while the page is hidden (minimized, another tab) and
  resumes when it is shown again. When motion is reduced, only the poster
  shows (or the fill color without a poster) and the video is not loaded.
  By default that follows the system's *reduce motion* setting; **General >
  Motion** can force it either way (see [General
  settings](#general-settings)).

  The kiosk plays the video around the clock, so keep it light: H.264 MP4
  or VP9 WebM at the display's resolution and 24-30 fps. Blur over a video
  makes the browser re-composite every frame; leave it off or low.

Gradients, images and videos have **Effects**: **Dim** darkens the page (0-100 %),
**Tint** lays a color over it at **Tint opacity**, and **Blur** softens it
(up to 40 px; the edges stay sharp). Dim and tint make widgets with the
*Glass* surface easier to read over a busy image.

Each change is one undo step (changes made in quick succession, such as
dragging a slider, are merged). Values for the other types are kept, so
switching from Image to Color and back keeps the URL and effects. Image and
Video share one source, so switching between them never carries a file into
the wrong field: an image becomes the video's poster, and a video's poster
becomes the image.

### Uploading images and videos

Every image field in the studio (the page background, a video's poster, a
widget's background image) and the video field can take a file instead of a
URL:

- **Upload image...** / **Upload video...** opens a file picker for that
  kind; or drop a file on the field. A video dropped on an image field (or
  the other way round) is refused with a message naming the field's kind. The file
  goes to the dashboard server, and the field gets its address
  (`/api/assets/<id>`). The kiosk loads it from the same server, so it works
  in InfoPanel's own browser too.
- Accepted: PNG, JPEG, GIF, WebP and AVIF images up to 25 MB; MP4, WebM and
  MKV videos up to 300 MB. SVG is not accepted. The type is checked from the
  file's content, so renaming a file does not help. A WebM that is Matroska
  inside (as OBS remuxes and many converters write it) and a `.mkv` are both
  accepted and stored as WebM; the browser plays either. When Windows gives
  a file no type, the studio takes it from the extension.
- Uploading the same file again reuses the stored copy.
- A server started before uploads existed answers "can't take uploads yet":
  close it and start it again (`start-dashboard.bat`).
- Uploads are accepted only from the computer the server runs on. From
  another machine the studio shows "The server only accepts uploads from its
  own computer"; start the server with `ALLOW_REMOTE_UPLOAD=1` to allow it.

The **library** button next to Upload... lists the uploaded files of the
field's kind (thumbnails; the first frame for a video) with their size.
Click one to use it. Files the saved config does not use are marked
*unused*. The bin on a file deletes it from the server (click twice to
confirm). **Clean up unused...** deletes every unused file, images and
videos, after a confirm. Undo can't bring a deleted file back. The check
looks at the config saved on the server (the studio saves a moment after
each change), so a file that only the undo history still refers to counts as
unused.

## Appearance presets

An appearance preset is a whole look in one click: theme colours and corner
radius, the global style and, for some, a page background. The gallery at
the top of the Dashboard inspector's **Appearance** tab shows each one as a small drawing of the
look (its page background and two mini widgets with its surface, accent,
corners and glow), with its name and a one-line description. Click a card to
apply it. The built-ins:

| Preset | Look |
| --- | --- |
| Dark | Zinc theme, solid dark cards (Matte dark) |
| Light | Paper theme, Theme surface - every widget kind turns light |
| Glass | Zinc, see-through Glass cards (60 % opacity, 16 px blur, thin light border) over a bundled colour-wash background |
| Frosted | Glass with 40 % opacity, 24 px blur and a soft edge glow, same background |
| Matte | Neutral theme, Matte dark cards with 12 px corners |
| Neon | Slate theme, cyan accent and border, strong glow, Mono type |
| Minimal | No visible card (Theme surface at 0 % opacity), no border, 8 px padding |
| Ocean, Forest | The Ocean / Forest theme colours on the Theme surface |

What a preset changes depends on the **All profiles | This profile** switch
above it:

- **All profiles** - the dashboard's theme colours, corner radius and style
  (replaced as a whole, so nothing of the previous look is left over).
  Profiles with their own theme colours or style keep them (see the banner
  below).
- **This profile** - this profile's own theme colours, corner radius and
  style; the other profiles keep theirs. *This profile: Light* turns the
  profile fully light - page, cards and text - while the others stay as
  they are. Options the dashboard style sets but the preset leaves alone are
  set back to their defaults in the profile, so the profile shows the
  preset's look rather than a mix. **Inherit** under *Theme colours* hands
  the colours back to the dashboard.

A preset's background (Glass and Frosted have one; the card shows a picture
icon) goes to the same scope, but only where none is set yet - turn on
**Replace the page background** under the gallery to replace an existing
one. A preset without a background never removes yours. Widget content
(sensors, layout, titles, ...) is never touched, and applying a preset is
one undo step: **Ctrl+Z** puts the whole previous look back.

Widgets with their own look still win over the preset. After you apply one,
a banner counts them - for example *3 widgets keep their own style* (and,
for All profiles, *1 profile has its own look*: its own style or theme
colours) - with **Make them follow**: those widgets switch to [Follow
global](#follow-global-or-custom) (their own values stay saved) and, for
All profiles, the profiles' own styles, theme colours and corner radius are
cleared. That is one undo step too.

**Save current as preset...** under the gallery asks for a name and saves
the current theme colours, corner radius, style (for This profile: the
profile's own over the dashboard's) and background as a preset of your
own; it appears after the built-ins. Its **...** menu has **Rename...** and
**Delete**. Saved presets are stored in the config (`appearancePresets`)
and shared by all profiles. The command palette has **Apply appearance:
<name>** for every preset (applied to all profiles).

Appearance presets are not the same as a widget's style presets (see
[Copy, Paste, Use as global and presets](#copy-paste-use-as-global-and-presets)):
an appearance preset sets the whole dashboard's (or profile's) look; a style
preset restyles the one widget you apply it to. The theme swatches under
**Theme colours** are a third, smaller step: they change the colours only.

## Appearance (global style)

Look-only options can be set once for every widget instead of per widget.
With nothing selected, the Dashboard inspector's **Global style** tab lists them: surface, accent,
size and alignment, spacing, colors and type, border, glow, opacity, blur
and custom CSS. Content settings, layout, title, icon and the background
image are always per widget.

A switch (**Scope**, on the Appearance tab) picks what you edit:

- **All profiles** - the dashboard style, for every widget in every profile.
- **This profile** - this profile's style, over the dashboard's. Rows the
  dashboard style sets show its value with a teal dot until you set them
  here.

The order of precedence is: the widget's default, then the dashboard style,
then the profile style, then the widget's own value (unless the widget
follows the global style, see below). A panel's older card and accent
choices count as its default, so the global style reaches it.

**Force global style on every widget** (one per scope) makes every widget
ignore its own look values - they stay saved and come back when you turn it
off. Under **All profiles** it is a switch; under **This profile** it is
**Inherit** (the dashboard's choice), **On** or **Off**. While it is on, a
panel's own widget colours (**Color** of a stat, bar, shape, …) also give
way: fills take the global accent, text the global text colour.

A dot left of an option says where its value comes from (hover it for the
explanation):

- no dot - the default;
- blue dot - set here (on this widget, or in this scope);
- teal dot - from the dashboard style (All profiles);
- violet dot - from the profile style;
- blue dot with a ring - set here, overriding the global style;
- amber ring - set here but ignored (the widget follows the global style, or
  it is forced).

Clicking a dot that is set here resets it: it drops the value, so the option
falls back to the global style (or the default). On the Global style tab the
same dots and reset apply to the scope's own values, and **Search settings**
filters them (for example "radius").

Each section's **Reset** there clears that section's options of the scope
being edited.

### Follow global or custom

The top of a widget's *Colors & surface* section has **Follow global | Custom**:

- **Custom** (also what a widget without a choice does) - the widget's own
  values win, option by option.
- **Follow global** - only the dashboard / profile style applies. The
  widget's own values stay saved but ignored (their dots get the amber
  ring), and a banner on the Style tab says so, with a link to **Edit global
  theme** (Dashboard › Appearance). Editing a look option while the widget
  follows switches it to Custom; **Follow global style** in the zone menu
  clears the widget's look overrides.

Panels saved by earlier versions keep their card and accent as their own
values, so the global surface doesn't reach them until they follow: set
them to **Follow global**, or run **Make all widgets follow global style**
from the command palette (all zones of this profile, one undo step). The
palette also has **Force global style on every widget** (it toggles this
profile's switch when the profile has its own, else the dashboard's) and
**Appearance...**.

Each scope's style edits, its force switch and each zone's Follow / Custom
choice are separate undo steps.

### Theme colours per profile

The theme colours and corner radius belong to the dashboard, unless a
profile has its own. Under **This profile**, the *Theme colours* section
starts with **Inherit | Custom**:

- **Inherit** - the profile uses the dashboard's theme colours and radius.
- **Custom** - the profile gets its own, starting as a copy of the
  dashboard's; the swatches, the radius slider and *Custom colours* below
  then edit the profile's copy only.

The kiosk shows a profile with its own colours in them (page, cards, text,
the Theme surface). In the studio the canvas previews them while the
studio's own panels and bars keep the dashboard's colours, so a light
profile shows as a light page on the canvas. Applying a preset to **This
profile** sets the profile's colours too (see [Appearance
presets](#appearance-presets)). Each colour edit, the radius and the
Inherit / Custom switch are undo steps like any other.

## General settings

With nothing selected, the Dashboard inspector's **General** tab holds preferences that are not
a look. They apply to every profile, in the kiosk and in the studio.

- **Font** - the page font, from the [font catalog](#fonts). Every widget
  whose **Font** is *Theme* uses it; a Font set on the widget, or in the
  global style, still wins.
- **Clock** - *Locale* (the date locale decides 12 or 24 hours), *24 h*
  or *12 h*; **Show seconds** (on by default); **Date & time locale** -
  *System* or one of the listed locales (for example *Deutsch (Deutschland)
  · de-DE* writes *Mo., 12.10.2026*). These shape the panel **Clock**
  widget; the last-update time in the dashboard header follows the clock
  format and locale (always with seconds). Durations, such as a track's
  elapsed time, are not clock times and don't change.
- **Motion** - *System* follows the operating system's *reduce motion*
  setting; *Reduce* and *Full* override it. Reduced motion shows a
  background video's poster instead of the video and lets the meters and
  waveforms repaint less often.
- **Hide cursor in kiosk** - no mouse pointer on kiosk pages
  (`?kiosk=1`); the studio and the normal dashboard page keep it.

Each change is one undo step (the same option changed in quick succession is
merged).

## Fonts

The page font (General › Type) and every widget's **Font** option offer the
same catalog (`src/lib/fonts.ts`): *System* (the browser's default), *Sans*,
*Rounded*, *Serif* and *Mono* (the original system stacks, whose ids saved
configs keep) and Google Fonts: Inter, Geist, Roboto, Manrope, Outfit, Space
Grotesk, IBM Plex Sans, Nunito, Rajdhani, Orbitron, Oswald, JetBrains Mono and
Fira Code. A Google font is downloaded the first time something uses it and
always has a system fallback, so a kiosk without internet still renders (in
the fallback). The studio's own chrome is a separate matter: it uses Geist and
Geist Mono and does not follow the dashboard font.

## Grid spacing: gap and padding

Each profile has its own spacing, in Dashboard › Profile:

- **Gap px** - the space between zones. Empty means 12 px, the spacing
  every profile had before.
- **Padding px** - the space between the page edge and the grid. Empty
  keeps the page's defaults: none on a *Fill viewport* kiosk page, 12 px on
  the normal dashboard page of a *Fill viewport* profile (next to the
  header) and 24 px for *Scroll* profiles.

Both take 0 to 200 px. The studio canvas draws the profile at its design
size with the same gap and padding (as the kiosk page shows it), and
drawing, moving and resizing zones, the column guides and the selection chip
all follow the gap. A gap of 0 makes the zones touch; with no card surface
(for example the *Minimal* preset) that turns the grid into one seamless
page.

## Copy, Paste, Use as global and presets

The buttons at the top of the *Colors & surface* section work on a
widget's look-only options:

- **Copy** remembers the selected widget's style; **Paste** replaces another
  widget's style with it. Paste replaces the style as a whole: options the
  copied style does not set go back to the global style or defaults, the
  widget's content settings are untouched, and options the target widget does
  not have are skipped.
- The **...** menu holds the rest. **Use as global...** makes the selected
  widget's style the global style of **All profiles** or **This profile**. **Save as preset...** asks for a name and
  stores the widget's style as a named preset; **Apply preset** applies one
  to the widget (same replace rules as Paste) and **Delete preset** removes
  one. Presets are saved in the config and are shared by all profiles.
  (For a whole dashboard look, see [Appearance presets](#appearance-presets).)

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
