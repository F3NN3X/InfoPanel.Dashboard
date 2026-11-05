# Questions for Gate 0

The 12 pending proposals need a yes or no first; the numbered questions follow. Each number gives a recommended answer.

## Pending proposals

| ID | Proposal | Related questions |
|---|---|---|
| P-1 | Autosave with no Save button in the editor | 3, 20 |
| P-2 | Auto as the default alert style | 32 |
| P-3 | Gauge draft saved to the library at once | 37 |
| P-4 | Alerts Defaults as a dialog, Active now on top | 35 |
| P-5 | Theme vocabulary; template looks move to New screen | 43 |
| P-6 | Units, Thresholds, Motion and CSS leave the Theme page | 10 |
| P-7 | Page theme edited only on the Theme page | 29, 43 |
| P-8 | Widget Theme select lists all themes | none |
| P-9 | Theme pack part toggles per level | none |
| P-10 | Keep my background persisted per level | 45 |
| P-11 | Remove the floating quick-settings bar and selection chip | 19 |
| P-12 | Remove the Made for / export check header | 21 |

## Shell, Screens, Data, Library

1. Where does "Edit" go? Today it is a rail item (`left-rail.tsx:18`) and is also where Library drags land (`library-page.tsx:714-725`) and where "Open kiosk view" and links return. The mockup reaches it only by opening a screen. Why it matters: with no Edit item, the last-edited screen, the Library drag-onto-canvas flow and the phone bar's Edit tab (`phone-tab-bar.tsx:8`) lose their entry. Recommended: keep a "Continue editing <screen>" row under Screens (or a split "Edit" item), and make Library's drag overlay open the last edited screen.

2. Who draws the desktop window title bar on workspace pages? The header is the Tauri drag region and holds the caption buttons (`studio-top-bar.tsx:148,218`). Why: with no header there, the window cannot be dragged or closed from the shell. Recommended: a 32-40 px frameless strip above the sidebar and page header (drag region + `WindowControls`) on every page; the editor top bar keeps its own.

3. Where do the footer's items go: "Update X available", "Restart server to apply", "Offline . edits kept locally", server phase and LAN flag, and the browser's "App settings live in the desktop app" note (`status-bar.tsx:60-120`, `use-status-bar.ts`)? Why: these tell users the server needs a restart or an update; the Data API popover only shows "Studio server 127.0.0.1:47911". Recommended: a small attention row in the sidebar footer above the Data API card (update and restart as amber items), the server and LAN lines in the popover, and "offline edits kept locally" in the editor top bar next to Saved. (P-1)

4. Ctrl+K is the command palette today; the Screens mockup draws "Search Ctrl K" for the screens list. Which one wins on Screens? Why: two meanings for one key. Recommended: Ctrl+K stays the palette everywhere; the Screens field is a filter with `/` or Ctrl+F, and shows no Ctrl K hint.

5. What does the sidebar's "Help and shortcuts" do? Today Help opens its own window at the article for the current view (F1), and the shortcut sheet opens only with `?` (`use-studio-shortcuts.ts:168`). Recommended: a small menu with "Help" (opens the article for this view), "Keyboard shortcuts" (the sheet) and "Show Ctrl+, Settings". (D-12)

6. Is a phone/narrow form of the sidebar in scope? Today windows < 600 px get a bottom tab bar (`phone-tab-bar.tsx`) and < 960 px a 48 px rail. Mockups are 1600x900 only. Recommended: keep the phone bar with renamed items (Theme, Data sources) and let the sidebar default to the rail below 960 px.

7. Where do the Live popover's runtime controls go: Dim screens, Mute alerts for 1 h, Dynamic Island toggle, Reload all kiosks, Open kiosk view (`live-popover.tsx:115-178`)? The mockup display card menu has Reload display and rotation only. Why: they are runtime controls with no other UI (Stream Deck aside). Recommended: keep them on the display card (menu: Dim, Island, Reload display / Reload all) and a global "Mute alerts for 1 h" in Alerts & Island; "Open kiosk view" in the Screens header or the sidebar footer.

8. B4: do we drop the `slow` state (ping > 300 ms) and the "try 2 of 5" counter? Today there are three states: connected, slow, unreachable (`lib/data-api.ts:53-70`); the mockup has connected, reconnecting, offline. EventSource retries by itself, so "try N of 5" has no basis. Also, who owns the 10 s grace: it must be studio-only (G7). Recommended: keep `slow` as a note in the connected state ("Connected . 640 ms", amber text), implement reconnecting/offline in `use-status-bar.ts` with a 10 s timer, drop the try counter and show "Reconnecting . 3 s". (B4, D-6a)

9. What exactly is a "display" on the Live column? The server knows kiosks (id, screen, page, address, since, optional display name) and named displays (screen assignment only). Size and connection type are not reported; page is per screen; rotation is per screen. Why: the card in `01a` promises per-display page, rotation and size. Recommended: build the card from kiosks (merge named displays), show size from the kiosk's window if the kiosk reports it (small server addition, ask first), keep the switcher as screen only plus a page select acting on the screen (as Live does today), and rotation as the screen's toggle labelled for that screen.

10. Where does Screen settings open from? The mockup card menu has Edit screen, Show on a display..., Duplicate, Export .infopanel, Delete only. The spec says "open it from the card menu and the Theme links", but the code's detail is a right panel opened by selecting a card (`screen-detail.tsx:135`). Recommended: add "Screen settings..." to the card menu and keep the detail as a drawer or page; keep click-to-select off the grid since the mockup has no detail column. (P-6)

11. Keep the Show filter (All / Studio / InfoPanel) on Screens (`screens-toolbar.tsx:68-83`)? Also two Import buttons (generic and ".infopanel")? Recommended: keep the kind filter as a segmented in the "Your screens" header only when an InfoPanel screen exists; fold the second Import into the Import dialog (it already has `prefer: "canvas-zone"`).

12. Where does "Saved in your Library" (saved InfoPanel profiles, `screens-view.tsx:240-249`) go? Not drawn. Recommended: a second section under Your screens, or a "From library" entry in the New screen card.

13. Keep the source health chips (healthy / no data / offline) and the "Filter sources" field in Data (`source-tree.tsx:97-118`)? The mockup shows neither. Recommended: keep both in the left column under the source list (chip row is the only way to find broken sources); the live dots stay.

14. Keep source/container "Hide in dashboard" and "Rename..." (`source-tree.tsx:76-87`) and the group summary card (`group-summary.tsx`)? Neither is in the checklist or mockup, and they write `config.sourcePrefs`. Recommended: keep as a row hover menu in the source list and show the group summary as the detail pane when a source or group is selected and no point is. (G1)

15. B5: what is the one source of truth for "650+ vs 315"? The picker literal (`data-picker.tsx:60`) is a string, but the real picker may list more entries (module-level points) than the Data model. Need you to say whether the picker should count only catalog sensors. Recommended: derive both from `buildDataModel(...).points.length` (`sources-panel.tsx:77`) and drop the literal.

16. 60 s history: ok to keep a page-lifetime ring buffer (60 samples at 1 Hz, for visible keys only) in the studio chunk, started when the studio opens (not only when Data is open), so charts are filled on arrival? Today history exists only while the Data view is mounted (`data-live.ts:25`). Recommended: yes, one shared `SampleHistory` held by the studio view, paused when `document.hidden`, bounded to rows in view plus the selected point. (Phase 4 note)

17. "Create alert" and "Use in a widget..." in point detail have no matching code beyond "Bind" and "New widget from this value". Should "Create alert" open Alerts with the sensor preselected (needs `navigateTo` target and a rule from a point)? Recommended: yes, as a link only (no alert config written from Data); "Use in a widget..." = today's bind select plus New widget.

18. Sidebar collapse state: stored locally per area (editor vs workspace), as a `useStoredFlag` pref (not config)? D-8 says remembered. Recommended: two local flags; first-time editor default collapsed; no config key (G1).

## Editor

19. (P-11) The mockup keeps a name+size+menu label on the selection, while P-11 says remove the selection chip and quick bar. Is the label a restyled chip (Change widget, Hide, More menu kept), and if the quick bar goes, what happens to the pins pref, the Settings "Quick bar" switch, the pin buttons in inspector rows, the phone sheet's Quick tool and the narrow-window "All settings" opener? Recommend: keep a restyled label with the name button (Change widget), hide and ⋯ menu; remove the bar and pin buttons; remove the Settings switch; keep the pref keys untouched.

20. (P-1) The studio already autosaves 400 ms after an edit; the Save button only flushes early and shows a dot. Confirm that P-1 means relabel/remove the button and show "Saved · live on N displays", keep Ctrl+S and the tab-hide/quit flushes, and that offline, "newer config" (refused) and "remote edits refused" states get a place in the top bar chip. Recommend yes, with the chip turning amber/red and a reason tooltip for those three states.

21. (P-12, B-banner) Where does the Made for choice go (File menu radio, Screen settings, the banner)? It is a saved `madeFor` field that also hides the Export check, badges and On InfoPanel lines. Also, the problems banner ("cut off at the edge") has no model: should it be built (what counts as a problem, for all screens or only InfoPanel-too ones) or limited to the Export check? Recommend: Made for as a radio pair at the top of the File menu (or Screen settings), banner limited to Export check problems on InfoPanel-too screens at first.

22. (E4) File menu contents: the code has Import door, "Export & back up" sheet (back up everything, export this screen, export a page for InfoPanel, export a gauge, Copy JSON) and an experimental Convert. The mockup lists Import into this screen, Export .infopanel, Export as JSON, Version history. Version history does not exist. Recommend: File menu = Import…, Export & back up… (opens the existing sheet), Export .infopanel (with blocked reason), Convert… (experimental); drop Version history until a store exists.

23. (E5, A26) Live controls (open kiosk view, show on kiosks page select, rotation, dim screens, mute alerts 1 h, Dynamic Island toggle) and the status bar's Server, Update and "Restart server" items have no home in the mockup. Recommend: Live controls move to the Screens display cards/popover; Server/Update/Restart go in the Data API popover or sidebar footer; confirm with the shell you.

24. (D-5, E27) The Preset row in the mockup is for widget views. The code also has saved looks (Start from a saved look, Save look, Make this the Look for…, `stylePresets`). Should "Save as preset" create a saved look, or a new view-preset concept? Recommend: Preset row = the widget's views (read `settings[viewKey]`); keep the saved-looks toolbar under Style, renamed "Saved themes/styles" per D-13.

25. (Preview) What does the top-bar "Preview" button do (open kiosk view, freeze data, full-screen canvas)? Recommend: "Open kiosk view" (the existing Live action), with the F freeze keys unchanged.

26. (E22) The mockup's Style tab has a per-section "Advanced" accordion; today Advanced is one global preference that also unlocks rows the theme controls. Keep the global pref (and Settings row, palette entry) or make it per tab? Recommend: keep the global pref, show it as the accordion's default state.

27. (E1, A1) Keep the KindTag ("Imported from InfoPanel / Screen") and a screen rename pencil in the editor breadcrumb? Rename exists only in Screens today. Recommend: add the pencil (existing action), drop the tag into the breadcrumb tooltip.

28. (B6, A9) The mockup only shows the wide docked layout. Confirm the floating inspector (narrow window), bottom sheet and phone tab bar stay as they are and are only restyled, and that the left panel gets a persisted open/closed state (today it resets by window width) with default width 272 px replacing 300/340/380 (Settings › Left panel width). Recommend: keep the three modes; persist the panel state; keep the width setting with new values 272/300/340.

29. (P-7) The page inspector already links to Theme ("Edit in Theme ↗", per-section chips with Reset, `page-inspector.tsx:206-230`). Confirm P-7 only removes the "Change a section…" link and the Look row, not the Reset chips. Recommend: keep chips (they are reset controls), drop the duplicated link.

30. (A25, D-13) Strings that say Look in the editor and palette ("Look", "Apply look", "Make this the Look for…", "Look knobs"). Rename in Phase 8 with the copy pass or in Phase 3? Recommend: Phase 3 for the editor's own surfaces, palette in Phase 7.

31. (E8) Layer controls leave the inspector (Ask in the checklist): the group inspector and item inspectors host them today. Confirm removing "In group" and the four Layer buttons from all three inspectors (zone, group, canvas item); the same actions stay in the layer menu and keys. Recommend yes.

## Alerts, Island, Gauges, Theme

32. (P-2, B2) Auto style default: should an existing rule with no `outputs.display.style` change behaviour (it follows `alerts.defaults.style`, today "toast")? Why it matters: `display_of` (`alerts_engine.rs:149`) and `DEFAULT_ALERT_DISPLAY` (`alerts.ts:152`) both default to toast, and frozen parity fixtures depend on it. Recommend: add "auto" as a value, make it the default for new rules/new configs only, keep stored rules and defaults untouched, and resolve Auto at fire time in the server by severity and whether the target screen has an island.

33. (B1) Is the "one alert per screen, others queue in the island" rule meant for all styles, or only when an island exists? Today a slot stacks up to 3 with "+N more" (`alert-model.ts:4`). Recommend: one at a time only for island-less screens' toasts/banners (queue behind the visible one), keep overlay as is; confirm before changing the kiosk layer.

34. (Alerts chart) The 5-minute chart has no data source (no sensor-history endpoint). Recommend: buffer client-side in the studio from the live SSE for the rule's sensor (starts empty, fills while the editor is open) as a first version; add a server ring buffer only if you wants history on open. Which?

35. (P-4, History) The mockup's History columns (Value, Shown as, Screens, Replaced, Cleared duration, include-tests) need new fields on history entries and an export. Recommend: add `value`, `shownAs`, `profiles`, `replacedBy` to the entry (additive, older readers ignore), show last 200 (not 50), Export CSV client-side from the fetched list.

36. (L48) Fold corners: which store wins for the single Corners control, the widget `radius` knob (px steps) or the screen `radius` (rem)? Recommend: one control that writes both from the same px value (screen rem = px/16) and reads the screen value, so existing configs round-trip with no migration; keep Base corners' 0-24 px range.

37. (P-3) Draft autosave: library items created on "Customise a copy" will accumulate. Recommend: create the draft on the first edit (not on click), name it "<preset> copy", and show a "Draft" chip until the user saves or deletes it; add a "Discard draft" action since the leave dialog goes away.

38. (B3) "On your screens" should list every profile and page, and Widget rings. Rings have no reader: they are a setting of widgets (e.g. `GpuRings`). Which widget kinds count as "rings" and what does "Open widget" open (the editor with the zone selected, as `island-tab.tsx:156` does)? Recommend: list canvas gauges and Custom gauge widgets from `config.profiles[].pages[]` now; add rings as a second step with a short fixed kind list.

39. (Gauges editor) Colour zones "follow alert thresholds" and "Live: <sensor>" need a sensor binding the editor does not have. Recommend: a preview-only sensor picker (not saved), zones read-only from the first alert rule that watches that sensor key, no writing to alert config (per the brief); keep Fill's own Warning/Critical numbers as the fallback. Also: keep the "Save as new" button (`editor-header.tsx:81-85`)? Recommend yes, in the Export/Save menu.

40. (A1) "Alerts on": a header toggle on every tab, or only on the Alerts tab? It governs rules only (`alerts-rules.tsx:241`). Recommend Alerts tab only.

41. (T6) Where does the Background picker live? Today: theme card "Background" row opens the picker (This theme's, Solid, Gradient, Image, Video via `BackgroundEditor`). The mockup has only "Keep my background". Recommend: a "Background" row under In this theme that opens the same picker (ASK).

42. (Browse) The gallery has no pack-vs-plain flag; Packs 12 / Plain 14 needs one. Recommend: derive it from the look module (a pack ships stage/effects/parts) in `look-gallery-model.ts`, no stored data.

43. (T14, P-5/P-7) Saved palettes picker has no home in the mockup, nor "Saved looks" actions beyond "Yours". Recommend: Colours section keeps a "Palettes..." link opening `PalettePicker`; saved looks appear in Yours with the card menu.

44. (T20) The pack validation report is shown only at import (`user-packs.tsx:51,103-117`). The mockup's Yours card shows "1 warning" and a detail pane report "checked again every time it loads". Recommend: re-run `checkImport` on pack load (it is cheap without CSS) and keep warnings in a client map; no stored data.

45. (P-10) Keep my background "per level, persisted": per-screen key in config (bump) or a UI preference? Recommend UI preference keyed by screen id in localStorage (no G1 impact), not exported.

46. (Alerts undo) The spec says "Alerts never enter undo (unchanged)", but rule, island and default edits are config edits and each is an undo step today (`alerts-rules.tsx:208,241`; `alerts-view.tsx:78`). Recommend: keep rule edits undoable (the code is the truth) and fix the spec line.

47. (A21) "Edit rule" is a sub-view with Back today; the mockup is master-detail with the first rule selected. Recommend: keep `alertRule` as the selected id, default to the first rule, and keep "Back" only on narrow widths.

48. (B5, noted outside my area) "Last fired now ago" comes from `ageText` returning "now" (`alerts-model.ts:127`) used in `alerts-rules.tsx:175`. Recommend: render "Last fired just now" when `s < 5`; owned by the cross-cutting B5 task.
