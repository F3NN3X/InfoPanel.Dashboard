# Redesign decisions

Answers to the open questions in `docs/settings-inventory.md` §8 and the plan review. Where the
spec and the code disagree, the rule is **no feature loss**: keep what the code offers, and place
it where the spec says.

| # | Question | Decision |
|---|---|---|
| 1 | Per-widget `preset` quick look | S › Colors & surface, next to Surface. Not in Global style. |
| 2 | `layout` on non-adaptive widgets | Keep it on all 11 modern widgets (S › Size & alignment). |
| 3 | Audio / Wave Link `source` | C › Content, as FEATURE_MAP says; also listed under D › Bound data (derived). |
| 4 | Meter colour pickers inside a Content group | Stay in C › Meter, marked Advanced. |
| 5 | Web Page style | Keep its existing keys in their normal sections; no new `customCss`. |
| 6 | Panel `css` and legacy panel fields | Code view only, as today. |
| 7 | Theme tokens without an editor row | Unchanged (no row). |
| 8 | Which theme tokens are Advanced | background, foreground, card, card-foreground, primary, accent visible; the rest Advanced. |
| 9 | Zone frame on panels | Kept under S › Border & effects › Zone frame (Advanced). |
| 10 | Follow vs edit | Spec wins: editing a look field while on Follow switches the widget to Custom; the Follow banner warns. Rows are no longer locked. |
| 11 | `glowColor` visibility | Visible only when glow ≠ none. |
| 12 | `sourcePrefs` | Kept in Sources mode with today's behaviour. |
| 13 | Hide when idle | Only the five idle-capable widgets. |
| 14 | Magic wand | Not built. The only wand today is the Auto dock-mode icon; the zoom bar's dock button covers Auto. |
| 15 | Inspector position | Stays a browser preference (`studio.layout`), shown in Dashboard › General › Studio and the zoom-bar dock button. |
| — | Save | Auto-push stays; Save flushes; its dot means "edits not pushed yet". |
| — | Undo cap | Stays 100. |
| — | Fonts | Google Fonts: Geist / Geist Mono for chrome; catalog in `src/lib/fonts.ts`, loaded on demand. |
| — | Bottom dock | The left panel stays separate; the drawer no longer becomes a dock column. |
| — | Undo on profile switch | History stays whole-config; switching profile does not clear it (a switch is itself an undo step). |
| 16 | Live value per source in the Explorer tree | Not shown. Sources show a point count and a health dot; live values are per point in the table and point inspector (a value per tree row would re-render the tree on every sample and most sources have no single representative value). |
| 17 | Short toggles paired two to a line | Not restored: one field per row, as the spec's field rows. |
| 18 | Narrow windows | When the left panel does not fit beside a 420px canvas (and a side inspector), it floats over the canvas as a drawer instead of scrolling the studio sideways. |
| 19 | `--ui-text-4` | `#85858f` instead of the spec's `#7c7c86`, so faint labels reach 4.5:1 on every chrome surface. |
| 20 | Side inspector collapse | A collapse tab at 50% opacity on the inspector's left edge (not in the prototype), and a 20px strip to expand it again; Ctrl+\ collapses both placements. |
| 21 | Inspector default mode | Auto (Side, or Bottom for a profile wider than 2.5 : 1) rather than the prototype's fixed Side. |
| 22 | Endpoints popover copy | Copies the full URL, not the path the row shows. |
| 23 | Bottom-dock header | Header and the placement fields stay on one row in the dock, to save height. |
| 24 | Inspector simplifications not taken | Kept as real settings: background Position / Tint / Blur stay visible (no model change), gradient and Fill rows, the overlay Dark scrim (no Dim slider), number inputs for panel Gap / Padding / Columns, the Font select and Clock Locale option, the full preset preview swatches, and the "Show advanced colors" button (#8). |
