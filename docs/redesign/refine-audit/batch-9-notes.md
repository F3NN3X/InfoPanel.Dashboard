# Batch 9 notes: widget nits and small layout fixes

Rows: C-12, D-15, D-07, C-02, D-02 all `fixed`. Probe diffs (`of-b9a` before, `of-b9c` after, 1x1/2x2/4x2/4x4 for every widget): no NEW lines; gone: AudioMeter 4x2/4x4, MeterBridge 1x1/2x1, StreamChat 4x2.
Shots: `scratchpad/refine/shots/b9/` (`before-*.png`, `after-*.png`, `sheet-a.png`, `sheet-b.png`). Probe sets 2x2/4x4 and 1x1/2x1/4x2 for the other touched widgets show no change.

## Batch 2b review nits (no ledger rows)
- PRIORITY in the StatusBar stack: `stackShown` (`src/widgets/StatusBar/Stack.tsx`) drops the lowest `PRIORITY` first, the last on a tie, and keeps slot order; tested in `tests/widgets/StatusBar/stack.test.ts`. A bar of six items at 4x2 now loses the two unranked ones, not the right slot.
- Double `store.read`: `ThresholdTimeline.tsx` reads each lane once (`samples` on the lane), and `RoomyLanes` no longer takes the store.
- Thermals hero repeating the first row: it still happened (hero = hottest, bars began with the same sensor). At 4x4 (roomy, more than one reading) the bars now start at the second reading (`Thermals.tsx`). With one reading the row stays.
- S3 (cards-only StatusBar) was already handled in batch 2b (`tiles.length` check); nothing to do.

## C-12 LedLadder hold marker
- (Round 1 reworked this, see Fix round 1.) The marker slid a full-size wrapper by `at`%, which overflowed the ladder (the probe's `clipped 381/0` on AudioMeter, 30-40 on MeterBridge 1x1/2x1), and its tick overhung the ladder by 1px each side. `HoldMark` (`widgets/core/primitives.tsx`) is now one 2px tick positioned at `calc(pct% - pct*2px)` along the meter, so at 100% its far edge is the meter's end. The pure `holdPlace` (`widgets/core/hold.ts`) clamps to 0..100 (NaN to 0); tested in `tests/widgets/core/hold.test.ts`.
- It animates `left`/`bottom` (150ms) instead of `transform`, for a 2px element. Used by AudioMeter, MeterBridge and WaveLink meters.
- Look at: AudioMeter 4x2/4x4 and MeterBridge 1x1 (tick sits on the LED ends, nothing pokes out).

## D-15 StreamChat
- `useWholeRows` (`widgets/StreamChat/whole-rows.ts`) hides the oldest messages until the rest fit the list whole. Messages wrap, so rows are measured (not counted at one height); the pure `wholeRows` holds the maths (tested). The fade at the top stays. Look at: StreamChat 4x2 (no half row under the header), 4x4.
- Uncertain: the newest message alone taller than the list is shown clipped (at least one row stays).

## D-07 Vitals
- Cards under 76px tall (measured, not the unmeasured h=0) with the graph behind the text get a halo plate (text-shadow in the text colour's inverse, `oklch(from var(--w-fg) calc(1 - l) 0 0 / .9)`) on the label row and the value. There is no `--w-surface` variable; adding one to `TEXT_VARS` moved every widget's markup in the parity file, so it is local to Vitals. Cards of 76px and up are untouched. No standard span draws a card that short in the QA shots, so the plate is checked by the markup only.

## C-02 / D-02 Weather 2x2 and NetworkAdapters 2x2
- `tileHero(w, h)` (`core/layout.ts`) names the 2x2 range the compact view already used. `Compact.lead` (`core/types.ts`) is a glyph drawn left of the hero value (`core/views.tsx`, 52px kept for it).
- Weather: a 40px condition glyph in the accent beside the temperature when the tile is square-ish (|w-h| <= 25% of w) and from 200 to 339px. Other spans do not change.
- NetworkAdapters: the IP uses the hero value path (`kind: "value"`, `h*0.26` capped to fit the width: 36px at 228) in the 2x2 tile only. This is the kit's compact hero rather than `heroPx` (that one is the roomy 4x4 variable).
- Look at: Weather 2x2, NetworkAdapters 2x2 (before/after in sheet-a).

## StreamDeck title floor
- `StreamDeck.tsx`: a wrapped key title is 11px at the least (was 8). A word wider than the key breaks (`overflow-wrap:anywhere`) and the two lines end in an ellipsis. The recorded exception is removed from `batch-2b-notes.md`. Look at: StreamDeck 2x2 (3x3 window keys).

## Snapshots
- `tests/lib/__fixtures__/v8-parity.json`: `am-default`, `am-bridge`, `am-colors` only (AudioMeter): the hold tick's markup (positioned span instead of a translated wrapper). Nothing else moved; Vitals, Weather and NetworkAdapters cases do not change because the fixtures are unmeasured or not 2x2.

## Fix round 1
- S1 (Hide IP): `Compact.blur` (`core/types.ts`) puts the body's `blur-[4px] hover:blur-0` on the compact value, text and hero; NetworkAdapters passes `blur: p.hideIp` (1x1 and 2x2, which never honoured it). Test: `tests/widgets/core/Widget.test.ts` ("blurs the compact value").
- S2/4/5 (`StreamChat/whole-rows.ts`): the ResizeObserver is made once (deps `[ref, listed]`; `listed` because the list is not mounted while the empty state shows), and a second effect fits after every render. Rows and list are measured with `getBoundingClientRect` (fractional px). A capture-phase `load` listener on the list re-fits when an emote or badge image loads (cheap: one listener).
- Nit 3: StreamDeck's title `fontSize` is `titles` (11 for window keys); the dead scaling expression is gone.
- Nit 6: `HoldMark` moves by `transform` again, without the overflow: a clip box (`data-qa-bleed`, the probe's by-design marker) holds a wrapper that is the meter less the tick's 2px, slid by `translate` (percent of itself), so the tick ends flush at 100%. `holdPlace` became `holdPct` (clamp only; the px shift is gone). v8-parity: the same three AudioMeter cases, regenerated for the new markup. Probe diff vs before: nothing NEW.
- Nit 8: `stackShown(tiles, max, byPriority)`; the stack drops by `PRIORITY` only for preset views (`isPreset(view)`, like the bar), otherwise from the end in slot order (tested).
- Nit 9: pure `squareHero` (Weather glyph gate) and `afterHero` (Thermals bars start at the second reading) in `core/layout.ts`, tested in `tests/widgets/core/layout.test.ts` with `tileHero` boundaries.
- Nit 7 (halo for a mid-lightness text colour) left as is: the halo only drops out, never harms.
- StreamChat 4x4 "2 issues": two `overlaps` between the name span and the message span of the same wrapped message (inline boxes whose bounding rects overlap when the text wraps to a second line). They are probe false positives, there before this batch (8 issues in the "before" shot, 2 now); no pixel overlap in the shot.
