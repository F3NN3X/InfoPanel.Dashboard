# Phase 9 visual parity review (before/after, cell 110)

Rule: D1 in PHASE9_PLAN.md section 8. Known rows #32-#35 of review-ledger.md are skipped except where noted as an extension.
Severity: high = information or feature lost/broken; med = readability, clipping, colour drift; low = cosmetic.
Not listed = checked, no regression: streamdeck (all spans, new is better), webpage (empty state only), textfile 3x2/6x3, steam 4x2/6x3, spotify 3x2+/media 3x2+, fps 2x1/6x3, notifications 3x2+, vbz 3x2/4x2.

| Module | Span | Sev | What is wrong | Legacy vs new |
|---|---|---|---|---|
| audiomodern | 2x1, 3x2, 4x2, 6x3 | high | Per-device percentage and peak dB text are gone at every span; only LED meters remain, so the level value cannot be read | Legacy: `97%`, `0%`, `51%` ... plus `peak -8.7dB` under each bar. New: no numbers at all |
| audiomodern | 3x2 | high | Only 4 of the 6 devices are listed (Browser, Speakers/Mic missing); legacy showed all 6 | Legacy: 6 columns. New: Voice, System, Default device, Headphones |
| bluetoothmodern | 2x1 | high | The "3 devices" count is lost; header only says BLUETOOTH and "Bluetooth On" | Legacy: `Bluetooth On` + `3 devices`. New: `Bluetooth On` only |
| hardwaremodern | 2x1 | high | Only one sensor row, value without unit or decimals (`59`, not `58.9`); the second sensor (KINGSTON ... 63.9) is lost | Legacy: 2 rows (`58.9`, `63.9`). New: header + one `59` |
| networkmodern | 2x1 | high | Upload value is gone; only the Ethernet download figure is shown | Legacy: `899 kB/s` down and `26.9 kB/s` up. New: `898.5 MB/s` + a bar |
| systemmodern | 2x1 | high | RAM ring replaced by VRAM; RAM is not visible. Also the rings are replaced by a nested donut, GPU is purple (legacy orange) | Legacy: CPU 63 / GPU 90 / RAM 66 rings (blue, orange, green). New: CPU 63% / GPU 90% / VRAM 36% (blue, purple, yellow) |
| textfile | 2x1 | high | File content and size/status are lost; only "5 lines" remains | Legacy: `Text File`, `2.0 KB`, `5 lines`, `OK`, first 2 lines of text. New: header + `5 lines` |
| weathermodern | 3x2, 4x2, 6x3 | high | Forecast precipitation amounts and the day date are gone; forecast tiles lose the rain value | Legacy: `Tue 13`, `8°`, `4° · 42.5mm`, `7° · 1mm`. New: `Tmrw`, `8°`, `4°` (no mm, no dates) |
| fpsmodern | 3x2, 4x2 | high | GPU name and resolution/refresh line are not shown (only at 6x3); legacy showed them (overlapping, but present) | Legacy: `NVIDIA GeForce R...`, `3840 x 2160 · 240Hz`. New: absent; GPU util remains |
| networkmodern | 3x2, 4x2, 6x3 | med | Upload arrow icon renders as a dotted circle (broken glyph); download/upload values are white where legacy was green/blue; DOWNLOAD/UPLOAD word labels dropped | Legacy: green `899 kB/s`, blue `26.9 kB/s`, up arrow. New: white `898.5 MB/s`, `◌ 26.9 MB/s` (unit change is #23) |
| networkmodern | 4x2, 6x3 | low | Large empty band between the speed row and the footer stats | Legacy: content vertically centred. New: top-heavy, ~40% blank at 6x3 |
| bluetoothmodern | 3x2, 4x2 | med | Hub title is cut mid-word next to the device count | Legacy: `Bluetooth On`. New: `Blueto...` |
| mediamodern | 2x1 | high | Elapsed/total time `01:34 / 02:11` is lost; art tile became a huge disc behind the title text (title overlaps the ring) | Legacy: art tile + title + artist + time. New: wash + overlapping ring, progress bar only |
| spotifymodern | 2x1 | med | Art tile replaced by a large ring behind "Sample Track" (reduced contrast, ring overlaps text); legacy tile was clean | Legacy: tile + title + artist. New: ring behind text + progress bar |
| mediamodern, spotifymodern | 3x2, 4x2, 6x3 | low | Time labels change from elapsed/total to elapsed/remaining (`-02:11`) and shrink to tiny mono text | Legacy `01:34 ... 02:11`. New `01:34 ... -02:11` |
| steammodern | 3x2 | med | "313 games · 8/26 online" is hidden under the "263h" figure (legacy overlapped too, still unreadable) | Legacy: `15 games 26 online` partly covered. New: `3.. game.. 8/26 online` covered |
| vbz | 2x1 | med | "Updated 12:04" is lost; only the first departure "2 min" shows | Legacy: title + `Updated 12:04`. New: header + `2 min` |
| vbz | 6x3 | med | Row 4 label wraps ("12 / min") and row 5 is cut mid-row at the bottom ("16 ..." / "Bucheggplatz" clipped); scrollbar inside zone | Legacy: 3 rows, scrollbar. New: 5 rows, one wrapped, one cut |
| weathermodern | 3x2 | med | Condition line is cut: "Clear Sky · f..." (feels-like lost); default look changed from amber/brown gradient to flat dark | Legacy: `Clear Sky` / `Feels like 5°` on warm gradient. New: `Clear Sky · f...` on dark |
| weathermodern | 4x2, 6x3 | med | Default background colour drift: legacy warm brown (night) gradient, new neutral dark | Colour only; information kept |
| wavelinkmodern | 2x1 | med | Only the first channel (Wave Mic 1, Fader 85%) is shown; Voice 50% and Browser 23% are gone | Legacy: three channel percentages (overlapping/clipped). New: 1 channel, readable |
| wavelinkmodern | 3x2 | med | Only 3 of 5 channels visible, no scroll cue; meters now green, legacy teal/amber | Legacy: 5 channels via scroll. New: 3 channels |
| hardwaremodern | 3x2, 6x3 | med | Extends #32: raw floats (`58.88671875 °C`, `63.850006103515625 °C`) at 3x2 and 6x3, names cut to `Ki`/`N`, vertical + horizontal scrollbars at 3x2, header added | Legacy: `58.9`, full-ish names, no scrollbar |
| fpsmodern | 3x2, 4x2 | low | Stat label reads "1% low · 62 0.1%": ambiguous, the 0.1% value is attached to the label and "0 fps" sits under it | Legacy: `0 fps` / `1% low` |
| notifications | 2x1 | low | "Listening" status line lost; count now red large numeral | Legacy: `Notifications 3` + title + `Listening`. New: `3` + title |
| notifications | 3x2, 4x2 | low | White scrollbar inside the list (legacy had one too, not an improvement) | same as before |
| notifications | 6x3 | low | Text noticeably smaller, bottom ~40% empty; legacy used larger type | Legacy: 15 px rows filling area. New: small rows, blank lower half |
| textfile | 6x3 | low | Header and body type smaller, lower half empty (legacy larger mono) | cosmetic |
