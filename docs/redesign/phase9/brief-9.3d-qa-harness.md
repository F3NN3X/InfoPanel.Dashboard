# Brief 9.3d: widget QA harness

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. The dev page `?widget-qa`
exists (`src/widgets/widget-qa.tsx`, lazy from `src/main.tsx`). Make it the oracle page for 9.4 and 9.8.
Verify with `npm run typecheck` and `npm test` (exit codes read directly). No new deps.

## 1. Extra fixtures for sources absent from the snapshot
`src/widgets/__fixtures__/extra.json` (same `{ sensors: { key: {value?, text?, unit} } }` shape) with
plausible synthetic values, keyed exactly as the legacy modules read them. Read each module to get the
keys: `src/modules/vbz.tsx` (Departures), `bluetooth-modern.tsx`, `notifications.tsx`, `textfile.tsx`,
`streamdeck.tsx`, the `hwinfo.` keys `hardware-modern.tsx` reads, the `plugins.fps-plugin.` keys
`fps-modern.tsx` reads, and a playing Spotify/media state (playing = 2, progress, times, cover art =
an inline SVG data URL so nothing hits the network). No personal data. Image URLs must be data URLs or
bundled `/assets/...` paths. `fixtureSensors()` in `src/widgets/__fixtures__/index.ts` merges snapshot +
extra (extra wins).

## 2. The page
Query params (all optional):
- `module=<id>[,<id>…]` — legacy ids and template ids (default: every registered module).
- `spans=1x1,2x1,3x1,1x2,2x2,4x2` (default this list; spans below a module's min are skipped and
  listed as "below min").
- `cell=110|150` (default 110), `gap=8`.
- `skin=<name>`, `variant=default|studio`, `surface=<name>`, `theme=<preset id>` (applies that theme
  preset's tokens to the page, e.g. `paper` for the light check).
- `settings=<url-encoded JSON>` merged into every placement's settings.
- `data=live` uses the real sensor store instead of fixtures.

Rendering: for each module × span, build a `Placement` (`colSpan/rowSpan` = span) and render it
exactly like the kiosk does — `placementContent(...)` inside a fixed-size box of
`span × cell + (span-1) × gap` px — so legacy modules and template modules go through the same path.
Feed fixture sensors as the `SensorMap`. Each cell is a `<figure data-qa-module data-qa-span>` with a
caption (module id, span). Dark page background by default.

## 3. Overflow probe
`window.__qaOverflow()` returns, for every figure, the descendants whose bounding rect exceeds the
zone box by more than 1px and text elements that overlap a sibling text element (rect intersection
> 2px² between leaf text nodes in the same zone), as `{ module, span, issues: [{ selector, kind, dx, dy }] }[]`.
Pure geometry helpers (`exceeds(rect, box, tol)`, `overlaps(a, b, tol)`) live in
`src/widgets/qa-geometry.ts` with unit tests.

## 4. Screenshot helper
`docs/redesign/phase9/qa.md`: how to open the page (`npm run dev`, URL examples) and the
Playwright `browser_run_code_unsafe` snippet that saves one PNG per figure to
`docs/redesign/phase9/shots/<stage>/<module>_<span>_<cell>.png` (stage = `before` / `after`) without
returning images, plus the overflow probe call. Add `docs/redesign/phase9/shots/` to `.gitignore`.

Commit: `feat: add the widget QA harness` (body: params, fixtures added, probe). Report in ≤10 lines.
