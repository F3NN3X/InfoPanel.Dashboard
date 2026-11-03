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
| G4 | Packs contain no JavaScript and no remote URLs; pack assets are listed and local. Enforcement lives in the pack loader (P8) and the validator (P12), not in the CSP. |
| G5 | IP: original names and art only; no game titles, logos, key art, characters, screenshots or licensed fonts. |
| G6 | Accessibility: real controls, slider and meter roles, keyboard steps, 44 px targets, 4.5:1 text contrast (3:1 for large numbers). |
| G7 | Budgets and colour-literal caps only go down, unless a rise is measured, explained and approved. |
| G8 | Repo rules in `AGENTS.md` and `docs/TESTING.md` win over these documents. |

## Decisions

| ID | Decision | Status |
|---|---|---|
| D1 | Studio chrome is a built-in, non-editable "Studio" Look: T1 plus a fixed `studio.*` extension block that only the built-in Studio Look may carry (65 `--ui-*` values; panel Looks never fill it). `ui-*` is generated from it. | changed (2026-11-03) |
| D2 | `s-*` becomes aliases of `ui-*`. Near twins follow a per-token table in P7: 13 same-role pairs take the `ui-*` value; 8 different-role pairs (`s-on-accent`, `s-well`, `s-on-green`, `s-card-hover`, `s-bar-bg`, `s-connector`, `s-heads`, `s-prose`) keep their own. | changed (2026-11-03) |
| D3 | Studio, Settings and Help are dark-only (stated). Panel Looks may declare dark and light via `data-mode` and `@custom-variant dark`. Fix the audiocn `dark:` use. | decided |
| D4 | `--w-*` for panel content, `--ui-*` for chrome; colour accent renamed `--w-accent`. `--wp-accent`, `--wp-fg`, `--wp-muted` and `--wp-radius` stay aliased as long as saved custom CSS can use them (saved data, G1); the alignment `--wp-*` set stays; `pad`/`gap`/`weight`/`label-case` move to `--w-*` only if nothing visible changes. | changed (2026-11-03) |
| D5 | Looks and packs are JSON with a schema; built-ins generated at build time; user packs loaded at runtime. | decided |
| D6 | Cascade stores `lookId` plus overrides; config v17 with migration. | decided |
| D7 | Alerts, island and status bar follow the Look (material, frame, header). | decided |
| D8 | Export `THEME` table generated; "not exported" list per Look and pack; optional pre-rendered background for art-heavy packs. | decided |
| D9 | Lint: no hex outside `src/looks/`, no blur outside the blur helper, no `ui-*` in widgets; no accent budget. | decided |
| D10 | Final T2 material contract: 4 kinds (`solid`, `gradient`, `glass`, `lcd`) plus optional `pattern`/`spots`; `fill-stops[]`, `inset[]`, gradient `border`, `tone: auto`; `blur-fallback-alpha` 0.90; `export` required; `frame` is a pack-slot reference; the resolver emits `--w-mat-*` (investigation §9.3). No longer open. | changed (2026-11-03) |
| D11 | Thresholds, format and css stay outside the Look. T3 is 78 Look-settable tokens (9 added: `num-stretch`, `num-effect`, `graph-style`, `series-glow`, `cell-radius`, `label-glow`, `header-fill`, header variants `prompt`/`icon-badge`; `instr-*` dropped) plus a fixed list (investigation §9.4). No longer open. | changed (2026-11-03) |
| D12 | Today's default pinned as the "Classic" Look; existing configs keep it. | decided |
| D13 | Coverage and contrast tests in `npm run verify`; per-pack overflow and parity in `verify:full`. | decided |
| D14 | Vocabulary: Look, Theme pack, Colours, Saved look. | decided |
| D15 | Knobs: Accent, Material, Mode, Corners, Density, plus Variant for packs; packs may lock knobs with a reason. | decided |
| D16 | Three levels: Look, Theme pack, Pack CSS. Plan `data-part` hooks now; no pack CSS until needed. | decided |
| D17 | Built-in packs first; user packs from a folder later; validator built last; sharing (Themely) waits for the validator and IP policy. | decided |
| D18 | Animated backgrounds allowed: transform and opacity only, off in lite mode. | decided |
| D19 | Packs apply per screen; a widget may opt out of decorations only. | decided |
| D20 | Packs never move widgets; optional page templates (user opt-in); connectors drawn by the app. | decided |
| D21 | A pack sets the island's default edge (top/bottom) and the style of the island and the Status bar widget. The widget's position stays with the page or template (moving it breaks G2/D20). The user can override the edge with `IslandConfig.edge`, optional, stored only when set. | changed (2026-11-03) |
| D22 | Every slot variant in the spec goes into the catalogue. | decided |
| D23 | Original names only; fonts as subset woff2 inside the pack; no runtime Google Fonts. | decided |
| D24 | Burn-in: global pixel shift and idle dim; packs declare `static-safe`, `needs-shift` or `needs-dim`. | decided |
| D25 | Attach points per investigation §8a H1: one `<PackStage>` mounted twice; three on-demand shell children; inline `--wp-pad`; 17 `data-part` hooks after a `Unit` element and `threshold`/`range` primitives. Decorations reach the card edge only via `--wp-pad`; ornaments are at most 10 px; no `!important` pack fills. No longer open. | changed (2026-11-03) |
| D26 | Icon set slot: one set per pack, Classic fallback per name. Fixed list of about 84 names (the Material Symbols ids widgets already use, in 7 groups); JSON glyph map per set; scoped by `SkinCtx`; a test fails on unknown names. No longer open. | changed (2026-11-03) |
| D27 | T3 adds threshold lines and markers, ranges, controls, meter zones and peak hold, icon tokens; values come from widget settings. Status colours are per mode and include `ok` plus an `accent-ink` (accent used as text or a thin line, darkened on light materials to 3:1 / 4.5:1); pure accent stays for fills. | changed (2026-11-03) |

## Change log

| Date | ID | Old | Proposed | Evidence | Impact | Status |
|---|---|---|---|---|---|---|
| 2026-11-03 | D1 | Studio chrome is a built-in Studio Look in the same contract; `ui-*` generated from it. | Same generator, but the Studio Look is T1 plus a fixed `studio.*` extension block that only the built-in Studio Look may carry; panel Looks never fill it. | 65 base `--ui-*` values; T1 covers about 12 (`src/index.css:80-147`); see docs/investigations/look-system.md §3 B.5, §10 | Schema gains a `studio` block; D13 coverage test checks Studio against T1+`studio.*`; P1, P5. | changed (2026-11-03) |
| 2026-11-03 | D2 | Near twins take the `ui-*` value in P7. | Per-token table: 13 same-role near pairs take the `ui-*` value; 8 different-role pairs (`s-on-accent`, `s-well`, `s-on-green`, `s-card-hover`, `s-bar-bg`, `s-connector`, `s-heads`, `s-prose`) keep their own. | `docs/investigations/look-system/token-twins.csv`; two specs disagree (`docs/redesign/README.md:465`, `docs/redesign/app-settings/SPEC.md:355-357`); see docs/investigations/look-system.md §3 B.3 | P7 scope only. | changed (2026-11-03) |
| 2026-11-03 | D4 | `--wp-fg`/`--wp-muted` aliased for one release, then removed. | `--wp-accent`, `--wp-fg`, `--wp-muted`, `--wp-radius` stay aliased as long as saved custom CSS can use them; the alignment `--wp-*` set stays; `pad/gap/weight/label-case` move to `--w-*` only if nothing visible changes. | 14 `--wp-*` from `chromeVars` (`src/components/widget-style.ts:122-151`); Help documents them (`src/help/articles/custom-css.md:31`); custom CSS is saved data (G1); see docs/investigations/look-system.md §3 B.5, §10 | P4, P7 (shims kept); custom-CSS tests and Help text. | changed (2026-11-03) |
| 2026-11-03 | D10 | Open: final T2 contract. | 4 kinds (`solid`, `gradient`, `glass`, `lcd`) plus optional `pattern`/`spots`; `fill-stops[]`, `inset[]`, gradient `border`, `tone: auto`; `blur-fallback-alpha` 0.90 (not 0.85); `export` required; `frame` is a pack-slot reference; resolver emits `--w-mat-*`. | 27 surfaces fold into 4 kinds; 0.85 fails muted and axis-label over white, 0.90 passes mid-grey; 12 of 27 surfaces export no card (`src/lib/infopanel/native/convert-view.ts:144-151`); see docs/investigations/look-system.md §8 G.2, G.4, G.8, §9.3 | P3b; D12 (Classic glass has no blur, so nothing repaints). | changed (2026-11-03) |
| 2026-11-03 | D11 | Open part: final T3 token list. | 78 Look-settable tokens (9 added: `num-stretch`, `num-effect`, `graph-style`, `series-glow`, `cell-radius`, `label-glow`, `header-fill`, header variants `prompt`/`icon-badge`; `instr-*` dropped) plus a fixed list. Thresholds, format, css stay outside (unchanged). | 14 skins need about 10 `ext` keys without the additions, 0 with them; `INSTR` has no consumer (`src/widgets/core/theme.ts:70`); see docs/investigations/look-system.md §8 G.1, G.8, §9.4 | P3a; D13 coverage test asserts `ext` empty for built-ins. | changed (2026-11-03) |
| 2026-11-03 | D21 | Pack sets status bar style and default position; user overrides the position. | Pack sets the island default edge (top/bottom) and the style of island and Status bar widget; the widget position stays with the page or template; override `IslandConfig.edge`, optional, stored only when set. | Status bar widget has no position (`src/widgets/StatusBar.tsx`); island is top-only (`src/lib/island/config.ts:68-100`, `src/components/island/dynamic-island.tsx:289-295`); moving a widget breaks G2/D20; see docs/investigations/look-system.md §8a H6 | P9 gains an island bottom mode; spec Status bar row wording. | changed (2026-11-03) |
| 2026-11-03 | D25 | Open: slot attach points and `data-part` cost. | Attach points per §8a H1; one `<PackStage>` mounted twice; three on-demand shell children; inline `--wp-pad`; 17 hooks after a `Unit` element and `threshold`/`range` primitives; decorations reach the card edge only via `--wp-pad`; ornaments at most 10 px; no `!important` pack fills. | Field Kit prototype: 0 layout change in 79 frames; 7 hooks +59 B gzip, in the kiosk entry closure (137 B headroom); see docs/investigations/look-system.md §8a H1-H4 | P8; kiosk budget must be paid or raised with approval (G7). | changed (2026-11-03) |
| 2026-11-03 | D26 | Details open: icon name list and format. | About 84 names = the Material Symbols ids widgets already use, in 7 groups; JSON glyph map per set; per-name Classic fallback; `SkinCtx` scope; a test failing on unknown names. | 9 widget icon names fall to `CircleDashed` today (`src/widgets/core/icons.ts:191-195`); Classic set about 5 KB gzip; see docs/investigations/look-system.md §8a H9 | P8 (fix the 9 names, intended visible change), P9. | changed (2026-11-03) |
| 2026-11-03 | D27 | Status per mode for warn and crit; `ok` follows the accent. | Status per mode includes `ok` and an `accent-ink` (accent used as text or a thin line) darkened on light materials to 3:1 / 4.5:1; pure accent stays for fills. | `ok` 1.75:1 on matte-light for all 14 skins, 1.08-2.04:1 on paper; `LedLadder` hard-codes `STATE` (`src/widgets/core/primitives.tsx:962,973`); see docs/investigations/look-system.md §8 G.4, G.7 | P3a, P6; repaints light materials for untouched widgets (intended, pinned by the contrast test). | changed (2026-11-03) |
| 2026-11-03 | G4 (Appendix D Security row) | "CSP limits pack assets to the pack folder." | The pack loader (from P8) and the validator (P12) refuse non-relative URLs and `@import`; the CSP does not enforce it. G4 itself is unchanged: this moves where it is enforced, which is not a guardrail change. Reading it as a change to G4 needs the owner explicit approval in chat. | Server CSP allows `https:`/`http:` images and `https:` fonts (`src-tauri/crates/ips-server/src/security_headers.rs:13-15`); window loads from the server (`src-tauri/src/windows.rs:123`); see docs/investigations/look-system.md §8a H7, §10 | Loader URL check in P8; P12 validator scope; brief Appendix D and spec Guardrails wording. | changed (2026-11-03) |

## Gate 2 owner calls (2026-11-03)

The owner approved all phases (investigation §11) and every proposed change above, with these calls, all accepted as recommended:

1. Audio re-render fix is in P2: `readsAll` zones skip messages whose changed keys are all under `plugins.audio-level-meter.` unless the zone's bound sensors include that prefix; a test pins it. P2 effort is M.
2. D10, D11, D25 and D26 are accepted as written in the investigation (§9.3, §9.4, §8a) and are no longer open.
3. Kiosk budget policy is hybrid: each phase pays for its kiosk bytes where it can and reports the measured delta; at P8 the owner expects to approve one measured rise of about 1 KB gzip (G7). Packs always lazy-load and never count against the kiosk entry.
4. `brutal` is redesigned in P3b to paint the hard offset shadow inside the card edge (inset bar on two sides); the card keeps its full box. A visible, intended change for every brutal widget; afterwards it follows G2.
5. Reds fold in P7: alerts take the widget crit red (`#F2665E` on dark, per mode on light; alerts follow the Look per D7). Studio danger `oklch(0.72 0.17 25)` stays its own role in the D1 `studio.*` set.
6. Defaults that move on purpose are confirmed: Classic is pinned to today's values and new defaults apply to new Looks only, except two intended fixes on Classic (the ramp start colour in P3a, `ok` on light materials in P6). Axis-label stays `faint` on Classic and is `muted` for new Looks.
7. Per-pack budgets are accepted as in investigation §11.1: each set to measured + 25 % when the pack is built, ceiling 500 KB, only down afterwards; layer budget 1 per card plus 3 per page.
8. NowPlaying cover blur (`src/widgets/NowPlaying.tsx:117`) is allow-listed in the D9 blur lint as decorative art, but switched off in lite mode. Limit blur does not cap it.
