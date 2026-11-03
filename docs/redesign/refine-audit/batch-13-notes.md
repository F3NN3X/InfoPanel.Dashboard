# Batch 13

## 13a (A-18 finished, WebPage QA page, PageThumb boundary, small leftovers)

Screenshots: `scratchpad\refine\shots\b13\` (`before-*` is HEAD, `after-*` is the working tree): Data, Help home and an article, Settings About, Logs and Server.

### A-18 fixed
Literals 120 to 4 (`MAX_LITERALS` 4), `text-[Npx]` in the studio 54 to 1 (`MAX_ARBITRARY_TEXT` 1), both in `tests/components/color-literals.test.ts`.
- Tokens, each at the exact value it replaces (no light value: none of these families has one, the studio and Settings are dark only). `src/index.css` (`ui-*`, studio): `ui-strong-text` #d4d4da, `ui-glyph-off` #4a4a52, `ui-popup` #3f3f46, `ui-hover-edge` #52525b, `ui-source` #6e6e78, `ui-card-edge` #27272a, `ui-blue-hover`, `ui-blue-bg`/`-line`/`-text` (the update and selected-filter chip), `ui-danger-tint`, `ui-warn-tint`, `ui-fail-row`, `ui-error-edge`, `ui-danger-text` #f87171, `ui-warn-text`, `ui-lock-line`/`-text`, `ui-live` (the kiosk-live green, with `/45`, `/12`, `/20`), `ui-saved`, `ui-tune`, `ui-unsaved`, `ui-accent-icon`, `ui-accent-tag-text`. `src/settings/tokens.css` (`s-*`, Help, Settings, the app window): `s-strong`, `s-prose`, `s-body`, `s-soft`, `s-t3`, `s-tile`, `s-card-hover`, `s-edge`, `s-code-line`, `s-connector`, `s-grey`, `s-close` (the window close hover, used by the studio's window controls too), `s-on-accent`, `s-on-green`, `s-bar-button-line`/`-text`, the callout hues `s-tip`, `s-heads`, `s-soon` (+ `-text`), `s-ok-text`, `s-good-text`, `s-red-text`, `s-red-text-strong`, `s-warn-text`.
- Type steps in `tokens.css`: `text-nano` 10, `text-lead` 14, `text-head` 16, `text-display` 18, `text-hero` 24 px, next to micro/caption/body/title; the studio is moved onto them. `src/lib/utils.ts` (`twMerge`) lists them as font sizes so they do not clash with `text-ui-*` colours.
- Widget files take the studio's fixed tokens where the value is exact: Calendar `text-ui-inverse-fg` (#0c0c0e), NowPlaying and the touch overlay `bg-ui-app`, OsdStrip `bg-ui-raised` (#17171b), SteamProfile `bg-ui-tile` (#141418). The widget theme (`--w-*`) has no surface token for these; they are fixed inks, not themed surfaces.
- Near matches (deltaE under 2.1; before and after shots compared pixel by pixel): `#d6d6db` and `#d0d0d6` to `s-strong` #d4d4da (Help blocks, About, Logs; Help article max channel difference 4, About 2); `#d4d4d8` to `ui-strong-text`; `#a4a4ad` to `ui-soft` #a1a1aa (explorer chips, insert panel); `#2a1d05` to `ui-warn-tint` #2a1d0a (locked chip); `#2a2a30/70` to `ui-active` #2a2a31; `#0E1014` to `ui-inverse-fg` #0c0c0e (MenuBar active item; not shot, the widget has no studio view). `#ffffff40` is now `border-white/25` (64/255 is 25.1%). The Data, Logs and Server shots differ only in live values (sensor numbers, port, log times). Not shot: the Edit and theme views (the Edit navigation in my capture script failed): inherit chip, theme pickers, add panel.
- Remains, 4 literals: `views.tsx:426` Synth header gradient `#ff4fd8`/`#38e8ff` (2) and `:448` Nixie `#a8805e`: those skins' own art colours, not UI tokens (like the excluded palette files); `viz/viz-gallery.tsx:69` `#161a20`, a dev gallery card backdrop with no token and no other use. Size: `add-tile-grid.tsx:115` `text-[8.5px]`, the tile size caption, a true one-off below the scale's 10.

### WebPage QA page dev-only
`public/assets/qa/webpage.html` moved to `src/dev/qa/webpage.html`. `vite.config.ts` plugin `qaWebPage`: the dev server answers `/assets/qa/webpage.html` from it; builds in `fixtures` and `stats` mode emit it; a release build does not. Checked: `vite build` output has `assets/qa/cover.svg` and `deck.svg` but no `webpage.html`. The release build's QA page (served by a debug server) frames a missing page for WebPage; `widget-qa-parity.spec.ts` only requires the frame to hold content, which an iframe still does. Dev check: the dev server serves it (see the verification in the final reply).

### PageThumb error boundary
No existing boundary fits (`ZoneErrorBoundary` draws an error tile), so `ThumbBoundary` in `page-thumb.tsx` renders nothing on a failed chunk or render; `page-tabs.tsx` wraps the lazy card in it, keyed by the hovered page so the next hover retries. Test: `tests/components/studio/page-thumb-boundary.dom.test.tsx`.

### Small leftovers
- Orphaned comment at `src/index.css` (the PulseDot one) removed; PulseDot's style is inline in `components/pulse-dot.tsx`, no CSS rule exists.
- `setting-pickers.tsx` had a Latin-1 byte (0xB7) in the Wave Link label where `·` (U+00B7) was meant; now UTF-8. No other tracked `src` text file has an invalid byte.
- `C-09` and `D-01` now carry a note in `findings.json` (C-09: current state only; 13b updates it). A-18's note replaced.

### Snapshot change
`tests/lib/__fixtures__/v8-parity.json` (5 class names): `bg-[#141418]` to `bg-ui-tile` (SteamProfile), `bg-[#0c0c0e]` to `bg-ui-app` (NowPlaying), `bg-[#17171b]` to `bg-ui-raised` (OsdStrip). The same colours through tokens; the markup is otherwise identical, and the v8 parity test still compares every other byte.

### 13a fix round 1
- **Touch overlay (S1):** `overlay.tsx` used `bg-ui-app`, but the overlay bundle loads only `overlay.css`, so the rule was never generated. `overlay.css` now imports `settings/tokens.css` and the root uses `bg-s-win` (the same `#0c0c0e`); the built `touch-*.css` holds `.bg-s-win{background-color:var(--color-s-win)}` and `--color-s-win:#0c0c0e`, and no `bg-ui-app`.
- **Same trap in Settings (found by grepping `ui-` colour utilities in `src/settings`, `src/help`, `src/app-window`, `src/touch-overlay`):** `agents.tsx`, `diagnostics.tsx`, `logs.tsx` and `touch.tsx` used `bg-ui-subtle/hover/tile/panel/menu` and `text-ui-3`; the Settings window loads only `tokens.css`, so all of these rendered nothing there (they worked only in the studio's Settings › App). Moved to the same values as `s-*`: `s-card-line` (#1f1f24), `s-t3` (#9696a0), `s-tile` (#141418), `s-card` (#111114), and two new tokens `s-hover` (#1a1a1f) and `s-menu` (#2e2e35). Visible effect in the settings window (shots in `shots/b13/before-s-*` and `after-s-*`): Coding agents gets its icon tile and the "Not connected" chip fill, Logs gets its row hover tint and filter-field fill, Touch its icon tile. Restoring those intended backgrounds is the fix. Help, the app window and `touch-overlay` have no other `ui-` colour utilities.
- **Widget tokens (S2):** Calendar, MenuBar, NowPlaying, OsdStrip and SteamProfile take `w-ink`, `w-hub`, `w-osd`, `w-badge` (same `#0c0c0e`, `#0c0c0e`, `#17171b`, `#141418`) from an `@theme` block in `src/index.css` beside the widget glow vars, so studio chrome theming cannot recolour widgets. `v8-parity.json` changes class names on those lines again.
- **ThumbBoundary:** `lazy` caches a rejected import, so `page-tabs.tsx` now keeps the lazy component in a module variable and the boundary's `onFail` swaps in a fresh `lazy`; the next hover retries the import. The test now also covers a rejected import followed by a successful one.

## 13b (C-09 finished, refused clip light, StreamMixer spec, 2x4 compact summary)

Shots: `scratchpad\refine\shots\b13\` (`sheet-b13b.png`, `before-b13b-*` is HEAD, `after-b13b-*` the working tree; only the shots that differ). Overflow probe (every widget at 1x1, 2x2, 4x2, 4x4, 2x4, HEAD against working tree): nothing NEW; DiskIO 4x2 and StreamChat 4x4 are in both runs.

### C-09 fixed
- `core/data.ts`: `unitStat(v, unit, d)` ({value, unit}) and `gbStat(gb)` (moved from NetworkThroughput, built on `gbParts`). Both tested in `tests/widgets/core/data.test.ts` (0, thresholds 100/1024 GB, missing value keeps the unit beside the dash as `fmtGB` did).
- `core/primitives.tsx`: `StatGrid` items take `unit`; the joined-string form is gone from every caller (items with no unit, such as "Power cycles" or a "–", simply have none).
- Converted: CpuMonitor (`degStat`, VID, RPM), GpuMonitor, PowerDraw (hero stats and footer), StorageHealth (`gbStat`, hours, spare, Activity), FpsMonitor `Display` (resolution, unit "· 144 Hz"), MenuBar detail card (`more` is now [label, value, unit]; the `studio` rows stay text), AudioMeter stat row (dB and %).
- Not split, on purpose: AudioMeter's row/bridge readouts and SystemStatus Peak/Avg (run-in micro/xs text; 0.7em would be under 8px), FramePacing `cell` (already splits value and unit, sized for its 22px figure), KpiTiles/Vitals (already `UNIT_CLASS`), "Min / max".
- MenuBar's detail units are a muted span at the text's own size (12px), not 0.7em, for the same reason.
- Snapshot `v8-parity.json`, cases `am-default am-ring am-mirror am-solid am-vu am-colors cpu-lg gm-own stor-default` only: the value text `-8.7 dB` / `61.6 °C` / `14,001 MHz` / `0%` is now the number plus a unit span with the Stat unit classes (the unit moved into its own span; nothing else on those lines changes). The unit in `cpu-lg` loses the space before it (the span's margin is the gap).
- Look at: AudioMeter 4x2/4x4, MenuBar 4x2/4x4, PowerDraw 4x4, StorageHealth 4x2/4x4 (sheet).

### Refused clip light
`mixer-views.tsx` `StripMeter` takes `locked` and passes `disabled` to `ClipIndicator`: still drawn with its state, but neither focusable nor clickable. Test: "show the clip light of a refused mixer but cannot be focused or clicked to reset it" in `tests/widgets/mixer-views.test.tsx`.

### StreamMixer spec
`docs/redesign/widgets/docs/widgets/StreamMixer.md`, and entries in `.facts.json` (`catalog` and `metas`; the facts are one file, not per widget). `tests/widgets/key-audit.test.ts` counts the specs: 47 to 48 (the only edit there).

### 2x4 compact summary
Cause: the column summary's bar/ring fill (`core/views.tsx`, the `max-w-[56px]` track) was a full-height block slid down with `translateY`, inside an `overflow-hidden` track, so the probe saw the hidden part as clipped content. Not real clipping. A first fix animated `height` instead; that was reverted in review, because it runs layout on every data tick, against the transform-only motion rule. The fill keeps its `translateY` slide and the track carries `data-qa-bleed` (a deliberate clip), so the probe skips it. This also cleared the same probe line on ProcessList, ServiceHealth, Fans, MemoryUsage, DriveSpace, StorageHealth, Achievements, PlaytimeShare, SensorGroup and AudioMeter at 2x4 (all use this column shape). It predates the branch: `main` has the identical translateY fill. Other spans are untouched (only the column shape draws this).
