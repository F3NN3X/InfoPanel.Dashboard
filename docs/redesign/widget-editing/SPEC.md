# Widget editing: quick bar + adaptive inspector

Implementation spec for Claude Code.

**Reference prototype:** `Widget Inspector Concept.dc.html`. Open it in a browser next to `support.js`.
- Use the top bar to switch viewport (Fit / Desktop 1440 / Laptop 1024 / Tablet 768 / Phone 390) and profile (Desk 1280×600 / Bar 1920×480).
- "How it works" opens a summary.
- Port the behaviour and the visual values. Do **not** port the prototype's markup structure. It is a single-file demo with a simplified schema and fake widget renderers.

This **replaces both** the old bottom-dock inspector and the bottom-strip redesign in `handoff_bottom_inspector/`.
- The side inspector stays, but it gains the features in §4.
- The "Inspector position: Side / Bottom / Auto" setting is removed. Placement is now automatic (§5).

---

## 1. Why

- **The bottom strip didn't work in practice.** It tried to show every section at once in a wide, short area. On small screens that meant horizontal scrolling through cut-off columns.
- **Other editors share a few patterns.**
  - Figma, Framer, Webflow and Elementor use a one-column vertical inspector.
  - Canva and Google Slides use a contextual toolbar for the most common settings.
  - CapCut, Lightroom and Canva mobile use a bottom sheet with a tool strip that shows one category at a time.
  - None of them lays settings out horizontally.
- **Most edits are "change this one thing on this widget"** (layout, accent, a toggle). Those should take one click, without opening a panel.

## 2. The model: one schema, three surfaces

| Surface | What it shows | When it's visible |
|---|---|---|
| **Quick bar** | 3–6 pinned settings for the selected widget | Docked and floating modes, while something is selected |
| **Inspector** | All settings: tabs, accordion, search, Changed filter | Docked: always. Floating: on demand. Sheet: at full snap |
| **Sheet tool strip** | Quick + one tile per section; one section's fields at a time | Phone / bottom-sheet mode only |

All three render the **same field schema** and the **same field controls**, and they write to the same values. Changing a value anywhere updates the widget preview live, and updates every surface.

---

## 3. Quick bar

A floating pill, centred at the top of the canvas area (`top:12px`). It belongs to the canvas, not the panel.

```
[icon  Name] │ [• Layout (Auto|Card|Compact|Simple)] [Accent ◉] [Style (Bars|Line|Mirror)] [Progress ⏽] │ [👁] [⚙ All settings]
  fixed          ───────────── scrolls horizontally if it can't fit ─────────────                         fixed
```

### Layout
- **Container**
  - bg `#17171b`, border `1px #2a2a31`, radius 12, height 46, padding `0 6px`.
  - Shadow `0 8px 24px rgba(0,0,0,.45)`, `max-width:100%`.
- **Three groups:**
  1. **Identity** (`flex:none`): a 28px icon tile (bg `#1f1f25`, accent icon), then the widget name (12.5/600).
  2. **Controls** (`flex:0 1 auto; min-width:0; overflow-x:auto`). This is the only part that scrolls. Never let it push the trailing group out of view.
  3. **Trailing** (`flex:none`): the visibility toggle, then "All settings" (floating mode only; active bg `#2a2a31` while the panel is open).
- 1px `#2a2a31` dividers sit between the groups.
- **When the floating panel is open**, the bar's right inset becomes `344px`, so the bar centres over the visible canvas.

### Control item
- `height:36px; padding:0 9px; radius 8; hover bg #1e1e24`.
- Contents: an optional 5px accent dot (shown when the value is changed), the label (11.5px `#9696a0`), then the compact control.

**Compact controls:**

| Type | Control |
|---|---|
| toggle | 30×18 switch |
| seg | Inline segmented; buttons `padding 4px 8px`, never truncated |
| slider | 80px range + mono value (min-width 36) |
| select | Native select, h26 |
| color | 22px swatch circle. Clicking opens the **swatch popover**: a row under the bar (`top:66px`, centred) with the label and the swatches. Clicking the canvas closes it. |
| text | 120px input |

### Pinning
- Each widget **type** has a default quick set. For example:
  - media: `layout, accent, wStyle, progress`
  - system: `mStyle, layout, accent, dTemps`
  - clock: `fmt, secs, accent`
- Every inspector field row has a **pin button** (`keep` icon, 15px):
  - Unpinned: `#4a4a52`.
  - Pinned: filled, accent `oklch(0.84 0.12 255)`.
- Toggling the pin adds or removes the key from the quick set **for that widget type**, in insertion order. Cap the set at 6 (keep the last 6).
- **Persist pins per widget type** in studio preferences, not per dashboard.
- With an empty set, the bar shows "Pin settings from the panel to show them here".
- The quick bar can be turned off with a preference (the prototype's `quickBar` tweak).

---

## 4. Inspector (one column)

The same component is used in all three placements. Top to bottom:

1. **Header**
   - 32px icon tile and the widget name (14/600). The custom title wins over the type name.
   - Sub line (11px `#8a8a94`): `Type · N changed`, or `Type · defaults`.
   - Visibility button.
   - Close button: `close` in floating mode; `close_fullscreen` → "Collapse" (goes to half snap) in sheet mode. There is no close button in docked mode.
2. **Search + Changed** (one row)
   - **Search input**: flex 1, h32, bg `#0c0c0e`, border `#24242a`, placeholder "Search all settings", ✕ to clear.
   - **Changed toggle** (`history` icon + "Changed" + mono count of own values):
     - Active: bg accent 16%, border accent 50%, fg `oklch(0.86 0.10 255)`.
3. **Tabs**: Content / Style / Data as a segmented pill.
   - Active tab: bg `#2a2a31`. Each tab shows a mono count pill of its changed values when the count is above 0.
   - **Hidden while search or Changed is active.**
4. **Filter line** (only while filtering)
   - "N matching settings", plus "(changed only)" when both filters apply.
   - Or "N changed settings", with a **Reset all** link when Changed is on and there is anything to reset.
5. **Body**: a vertical scroll of sections.

### Sections (accordion)
- **Header row**
  - Sticky at `top:0`, bg `#111114`, height 42 (48 in the sheet).
  - Contents: icon (17px `#7c7c86`), title (12.5/600), optional tab label (only while filtering), changed-count pill, and a chevron pushed to the right.
  - When the section has changes, a `restart_alt` button sits to the right of the header and resets that section only.
- **Default open state:** the first section of the tab is open.
- **Accordion mode** (preference; default **One open**): opening a section closes the others in the same tab. "Many open" toggles each section independently.
- **Collapsing is safe here.** It's one column, so nothing reflows sideways. That was the problem with the multi-column layouts.
- **While filtering:** every matching section is shown expanded, with its tab label and no chevron. Matching is case-insensitive:
  - If the **section title** matches, all its fields show.
  - Otherwise only fields whose **label** matches show.
  - Changed further limits the result to own values.
  - Search runs **across all tabs**.
- **Empty states**
  - Search: `No settings match "q".`
  - Changed: "Nothing changed yet. Everything uses its default."

### Field row
`[source dot] [label ……] [inline control] [pin]`
- min-height 30 (**44 in the sheet**), padding `3px 10px 3px 16px`.
- **Source dot**: 7px circle.
  - Changed: filled with accent and clickable (resets the field). Tooltip: "Changed. Click to reset".
  - Otherwise: a `#34343b` outline.
  - **Keep the app's existing multi-source semantics:** blue = set here, blue ring = overriding, violet = profile, teal = dashboard, amber ring = ignored. The prototype only models "here".
- **Label**: 12.5px. `#ededf0` when changed, `#c9c9cf` otherwise.

**Control placement:**

| Type | Placement |
|---|---|
| toggle | Inline 30×18 switch |
| select | Inline, max-width 150, h28 |
| slider | Inline: 90px range + mono value box (min-width 44) |
| color | Inline button with "Auto"/name + 18px swatch. Clicking expands an **inline swatch row** under the field (no popover) |
| seg with ≤3 options and every label ≤9 chars | Inline |
| seg, otherwise | Below the label, **one row** (`flex-wrap:nowrap; overflow-x:auto`, buttons `flex:1 1 auto; nowrap`). Never truncated, never wrapped onto a second line |
| text, url, code, icons, align, devices | Below the label, full width |

**Values:**
- Setting a value **equal to its default removes the override**, so it stops counting as changed.
- **Swatches:** Auto (split diagonal swatch), then the 6 accent hues (`oklch(0.72 0.15 H)` for H = 255, 295, 190, 150, 75, 15), then White. The selected swatch gets a `0 0 0 2px #111114, 0 0 0 4px #ededf0` ring. Keep the app's existing custom-colour picker as the last item.

---

## 5. Placement: automatic, by available width

`mode` is chosen from the **studio window width** (not the dashboard profile size):

| Width | Mode | Inspector | Quick bar |
|---|---|---|---|
| ≥ 1100px | **Docked** | Right side panel, 320px wide, `border-left:1px #1f1f24`, always visible | Yes |
| 640–1099px | **Floating** | Overlay card: `right/top/bottom:12px`, width 320, radius 12, border `#2a2a31`, shadow `0 16px 40px rgba(0,0,0,.5)`. **Closed by default** | Yes, with "All settings" |
| < 640px | **Bottom sheet** | §6 | No (the sheet's Quick tile replaces it) |

**Floating mode**
- Opens from "All settings" in the quick bar, or by **double-clicking a widget**.
- Closes with ✕, or when the selection is cleared.
- While it is open, the artboard fits into `canvasWidth − 348px`, so the selected widget is never hidden under the panel.

**Bar displays.** Bar profiles (e.g. 1920×480) were the reason for the old bottom dock. Floating mode covers them: the quick bar handles most edits and the artboard keeps the full width until the panel is opened.

**Artboard fitting** (all modes):
`scale = min(availW / profileW, availH / profileH)`, centred in the available area.
- Top inset: 72px when the quick bar is shown, otherwise 16.
- Sheet mode: the bottom inset equals `min(sheetHeight, halfHeight) + 14`, so the preview stays visible above the sheet at peek and half snap.

---

## 6. Bottom sheet (phone)

The sheet is anchored to the bottom edge, full width, radius `16px 16px 0 0`, border `#2a2a31`, shadow `0 -12px 32px rgba(0,0,0,.5)`.

**Snap heights** (relative to the canvas area height `H`):

| Snap | Height | Content |
|---|---|---|
| peek | 150px (96px with nothing selected) | Handle, compact header, tool strip |
| half | `max(320, round(H × 0.56))` | Plus the selected tool's fields |
| full | `H − 8` | The full inspector from §4 (search, Changed, tabs, accordion) |

**Handle**
- A 40×5 bar (`#3a3a42`) in a 24px hit row, `touch-action:none`.
- **Drag:** the height follows the pointer (clamped from 70 to full). On release it snaps to the nearest of the three heights.
- **Tap** (moved less than 4px): toggles between peek and half.
- The height animates with `0.28s cubic-bezier(.2,.8,.2,1)`, with no transition while dragging.

**Compact header** (peek and half)
- Icon tile, name, sub line.
- A 44×44 visibility button.
- A 44×44 `tune` button that jumps to full.

**Tool strip**
- A horizontal scroll of 72×60 tiles: icon (20px) plus short label (10.5/500).
  - First tile: **Quick** (`bolt`), the pinned set.
  - Then one tile per section across all tabs, in tab order. Each section needs a `short` label (Size, Colors, Type, Shape, Wave…).
- Active tile: border accent 60%, bg accent 14%. A 6px accent dot marks sections with changes.
- Tapping a tile selects it and moves the sheet from peek to half (from half it stays at half).

**Half snap body**
- The selected tool's fields, with no section header (the active tile says what you're looking at).
- Rows are 44px tall. Pins work here as well.

**Selection**
- Tap a widget to select it. Tapping empty canvas deselects and returns the sheet to peek.
- With nothing selected, the peek reads "Tap a widget to edit it."
- The active tool persists across selections when the new widget has that section; otherwise it falls back to Quick.

---

## 7. Canvas interactions

- **Click a widget:** select it. A 2px accent outline sits 5px outside the widget, scaled inversely to the artboard zoom so it stays 2 screen-px.
- **Hover:** 1px `#3a3a42` outline (screen px).
- **Double-click:** open all settings (floating panel open, or sheet to half).
- **Click empty canvas:**
  - If a colour popover is open, close only the popover.
  - Otherwise clear the selection, close the floating panel, reset the sheet to peek, and clear search and Changed.
- **Hidden widgets** stay editable. They show at 35% opacity with a dashed border and a `visibility_off` badge.
- Keep the existing multi-select, drag, resize and shortcuts. With a multi-selection:
  - The quick bar shows "N widgets" and only the pinned keys **shared** by all selected types.
  - Edits apply to all of them.

---

## 8. State

```ts
studioPrefs: {
  quickPins: Record<WidgetType, string[]>   // overrides WT[type].quick
  quickBar: boolean                          // default true
  accordion: 'one' | 'many'                  // default 'one'
}
inspectorUI: {                               // per session
  tab: 'content' | 'style' | 'data'
  open: Record<sectionId, boolean>
  query: string
  changedOnly: boolean
  colorOpen: string | null                   // `${surface}:${key}`, surface = q | i | s
  floatOpen: boolean
  sheet: { snap: 'peek' | 'half' | 'full', tool: 'quick' | sectionId, dragHeight: number | null }
}
```
**Derived:** `mode` from window width; `isOwn(key)` from the existing source resolution; per-tab and per-section own counts.

**Remove:**
- `cfg.dock` (Side / Bottom / Auto) and its toolbar cycle button.
- The bottom-dock layout code.
- The `activeSection` scroll-spy state from the previous handoff.

## 9. Schema additions

- **Section:** add `icon` (Material Symbols name) and `short` (one word, for sheet tiles).
- **Widget type:** add `quick: string[]` (default pinned keys; 3–4 per type).
- Fields are unchanged (toggle / seg / slider / select / color / text and the app's extra types).

## 10. Tokens

- **Backgrounds:** app `#0c0c0e`; panel `#111114`; floating surfaces `#17171b`; sunk `#0c0c0e`; control `#1a1a1f`; hover `#1e1e24`; active seg `#2a2a31`.
- **Lines:** `#1f1f24`, `#1c1c21`, `#24242a` (sunk border), `#2a2a31` (control border).
- **Text:** `#ededf0`, `#c9c9cf`, `#b4b4bc`, `#9696a0`, `#8a8a94`, `#6f6f79`.
- **Accent:** `oklch(0.72 0.15 255)`; accent fg `oklch(0.84 0.12 255)`; warn `oklch(0.78 0.15 75)`.
- **Fonts:** Geist (UI), Geist Mono (numbers), Material Symbols Rounded with the FILL axis 0..1 (needed for the filled pin).

## 11. QA checklist

- [ ] At 1440 the inspector is docked. At 1024 and 768 it floats and is closed by default. At 390 it is a bottom sheet.
- [ ] At 1024, with the longest quick set, "All settings" and visibility stay visible. Only the middle controls scroll.
- [ ] Pinning a field in the inspector adds it to the quick bar immediately. Unpinning removes it. Pins persist per widget type after a reload.
- [ ] Changing a value in the quick bar updates the inspector (dot, counts) and the preview, and the reverse.
- [ ] Setting a value back to its default clears its changed state.
- [ ] Changed shows only own values across all tabs. Reset all, section reset and dot reset each work.
- [ ] Search finds "glow" from the Content tab. Clearing it restores the tabs.
- [ ] One-open accordion: opening a section closes the others. No horizontal reflow anywhere.
- [ ] No segmented control truncates or wraps a single option onto its own line.
- [ ] Sheet: drag snaps to peek, half or full. A tap on the handle toggles peek and half. Tiles move the sheet from peek to half. All touch targets are at least 44px.
- [ ] Sheet: at peek and half, the selected widget stays visible above the sheet.
- [ ] A Bar profile (1920×480) on a 1024 window keeps full canvas width until the panel is opened.
- [ ] Widget card content never overflows its zone. Optional rows (e.g. waveform, times) drop out when the zone is too short.
