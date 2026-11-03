# Decision log: Look System and theme packs

Decisions made by the owner on 2026-11-03. **Decided means default direction, not locked.** Any decision may change when the code shows it won't work, costs much more than expected, or a simpler option meets the same goal. Follow the change protocol below. Display compatibility decisions (DC1–DC15) live in `05-display-compat-brief-LATER.md`.

## Change protocol

1. Add a row to the **Change log** at the bottom: ID, old, proposed, evidence (`path:line`, measurements), impact on other decisions and phases.
2. Set the decision's status below to `change proposed`.
3. Raise it at the next gate (investigation Gate 1 or 2, or a phase report). Don't implement the change before the owner says "go".
4. Once approved, update the decision text, set status to `changed (date)`, and update any brief, spec or plan section that depends on it.
5. Never change a decision silently.

## Fixed guardrails (not decisions)

Changing these needs the owner's explicit approval in chat, with the reason.

| # | Guardrail |
|---|---|
| G1 | Saved data round-trips (config, `AppearancePreset`, `AppliedTheme`, follow and locks). Untouched saved widgets stay pixel-identical (defaults hazard). |
| G2 | Packs never move widgets: no change to size, padding, row fitting, what is shown, or privacy blur. |
| G3 | Widget type floor of 11 px (StreamDeck key titles excepted); tabular figures; status never shown by colour alone. |
| G4 | Packs contain no JavaScript and no remote URLs; pack assets are listed and local. |
| G5 | IP: original names and art only; no game titles, logos, key art, characters, screenshots or licensed fonts. |
| G6 | Accessibility: real controls, slider and meter roles, keyboard steps, 44 px targets, 4.5:1 text contrast (3:1 for large numbers). |
| G7 | Budgets and colour-literal caps only go down, unless a rise is measured, explained and approved. |
| G8 | Repo rules in `AGENTS.md` and `docs/TESTING.md` win over these documents. |

## Decisions

| ID | Decision | Status |
|---|---|---|
| D1 | Studio chrome is a built-in, non-editable "Studio" Look; `ui-*` is generated from it. | decided |
| D2 | `s-*` becomes aliases of `ui-*`; near twins take the `ui-*` value in P7. | decided |
| D3 | Studio, Settings and Help are dark-only (stated). Panel Looks may declare dark and light via `data-mode` and `@custom-variant dark`. Fix the audiocn `dark:` use. | decided |
| D4 | `--w-*` for panel content, `--ui-*` for chrome; colour accent renamed `--w-accent`; `--wp-fg`/`--wp-muted` aliased for one release, then removed. | decided |
| D5 | Looks and packs are JSON with a schema; built-ins generated at build time; user packs loaded at runtime. | decided |
| D6 | Cascade stores `lookId` plus overrides; config v17 with migration. | decided |
| D7 | Alerts, island and status bar follow the Look (material, frame, header). | decided |
| D8 | Export `THEME` table generated; "not exported" list per Look and pack; optional pre-rendered background for art-heavy packs. | decided |
| D9 | Lint: no hex outside `src/looks/`, no blur outside the blur helper, no `ui-*` in widgets; no accent budget. | decided |
| D10 | Final T2 material contract (kinds, fields, defaults, CSS var names). | open (investigation) |
| D11 | Thresholds, format and css stay outside the Look. Final T3 token list is open. | decided in principle |
| D12 | Today's default pinned as the "Classic" Look; existing configs keep it. | decided |
| D13 | Coverage and contrast tests in `npm run verify`; per-pack overflow and parity in `verify:full`. | decided |
| D14 | Vocabulary: Look, Theme pack, Colours, Saved look. | decided |
| D15 | Knobs: Accent, Material, Mode, Corners, Density, plus Variant for packs; packs may lock knobs with a reason. | decided |
| D16 | Three levels: Look, Theme pack, Pack CSS. Plan `data-part` hooks now; no pack CSS until needed. | decided |
| D17 | Built-in packs first; user packs from a folder later; validator built last; sharing (Themely) waits for the validator and IP policy. | decided |
| D18 | Animated backgrounds allowed: transform and opacity only, off in lite mode. | decided |
| D19 | Packs apply per screen; a widget may opt out of decorations only. | decided |
| D20 | Packs never move widgets; optional page templates (user opt-in); connectors drawn by the app. | decided |
| D21 | Pack sets status bar style and default position; the user can override the position. | decided |
| D22 | Every slot variant in the spec goes into the catalogue. | decided |
| D23 | Original names only; fonts as subset woff2 inside the pack; no runtime Google Fonts. | decided |
| D24 | Burn-in: global pixel shift and idle dim; packs declare `static-safe`, `needs-shift` or `needs-dim`. | decided |
| D25 | Where each slot attaches and the cost of `data-part` hooks. | open (investigation) |
| D26 | Icon set slot: one set per pack, fixed name list, Classic fallback. Name list and format open. | decided (details open) |
| D27 | T3 adds threshold lines and markers, ranges, controls, meter zones and peak hold, icon tokens; values come from widget settings. | decided |

## Change log

| Date | ID | Old | Proposed | Evidence | Impact | Status |
|---|---|---|---|---|---|---|
| | | | | | | |
