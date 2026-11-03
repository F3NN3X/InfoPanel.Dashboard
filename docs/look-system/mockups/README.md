# Mockups

Static exports of the 23 design-canvas boards. Open `index.html`. Each file renders at its native size, so Playwright can screenshot it with a matching viewport (for example 1280×720, or 480×320 for `DispXS.html`).

- **Visual target, not a spec.** Rules live in `../03-theme-packs-spec.md` and `../01-investigation-brief.md`.
- **Fonts** come from Google Fonts here for convenience, so the files need internet to look right. Production packs bundle subset woff2 files (decision D23).
- **Data is fake.** Values are consistent across boards (CPU 42%, GPU 67% at 72 °C, 144 FPS, and so on) so the boards can be compared.
- **Widget kinds** shown here that don't exist in the app yet (FPS, frame time, weather and others) are out of scope for the Look System work.

| Group | Files |
|---|---|
| Packs and Looks on the default six widgets | `FieldKit`, `Tape86`, `NeonStripe`, `NightGlow`, `Paper` |
| Packs on other page layouts | `Overdrive`, `Swiss`, `Term`, `Holo` |
| Slot anatomy and Look gallery | `Anatomy`, `Gallery` |
| Page types with new widget kinds | `FieldKitGaming`, `Tape86Desk`, `TermGaming`, `NightGlowStream`, `SwissHome`, `HoloCockpit` |
| Display compatibility (later work) | `DispXS` (480×320), `DispSM` (800×480), `DispBar1920`, `DispBar2560`, `DispPortrait` (1080×1920), `DispRound` (480×480) |

Live canvas: https://claude.ai/artifact/T1imW2kxfdMud58HgXoBS8
