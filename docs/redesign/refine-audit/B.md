# Audit B: Settings, Help, kiosk as a whole screen

Shots read: all 15 `settings-1440-*`, 3 `settings-720-*`, 6 `help-*`, 5 `kiosk-*`. Settings mock artefacts (empty zoom selection, restart banner text, v1.0.0, mangled paths in About, empty Changelog) are ignored.

## 1. Critique

Keep: Settings and Help are the most coherent surfaces in the product. Near-black steps (`s-win` / `s-side` / `s-card`), one accent, 28-34px controls, hint text under every label, a status dot on Server, the Server stat tiles, the Help sidebar plus right-hand "On this page" rail, and the amber restart bar that is clearly distinct. The kiosk's zone rhythm is also good: the gap between header and panels and between panels holds at 12-14px at every size.

What holds it back:
1. **The kiosk header is the weakest part of every screen.** Its readouts truncate ("14...", "4..", "8..") at 1920x1080, 1280x800 and 1024x600, the bar scales its text with its height (about 61px type next to 13px widget text), and a fixed-size black island sits on top of it, repeating the time that the bar already shows.
2. **Settings has two page dialects.** Card pages (General, Server, Connections...) and flat-row pages (Dashboard, Studio) differ in column width (716 vs 560), group-heading style (12px muted vs 13px bold white), the way hints are shown (visible text vs `(i)` icons) and where the page title sits (x=480 vs x=350 on the "wide" pages).
3. **Help repeats itself and wastes measure.** "All topics" is the sidebar again, a search takes two input fields, and article lines run about 95 characters.

## 2. Suggestions (ranked)

### B-01 Status bar readouts truncate at 1920x1080, 1280x800 and 1024x600
- Where: `kiosk-1920x1080.png`, `kiosk-1280x800.png`, `kiosk-1024x600.png` (top right: "14...", "4..", "8..", "6..", "5."); `src/widgets/StatusBar/Bar.tsx:59` (`truncate`, `maxWidth: fs*18`), `src/widgets/StatusBar/layout.ts` (`FS_SHARE`, `barSize`).
- Now: values are cut to one or two characters while the same bar at 1920x480 shows "46%", "87%". Text size follows bar height, but the fit test does not make the values fit at that size, so ellipsis wins. The skill gotcha says metric labels must never tail-truncate.
- Suggest: (a) cap `fs` at 32px (`Math.min(32, ...)`) and `u` at 72px so a tall bar does not get 61px type; (b) make `fits` in `barSize` measure the value text and shrink or drop items by rank (`fitByRank`) before it ever ellipsises; (c) remove `truncate` from the numeric `Num` and keep it only for the IP string.
- Why: Waza Gotchas ("must never tail-truncate into an ellipsis"); ui-ux-pro-max `truncation-strategy`, `number-tabular`, `compact-label-overflow`.
- Impact: high   Effort: M   Risk: layout-at-other-spans (every Status Bar view)
- Kind: refinement   Prototype: yes

### B-02 The island is a fixed black pill that ignores the skin and the panel size
- Where: all five `kiosk-*.png` (top centre); `src/components/island/island-look.ts`, `island-model.ts` (`fitIslandSize`, `IDLE`).
- Now: it is about 365px wide at 800, 1024, 1280 and 1920, so at 800x480 it covers 45% of the width and pushes the bar down to the time and one stat. Its colour is `#000` with white text, against a purple/teal skin.
- Suggest: when the page is narrower than 1100px, step the idle size down one notch (width about 260px) in `fitIslandSize`. Default the idle surface to the skin's panel colour at 92% over the page, not `#000`, keeping 1px of the frame colour as an edge.
- Options: A) skin-tinted surface (recommended); B) keep black but add a 1px `--w-faint` ring so it reads as an object, not a hole; C) leave black, only shrink.
- Why: Waza "surfaces stepped by background"; ui-ux-pro-max `consistency`, `effects-match-style`.
- Impact: high   Effort: M   Risk: layout-at-other-spans (the Status Bar gap uses the island width via `gapWidth`)
- Kind: refinement   Prototype: yes

### B-03 The island and the bar both show the time (and the same CPU/GPU)
- Where: `kiosk-1920x480.png` (island "14:41:33 CPU 45.68 % GPU 87.36 %", bar "14:41" and "46% 87%"), `kiosk-800x480.png` ("14:41:43" and "14:41" plus CPU 62%).
- Now: the same information appears twice within 200px, once with seconds and once without.
- Suggest: when a Status Bar with a clock sits on the page, the default island idle becomes `date` only, or a rotating stat that is not in the bar. Set it in the default template or kiosk settings; the studio shows a one-line hint "Time is already in the status bar".
- Why: Waza "one job per element"; ui-ux-pro-max `data-density`.
- Impact: med   Effort: S   Risk: stored-settings (default only, existing profiles untouched)
- Kind: refinement   Prototype: no

### B-04 The outer frames touch the display edge
- Where: `kiosk-1920x1080.png`, `kiosk-1280x800.png` (the left panel and the status bar start at x=0, the bottom row at the last pixel; frame hairlines are cut off).
- Now: panels have a visible 1px frame and a radius, but page padding is 0, so the outer border and corners are half-clipped, and bezel overscan on a USB panel hides them entirely.
- Suggest: default `look.padding` to 8px (the template kit already has `padding`) and keep the gap at 12. For existing profiles show a one-click "Add 8px safe edge" in Screens.
- Options: A) 8px padding by default; B) padding 0 but drop the frame on edge-touching sides; C) leave and document.
- Why: ui-ux-pro-max `safe-area-awareness`, `fixed-element-offset`; Waza "no clipped frames".
- Impact: med   Effort: S   Risk: stored-settings
- Kind: refinement   Prototype: yes

### B-05 The bar is 16% of a 1080p screen and 25% of a 480p one
- Where: `kiosk-1920x1080.png` (170px bar), `kiosk-1280x800.png` (122px), `kiosk-800x480.png` (60px).
- Now: the header takes more height as the panel grows, while the content below is the cramped part (the audio card is mostly empty, the cores grid is 8 rows of tiny cells).
- Suggest: cap the Status Bar zone at `clamp(56px, 8vh, 96px)` in the default layout (rows share), giving the freed 70px to the panels at 1080p.
- Why: Waza dashboard rule (data first, chrome small); ui-ux-pro-max `visual-hierarchy`.
- Impact: med   Effort: M   Risk: layout-at-other-spans, stored-settings
- Kind: refinement   Prototype: yes

### B-06 Tall cells pin their content to one edge
- Where: `kiosk-1920x1080.png` (Audio: a 40px meter at the bottom of a 350px card, label top; Weather: reading in the middle of a 530px card, 250px empty above and below).
- Now: large voids inside bordered cards; the eye reads them as broken, not as calm.
- Suggest: for portrait cells (h > 1.4w) the Audio meter uses `flex-1` bars (`min-h 48px`, up to 160px) and Weather moves the temperature to the top third with the condition text under it. Widgets C and D own the detail; the screen-level rule is "no card with more than 50% empty".
- Why: Waza `design-data-viz` ("fill the cell"); ui-ux-pro-max `whitespace-balance`.
- Impact: med   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: no

### B-07 At 800x480 labels truncate to meaningless stubs
- Where: `kiosk-800x480.png` ("DEFAULT DE...", "BREVIK, NO...", "VRA... 11.6 GB").
- Now: caption text is tracked at 0.08em uppercase and cut by an ellipsis; the legend label "VRAM" loses its letters while its value stays.
- Suggest: below a 160px card width, set caption tracking to `0.04em`, drop the leading icon first, and let a legend row hide the label word (keep dot + value) before it clips. Never ellipsise a legend label.
- Why: Waza Gotchas; ui-ux-pro-max `compact-label-overflow`, `truncation-strategy`.
- Impact: med   Effort: M   Risk: layout-at-other-spans
- Kind: refinement   Prototype: no

### B-08 Settings pages jump: the title moves 130px between pages
- Where: `settings-1440-general.png` vs `settings-1440-logs.png` / `settings-1440-diagnostics.png` (title at x=480 vs x=350); `src/settings/app.tsx:28`, `src/settings/window-pages.tsx:110` (`wide ? 1040 : 780`, `mx-auto`).
- Now: Diagnostics and Logs centre a 1040px column, so switching from the sidebar moves the whole page left.
- Suggest: keep the heading block at the 780px column on every page (`max-w-[780px]`, left-aligned to the same x) and let the wide content extend to the right only: put the header and body in one 1040px container with the header `max-w-[780px]`. Same x for every title.
- Why: ui-ux-pro-max `navigation-consistency`, `container-width`; Waza App shell rules (stable content origin).
- Impact: high   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-09 Group headings come in two styles
- Where: `settings-1440-general.png` ("Zoom", "Setup": 12px regular muted) vs `settings-1440-dashboard.png` ("Startup screen", "Danger zone": 13px semibold white plus an 11px "Default for the app" suffix); `src/settings/ui.tsx:165` (`Group`).
- Now: one page looks like a form, the other like a list, with different weights for the same role. The suffix "Default for the app" repeats four times.
- Suggest: use the `Group` style everywhere (12px/500 `s-muted`, `mt-2`). Move the suffix to the page subtitle once ("Defaults for the app and every kiosk").
- Why: Waza "one text style per role"; ui-ux-pro-max `consistency`, `weight-hierarchy`.
- Impact: high   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-10 Dashboard and Studio pages should use the card layout
- Where: `settings-1440-dashboard.png`, `settings-1440-studio.png`; `src/settings/window-pages.tsx:48,58` (`max-w-[560px]`).
- Now: rows float on the bare background, controls end at x=1040 while card pages end at x=1196; the Studio page has 11 rows with no grouping or dividers.
- Suggest: wrap each group in `Card` with `Row` (hint visible, 56px rows, `divide-y s-divider`), drop the 560px clamp. Split Studio into "Canvas" (grid, rulers, default zoom, preview data) and "Panels" (quick bar, inspector sections, left panel width, widget list, preview on hover, advanced).
- Why: ui-ux-pro-max `field-grouping`, `progressive-disclosure`; Waza App shell rules.
- Impact: high   Effort: M   Risk: none
- Kind: refinement   Prototype: yes

### B-11 Twelve `(i)` icons where General shows its hint as text
- Where: `settings-1440-dashboard.png`, `settings-1440-studio.png` (an icon after most labels) vs `settings-1440-general.png` (visible hint).
- Now: the same information is a hover target on two pages and plain text on the rest; keyboard and touch users get less on the first two.
- Suggest: B-10's `Row` shows the hint as 12px `s-muted` text for every row whose hint is under about 90 characters; keep the icon only for long help linked to a Help article.
- Options: A) visible hints (recommended); B) keep icons, add a "Show hints" switch; C) icons only for rows with an article link.
- Why: ui-ux-pro-max `input-helper-text`, `hover-vs-tap`.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-12 "Releases on GitHub" reads like a broken link in the nav
- Where: every `settings-*.png`, sidebar bottom; `src/settings/nav.tsx`.
- Now: it is underlined, bright blue (`#6cb0ff`), brighter than the active item, and sits inside the "InfoPanel Studio" group.
- Suggest: render it as a normal `NavItem` (14px `s-t2`, no underline) with the external-link icon on the right edge, and keep the accent only for the active page.
- Why: Waza "one accent"; ui-ux-pro-max `nav-state-active`, `nav-hierarchy`.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-13 Connections: status as plain text, a quiet Save, a "None" password
- Where: `settings-1440-connections.png`, `settings-720-connections.png`; `src/settings/sections/connections.tsx`.
- Now: "Not set up" and "Signed out" are 11px muted text at the card's right edge; Save OBS is a neutral outline like Cancel would be; the password field shows the placeholder "None"; Host (190px) and Port (76px) sit in a loose row with labels 34px above.
- Suggest: (a) status as a pill with a dot (`--ui-ok` connected, `s-faint` not set up, `--ui-warn` error) like the Server dot; (b) `Save OBS` becomes `kind="accent"` while the form is dirty, disabled otherwise; (c) placeholder "Not set" or empty; (d) Host and Port in a 2-column grid `grid-cols-[1fr_96px] gap-2` with 6px label-to-field gap.
- Why: ui-ux-pro-max `primary-action`, `submit-feedback`, `color-not-decorative-only`; Waza "status colours are semantic".
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-14 Diagnostics: five equal buttons and an orphaned note
- Where: `settings-1440-diagnostics.png`, `settings-720-diagnostics.png`; `src/settings/sections/diagnostics.tsx:155`.
- Now: the debug toggle shares a card with five outline buttons that wrap raggedly at 720 (3 rows), and the "Widget QA and the InfoPanel lab..." note floats outside any card.
- Suggest: split into two cards: "Debug mode" (toggle plus the note as its hint) and "Tools" (a 2-column grid of buttons, equal width, `grid-cols-2`, with "Copy diagnostics summary" last and full-width). Make the empty state `border-solid s-card-line`, not dashed, and half as tall (min-h 120px).
- Why: ui-ux-pro-max `field-grouping`, `touch-spacing`; Waza "one primary per area".
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-15 Server header repeats the tiles
- Where: `settings-1440-server.png`: "On 127.0.0.1:4400 · up 1h 0m" directly above tiles "Address 127.0.0.1:4400" and "Uptime 1h 0m"; the "Kiosk" URL below shows the same address a third time.
- Suggest: the header's subtitle becomes the state sentence only ("Serving 2 clients"); keep the tiles. Memory tile gets a `Clients` tooltip-free label.
- Why: ui-ux-pro-max `data-density`; Waza "say it once".
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-16 The restart bar wraps at 720 and is shouting
- Where: `settings-720-*.png` ("Restart the server to apply: debug / mode off." over two lines, 60px tall); `src/settings/shell.tsx` (`RestartBar`), tokens `--color-s-bar-*`.
- Now: the bar is saturated amber across the full width and is the loudest element on every page, even after a harmless change.
- Suggest: shorter copy "Restart to apply: debug mode off", button label "Restart" when the window is under 800px (still "Restart server" in `aria-label`), bar height fixed at 44px; lower the fill to `oklch(0.22 0.04 75)` and keep the amber on the button only.
- Options: A) shorter copy plus the same colour; B) A plus the calmer fill; C) turn the bar into a 32px strip with a text button.
- Why: ui-ux-pro-max `toast-dismiss`/`primary-action`; Waza "one accent per screen".
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-17 The sidebar takes a third of a 720px window
- Where: `settings-720-*.png` (235px of 720), `help-720-*.png` (247px of 720; content 470px); `src/settings/tokens.css` (`@custom-variant rail`, `width < 700px`).
- Now: the icon rail only starts below 700px, so the common half-screen window gets the full sidebar and cramped pages.
- Suggest: raise the rail threshold to `width < 820px` for Settings and Help (the search field still expands it on focus).
- Why: ui-ux-pro-max `adaptive-navigation`, `breakpoint-consistency`.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-18 Help search shows two fields
- Where: `help-1440-search.png`, `help-720-search.png` (sidebar and page both hold "kiosk"); `src/help/ui/results-view.tsx`, `sidebar.tsx`.
- Now: typing in either field updates both; the sidebar field's focus state is a hard square blue box inside its rounded pill.
- Suggest: on the results view hide the page field and put the result count line at the top ("30 results for "kiosk"" at 15px, `mt-0`); put the focus ring on the pill (`focus-within:ring-1 ring-s-accent`) and set `outline-none` on the inner input.
- Why: ui-ux-pro-max `focus-states`, `consistency`; Waza "one input per job".
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-19 Help home repeats the sidebar
- Where: `help-1440-home.png` ("All topics" cards list the same titles in the same order as the left nav; the third row of cards is cut off); `src/help/ui/home-view.tsx`.
- Now: 30+ links twice on one screen, and the topic cards carry no new information.
- Suggest: replace each topic card's link list with one-line descriptions (the article summary field) for the first 3 articles, and a "See all N" link; or show a "Popular" row of 6 articles. Keep the 3 "Start here" cards.
- Why: ui-ux-pro-max `content-priority`, `progressive-disclosure`.
- Impact: med   Effort: M   Risk: none
- Kind: refinement   Prototype: no

### B-20 Help articles run about 95 characters per line
- Where: `help-1440-article.png` (text column 709px at 15px); `src/help/ui/article-view.tsx`.
- Now: prose is wider than the 60-75 character target while a 200px "On this page" rail sits unused beside it.
- Suggest: `max-w-[68ch]` on prose blocks (about 600px) and `leading-[1.65]`; tables and code blocks may stay full width.
- Why: ui-ux-pro-max `line-length-control` (60-75 desktop), `line-height`.
- Impact: med   Effort: S   Risk: none
- Kind: refinement   Prototype: yes

### B-21 Search snippets are flattened table text
- Where: `help-1440-search.png`, first result ("Setting Default Server port 3922 Kiosk URL http://... Data API port 3921 Copy it from...").
- Now: table cells are joined with spaces, so the snippet is unreadable; every result carries a tiny "Run" group label that looks like an action.
- Suggest: join table cells with " · " in `build.ts`/`search.ts` snippets; show the group as a 11px `s-dim` crumb above the title ("Run"); keep the Enter hint on the active result only.
- Why: ui-ux-pro-max `empty-states`/`search-accessible`; Waza "label what is a label".
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-22 Logs: INFO is accent blue
- Where: `settings-1440-logs.png`; `src/settings/sections/logs.tsx`.
- Now: every INFO line starts with a blue tag, so the one accent colour is spent on the most common, least important level.
- Suggest: INFO in `s-dim`, DEBUG in `s-faint`, WARN `--ui-warn`, ERROR `--ui-danger`; make the level tag 11px with a fixed 44px column.
- Why: ui-ux-pro-max `color-semantic`; Waza "status colours are semantic".
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-23 Settings text sizes sit off the shared scale
- Where: `src/settings/ui.tsx` (`text-[12.5px]`, `text-[13.5px]` in `Button`, `Segmented`, `Row`), `window-pages.tsx:110-112` (`text-[13.5px]`).
- Now: 12.5px and 13.5px sit between `text-caption` (12) and `text-body` (13).
- Suggest: map 12.5 to `text-caption` and 13.5 to `text-body`; page title `text-2xl` becomes `text-[22px]/1.2` at weight 600 (matches the 24px Studio view titles at their current size) or stays; the point is to use the tokens.
- Why: ui-ux-pro-max `font-scale`; Waza typography ("one scale").
- Impact: low   Effort: S   Risk: none
- Kind: refinement   Prototype: no

### B-24 Help home as task paths (direction)
- Where: `help-1440-home.png`.
- Now: Help is a reference index; the headline question is "How can we help?".
- Suggest: replace "All topics" with six task cards in the user's words ("My kiosk shows nothing", "Move a widget to another screen", "Import an InfoPanel profile", "Make it faster", "Back up my settings", "Connect OBS") each linking to the article and section anchor, with the topic index kept in the sidebar.
- Why: ui-ux-pro-max `content-priority`; Waza "utility mode: orient, show status, enable action".
- Impact: med   Effort: M   Risk: none
- Kind: direction   Prototype: no

### B-25 Island that follows the skin (direction)
- Where: `kiosk-*.png` (top centre), `src/components/island/island-look.ts`.
- Now: one black pill for every skin.
- Suggest: the island takes the page's skin tokens (surface, frame, accent) like a widget, with a `Surface: Auto | Black` choice in the Island inspector, so a light skin gets a light island and a glass skin a glass one.
- Why: ui-ux-pro-max `style-match`, `dark-mode-pairing`; Waza "skins set their own surface, frame and accent".
- Impact: med   Effort: L   Risk: stored-settings
- Kind: direction   Prototype: no

## 3. Cross-cutting

- One `Row`/`Card`/`Group` vocabulary for every Settings page (B-09, B-10, B-11, B-23): fixing it once in `src/settings/ui.tsx` removes the two-dialect problem.
- A single content origin for Settings and Help titles (B-08) and one rail threshold in `tokens.css` (B-17).
- Status as a dot plus words (B-13, Server, Updates) instead of free muted text; define one `StatusPill` primitive.
- Accent only for active, primary and focus (B-12, B-22, B-16); today it also colours links, INFO tags and nav links.
- Kiosk text fit: one rule "numbers never ellipsise; drop by rank first" shared by the Status Bar, legends (B-07) and captions.
- Page padding 0 (B-04) and the bar height share (B-05) are screen defaults, best set once in the default template and `fitIslandSize`.
