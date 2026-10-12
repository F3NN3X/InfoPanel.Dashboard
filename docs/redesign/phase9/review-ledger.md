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
