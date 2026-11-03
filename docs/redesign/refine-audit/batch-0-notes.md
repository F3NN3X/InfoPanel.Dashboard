# Batch 0: the status bar truncation (B-01)

- **B-01 fixed.** With the island's gap on, the bar sized its text and dropped items by comparing the sum of every
  item with the bar's width less the gap. The items sit either side of the gap, so the wider half is what has to fit:
  values were ellipsised ("14…", "5…") on panels where each half had room, at 1920x1080, 1280x800 and 1024x600. The
  audit guessed a font cap; the cause was the fit test.
  - `src/widgets/StatusBar/layout.ts`: `gapHalves`, `needAroundGap` (twice the wider half) and `fitAroundGap` (the
    wider half gives up its outer item, or its lowest-ranked one in the preset views).
  - `src/widgets/StatusBar.tsx`: the size search and the fit use them whenever a gap is on (Meters excepted).
  - Tests: `tests/widgets/StatusBar/layout.test.ts`, "items around the island's gap".
- Screens to look at: the kiosk at 1280x800 and 1920x1080 shows every value; 1024x600 and 800x480 drop whole items
  instead of cutting digits; 1920x480 is unchanged. At 1280x800 the text is smaller than before (it now has to fit
  instead of being cut); the bar's height share is B-05, in batch 3.
