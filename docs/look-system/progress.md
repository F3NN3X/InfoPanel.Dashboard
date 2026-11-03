# Look System progress

Filled in during stage 2 (see `02-implementation-runbook.md`, section 4). Plan: [docs/investigations/look-system.md](../investigations/look-system.md), section 11.

| Phase | Branch | Status | Pixels | Report |
|---|---|---|---|---|
| Stage 1 | look/package | done (Gate 2 approved 2026-11-03) | none (investigation only) | [docs/investigations/look-system.md](../investigations/look-system.md) |
| P0 | look/p0-guardrails | in progress | none on screen; export: warn and crit rings export amber and red instead of blue (intended fix) | |
| P1 | look/p1-single-sources | not started | none | |
| P2 | look/p2-performance | not started | none for widgets; InfoPanel canvas cards with blur above 12 px get 12 px with Limit blur on (intended) | |
| P3a | look/p3a-data-viz-tokens | not started | ramp start colour moves to the material fill (intended fix) | |
| P3b | look/p3b-material-registry | not started | intended: `brutal` shadow moves inside the card edge; export draws the 12 dropped cards; Look thumbnails fixed; Classic otherwise none | |
| P4 | look/p4-variable-families | not started | none | |
| P5 | look/p5-look-contract-ui | not started | studio UI only; untouched widgets identical | |
| P6 | look/p6-light-mode | not started | light materials only: `ok` and accent text darken (intended) | |
| P7 | look/p7-clean-up | not started | minor: Settings accent text darker, 13 near-twin greys, native select border, alerts take the widget crit red | |
| P8 | look/p8-slot-plumbing | not started | none with Classic, except 9 icons that draw `CircleDashed` today (intended fix) | |
| P9 | look/p9-pack-loader | not started | none with Classic | |
| P10 | look/p10-first-wave | not started | new packs only | |
| P11 | look/p11-second-wave | not started | new packs and Looks only | |
| P12 | look/p12-validator | not started | none | |

## P0: Guardrails
- Plan entry: [docs/investigations/look-system.md, section 11, P0](../investigations/look-system.md)
- Checklist:
  - [ ] expected changes confirmed against HEAD (list mismatches)
  - [ ] implementation
  - [ ] verify, verify:full, check-fresh
  - [ ] per-kind render tests
  - [ ] parity: empty / intended diffs listed
  - [ ] overflow probe at 1x1, 2x2, 4x2, 4x4
  - [ ] screenshots dark and light (and per pack from P10)
  - [ ] budgets unchanged / delta measured and approved
  - [ ] CHANGELOG and widget specs
  - [ ] decision log updated (if anything changed)
- Report: not yet written
