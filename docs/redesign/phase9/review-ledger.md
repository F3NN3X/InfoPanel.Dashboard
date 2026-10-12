# Phase 9 review ledger

Findings from reviews, with the decision taken. Status: open / fixed (commit) / accepted (why).

## Core (dd2035a)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 1 | med | `core/primitives.tsx` MiniViz | `--w-track` read via `getPropertyValue` returns unresolved `color-mix(var())`; canvas falls back to white on a light theme surface | fixed (e2fc8f8) |
| 2 | med | `core/Widget.tsx` background scrim | scrim follows page theme, text follows surface tone → light-on-light | fixed (e2fc8f8) |
| 3 | med | `core/views.tsx` android header | header text mixed toward `#fff` | fixed (e2fc8f8) |
| 4 | med | `core/views.tsx` tui header | label/right patches hard-coded `#0b0b0d` | fixed (e2fc8f8) |
| 5 | med | `NUM_GLOW` (views, primitives) | glow numerals mixed toward `#fff` | fixed (e2fc8f8) |
| 6 | med | `core/views.tsx` compact/studio | stored `icon` / `label` lose to descriptor `c.icon` / `c.label` | fixed (e2fc8f8) |
| 7 | low | `core/look.ts` border | any `borderWidth` zeroes the CSS border → kills `holo` ring | fixed (e2fc8f8) |
| 8 | low | `core/look.ts` opacity | `fadeColors` ignores `color-mix()` → opacity no-op on tinted/aurora/neon | fixed (e2fc8f8) |
| 9 | low | `core/Widget.tsx` padding | padding scaled by zoom | fixed (e2fc8f8) |
| 10 | low | skin accents | ink/synth/… accent invisible on light surfaces | fixed (e2fc8f8) |
| 11 | low | MiniViz / views | ref written during render | fixed (e2fc8f8) |
| 12 | low | `core/Widget.tsx` surface | `look.surface === ""` overrides the template default | fixed (e2fc8f8) |
| 13 | low | `layout` compact/simple | forces tier only, not the compact view in a box | accepted: legacy `layout` forced a density, not a shape; tier forcing matches it. Revisit in 9.4 screenshots |

## Registry (c0bb34c..50df135)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 14 | med | `module.tsx` / `STANDARD_SETTINGS.surface` default `glass` | `effectiveSettings` always fills `surface`, so a chosen skin never brings its own surface | fixed (e2fc8f8) |
| 15 | low | inspector | Skin/Graph/Meter show on legacy widgets where they do nothing | accepted until 9.4: every legacy widget renders through the shell after its port |

## First browser QA (8aa3757, `?widget-qa`, 44 templates × 6 spans × cell 110/150 × default/studio)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 16 | med | SystemStatus 4×2, Clock 4×2, SteamLibrary 2×1/2×2/4×2 (150), CpuMonitor 2×1 (150) | text overlaps (probe `overlaps`) | open: fix in 9.8 sweep |
| 17 | med | QA probe | content clipped by the shell's `overflow:hidden` is not reported (clipped axes ignored) | open: add a `clipped` kind (scrollHeight/scrollWidth > client + 1 on zone descendants with overflow hidden) in 9.8 |
| 18 | low | legacy `hardwaremodern` | duplicate React keys (two sensors share a display name) | open: port keys rows by sensor key |
| 19 | low | legacy image path | `/assets/...` root-relative images go through `/api/image-proxy` and 400 in dev | open: ported widgets load root-relative paths directly (`widgetImage`) |
| 20 | low | `core/primitives.tsx` Spark | gradient id from `Math.random()` in a ref initialiser | open: use `useId()` (SSR-stable) |

## Ports, batch 1 (8cb380a, de0a098, 076c150, worktree 07ac636 / 96fb74a)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 21 | high | `templateModule` render | legacy modules returned `null` with no data, so the kiosk hid the zone (`hasData` false); templates render an empty state instead → empty zones now show in the kiosk | open: factory returns `null` when no key under the module's prefixes/reads exists (legacy and template alike), matching the old rule |
| 22 | med | data adapter | `toFlat` drops `SensorValue.name`, so auto-discovered rows (Hardware, SensorGroup) show key-derived labels instead of the sensor's display name | open: expose names alongside the flat map (e.g. a `names` prop / context read by `sensorLabel(key)`) |
| 23 | low | Network | legacy showed KB/s values as bytes/s; the template shows the sensor's real unit, and the busiest adapter instead of ethernet only | accepted: a bug fix; noted in the PR |
| 24 | low | ports | `docs/widget-settings.md`, `docs/module-catalog.md` still name deleted `Modern*` components | open: docs pass in 9.8 |
| 25 | med | `templateModule` | three parallel ports added three legacy-alias mechanisms (`legacy`, `alias`/`base`, per-module) | fixed (e743142) |
| 26 | med | Bluetooth | devices matched by last key segment because names are dropped (see #22); unverified on real plugin keys | open: re-check after #22 |
| 27 | low | Departures / Notifications | rows cut to fit the zone instead of a scroll area | accepted: kiosk zones aren't scrolled; "fit, don't overflow" rule |
| 28 | med | System alias | default device colours now follow the template palette (RAM green → amber); D1 says today's colours stay the default | open: the legacy alias passes today's default device colours when the stored colour is unset |
| 29 | low | System | hardware/drive names rebuilt from key slugs ("Kingston" vs "KINGSTON") | open: resolved by #22 |
| 30 | low | NowPlaying "loudest live device" | legacy fallback that matched a sensor *named* "Level" dropped (names lost, #22) | open: restore with #22 |
| 31 | low | NowPlaying | legacy compact pill (progress as fill + knob) replaced by the template's compact view | accepted: progress still shown; D1 allows a new look |
