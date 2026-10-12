# Phase 9 review ledger

Findings from reviews, with the decision taken. Status: open / fixed (commit) / accepted (why).

## Core (dd2035a)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 1 | med | `core/primitives.tsx` MiniViz | `--w-track` read via `getPropertyValue` returns unresolved `color-mix(var())`; canvas falls back to white on a light theme surface | open: resolve through a probe element's computed `color` |
| 2 | med | `core/Widget.tsx` background scrim | scrim follows page theme, text follows surface tone → light-on-light | open: scrim from surface tone |
| 3 | med | `core/views.tsx` android header | header text mixed toward `#fff` | open: mix toward `var(--w-fg)` |
| 4 | med | `core/views.tsx` tui header | label/right patches hard-coded `#0b0b0d` | open: use the resolved surface background |
| 5 | med | `NUM_GLOW` (views, primitives) | glow numerals mixed toward `#fff` | open: mix toward `var(--w-fg)` |
| 6 | med | `core/views.tsx` compact/studio | stored `icon` / `label` lose to descriptor `c.icon` / `c.label` | open: explicit user settings win |
| 7 | low | `core/look.ts` border | any `borderWidth` zeroes the CSS border → kills `holo` ring | open: skip zeroing for border-box surfaces |
| 8 | low | `core/look.ts` opacity | `fadeColors` ignores `color-mix()` → opacity no-op on tinted/aurora/neon | open: fade via `color-mix(… transparent)` |
| 9 | low | `core/Widget.tsx` padding | padding scaled by zoom | open: divide by zoom |
| 10 | low | skin accents | ink/synth/… accent invisible on light surfaces | open: skin accent ignored when surface tone is light |
| 11 | low | MiniViz / views | ref written during render | open: move to effect |
| 12 | low | `core/Widget.tsx` surface | `look.surface === ""` overrides the template default | open: treat empty as unset |
| 13 | low | `layout` compact/simple | forces tier only, not the compact view in a box | accepted: legacy `layout` forced a density, not a shape; tier forcing matches it. Revisit in 9.4 screenshots |
