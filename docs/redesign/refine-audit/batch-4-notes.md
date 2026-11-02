# Batch 4: Settings and Help (B-08 to B-24)

Rows: B-08, B-09 + B-10 (one group), B-11 to B-24. Status is in `findings.json` / `findings.md`.
Screenshots (scratch server on a copy of `tests/fixtures/perf/data`; the Settings window runs on the mocked desktop bridge, so its yellow
restart bar and "v1.0.0" are the mock's): `scratchpad/refine/shots-b4/` (`settings-{1440,720}-<page>`, `help-{1440,720}-{home,article,search}`,
plus `help-*-search-pagefield`). Scripts: `b4-shots.mjs`, `b4-lib.mjs`, `b4-rail.mjs` in `scratchpad/refine/`. Before shots: `shots/settings-*`, `help-*`.

## Shared change: store-free kit
`src/settings/kit.tsx` (new) holds the controls and rows that need nothing from the store: `Button`, `Switch`, `Segmented`, `Group`, `Card`, `Row`,
`SwitchRow`, new `SelectRow`, new `PageColumn`. `ui.tsx` re-exports them (sections keep importing `../ui`). `found.ts` (new) holds `useFound` and its
context; `StoreProvider` supplies it, `store.tsx` re-exports `useFound`. Reason: the browser tab's Settings has no store and must not load
`@tauri-apps/api` (`window-desktop.tsx` says so), but Dashboard and Studio now draw with `Row`/`Card`.

## B-08 title stays put (`kit.tsx` `PageColumn`, used by `window-pages.tsx` `WindowMain` and `app.tsx`)
Prototype approach: every page has the same 1040px centred column; the title block is capped at 780px; a page that is not wide caps its body at 780px.
The title is at x=350 on every page at 1440 (General, Server, Connections, Diagnostics, Logs, Dashboard, Studio). 720: unchanged.
Decision on the prototype's note (narrow pages sit left of centre in a wide window): kept. The audit's alternative (centred 780 and wide pages extending
right) does not fit: 212px + 1040px is wider than the 1204px pane at 1440. The cost is a 260px right gutter on narrow pages at 1440; the benefit is that the
title never moves when the sidebar is used, which is what the row is about. The 14px of title/subtitle text is also a fixed line length.

## B-09 + B-10 group headings and card layout (reverses the first audit's FND-102)
- `components/studio/settings-dashboard.tsx` and `settings-studio.tsx` are now `Group` (12px medium muted heading) over a `Card` of `Row`s, using `kit`.
  The 560px clamps are gone (`window-pages.tsx`). `settings-group.tsx` is deleted (`SettingsGroup`, and its `ReadRow`, which nothing used).
- Studio is split into Canvas (grid, rulers, default zoom, design preview data) and Panels (quick bar, inspector sections, advanced settings, left panel
  width, widget list, preview on hover). `data-nav-section` ids are now `canvas` and `panels` (`Group navSection`); `model/search.ts`
  `PREFERENCES_INDEX` and `commands.ts` (palette "Settings › Studio › Panels") follow; "Design preview data" is now searchable.
- The "Default for the app" suffix: kept as meaning in the page subtitles (`window-pages.tsx`): Dashboard "Defaults for the app and every kiosk. A change
  is saved and shows on the kiosks at once."; Studio "...saved with the Studio on this device, not in your dashboard." (that was the Editor group's note).
  "and the island" moved into the Clock row's hint. The "Screens ↗" line is now a row (Frame rate, animations and rendering / Screens button).
  Danger zone is a card with a `danger` Button (new kind in `kit.tsx`).
- FND-102 in the first audit (`design-audit/findings.{json,md}`, `batch-7-notes.md`) said Dashboard and Studio keep the inspector rows on purpose;
  each now says it was reversed here.
- Test: `tests/components/studio/settings-dashboard.dom.test.tsx` finds the select by `getByRole("combobox", { name })` instead of `getByLabelText`
  (the `Row`'s group is also labelled by its title, so the label query matched two elements); same assertions.

## B-11 visible hints
Dashboard and Studio rows show their hints as 12px muted text (`Row`), no (i) popovers. Connections' blocks still use the inspector `StackRow` hint icon
(Password, Mic input, Client secret); not in the row's `where`, left.

## B-12 Releases link
Cause: `settings.css` and `window.css` set `a { color; underline }` unlayered, which beat the link's own `text-s-t2 no-underline`. Both rules are now in
`@layer base`, so utilities win. The link is a normal nav row. The icon stays on the left (the rail shows only the icon, and the other rows' icons are
on the left); the audit's right-edge icon was not done.

## B-13 Connections (`components/connections/*`)
- New `connection-status.tsx` (`ConnectionStatus`): pill with a dot (ok `s-green`, idle `s-faint`, warn `s-amber`) and the text; used by OBS, Twitch, YouTube.
- OBS: Save OBS is the accent button while the form holds a change (host, port, password, mic, scene looks, or nothing saved yet), neutral otherwise;
  password placeholder "Not set"; Host and Port are a `grid-cols-[1fr_96px] gap-2` with their label 6px above the field.
- Not done: Save is **not** disabled when clean, because `tests/settings/connections.dom.test.tsx` ("keeps saved looks while OBS is closed") clicks Save on an
  unchanged form and a re-save is harmless. Say if you want it disabled and that test changed.

## B-14 Diagnostics (`sections/diagnostics.tsx`)
Two groups: Debug (one `SwitchRow` with the QA/lab note folded into its hint while debug is not running) and Tools (2-column grid of equal buttons, Copy
diagnostics summary full width last; Widget QA and InfoPanel lab rows join the Tools card when debug is running). The empty state is a solid
`s-card-line` box, min-h 120px, 24px icon.

## B-15 Server header (`sections/server.tsx`)
The line under "Server running" says "Serving N clients" (or "No clients connected", or "The kiosk and studio load from it" before stats arrive),
plus "· started by another program". Address and uptime stay in the tiles. `serverCard().detail` (in `model/cards.ts`, tested) is untouched. The audit's
last sentence (a "Clients tooltip-free label" on the Memory tile) was unclear and is not done.

## B-16 restart bar (`shell.tsx`, `model/restart.ts`, `tokens.css`)
Option B: copy "Restart to apply: debug mode off." (`restartText`), 44px bar (`min-h-11`, so a long list of changes wraps instead of clipping), fill `oklch(0.22 0.04 75)` and line `oklch(0.34 0.06 75)`; the button reads
"Restart" under 800px with `aria-label="Restart server"`. Tests updated for the copy: `tests/settings/model/restart.test.ts` (2 expected strings) and
`tests/settings/settings-app.dom.test.tsx` (the negative query now looks for the new text, so it still proves the bar is absent).

## B-17 rail threshold (`tokens.css`)
`rail` variant now starts under 820px. Found while checking: in the rail the search input was `display:none`, so it could not be focused (Ctrl K and clicks
did nothing), which the audit assumed worked. `app-window/search-box.tsx`: in the rail the input is invisible over the icon (`rail:absolute inset-0 opacity-0`),
so focus opens the sidebar. Checked at 720: click and Ctrl K focus it and the sidebar goes 56 -> 248px. Help and Settings share it.

## B-18 Help search (`help/ui/home-view.tsx`, `results-view.tsx`, `search-box.tsx`)
Results view: the page field is `sr-only` unless it has focus (it stays mounted so focus and caret survive typing on Home, which a test holds); the count line is
one 15px line "30 results for “kiosk”" (the h1 still reads "30 results"). The pill takes the focus ring (`focus-within:ring-1 ring-s-accent`) and the inner
input has `outline-none!` (the unlayered global `:focus-visible` rule beat the utility): both the sidebar box and the page field.

## B-19 and B-24 Help home
"All topics" is replaced by "Common tasks": six cards (`help/tasks.ts`), each opening an article at a heading: My kiosk shows nothing (problems), Move a widget
to another page (zones#widget-actions), Import an InfoPanel profile (import#the-infopanel-import-flow), Make it faster (performance#choosing-a-setting), Back up
my settings (import#export-back-up), Connect OBS (connections#obs). "Move a widget to another screen" would have been wrong: the app moves a widget to another
page ("Move to page"); the card says page. The three Start here cards stay. Every article stays reachable: the sidebar, search, and a collapsed "All topics"
disclosure on Home with the old grouped list (the sidebar is icons only below 820px). `check.ts` `checkTasks` holds each task to a real article and heading;
tests `tests/help/tasks.test.ts`, and in `help.dom.test.tsx` a task click and the disclosure. The content check (`content.test.ts`) is unchanged and green.

## B-20 article measure (`help/ui/blocks.tsx`, `article-view.tsx`)
`max-w-[68ch]` on paragraphs, lists, callouts and the lede; paragraphs `leading-[1.65]`. Tables, key lists, flows and buttons keep the full column.

## B-21 search snippets (`help/search.ts`)
Table cells join with " · " (the index text too; word matching is unchanged). The group is an 11px crumb above the title; "Enter opens this" shows on the first
result only. Test in `tests/help/search.test.ts`. The "…" at the end of a snippet is the existing 110-character cut, not CSS truncation.

## B-22 logs (`sections/logs.tsx`)
INFO tag and chip dot `s-dim`, DEBUG chip dot `s-faint`; WARN amber and ERROR red as before; the tag column is `w-11` and the rows align on the baseline.
DEBUG's tag stays `s-dim`: `s-faint` is for icons only (tokens.css), so INFO and DEBUG tags look alike; the debug message is already dimmer.

## B-23 type scale
In `src/settings` every `text-[12.5px]` is `text-caption` and `text-[13.5px]` is `text-body` (the changelog `.notes li` uses `var(--text-body)`). Page title stays `text-2xl`.
Row labels, hints, buttons and segments are 0.5px smaller, so a few hints wrap one word earlier; look at General, Updates and Touch.

## Look at in the screenshots
Settings 1440 and 720: General, Dashboard, Studio (cards, the title at one x), Connections (pills, accent Save, grid), Diagnostics (two groups), Logs (levels),
Server (header), the restart bar on every page, the rail at 720. Help: Home (tasks, All topics), search (one count line, no page field), article (column width).

## Uncertain
- The 260px right gutter of narrow pages at 1440 (B-08).
- A restart bar with several items wraps (min height 44px); not looked at with five items.
- No text tail-truncates in the after shots; Settings rows wrap instead. The Help search snippets end in "…" by design (above).
