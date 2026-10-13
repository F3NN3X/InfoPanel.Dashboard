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
| 16 | med | SystemStatus 4×2, Clock 4×2, SteamLibrary 2×1/2×2/4×2 (150), CpuMonitor 2×1 (150) | text overlaps (probe `overlaps`) | fixed: 9.8 sweeps 2–3 (per-widget `fix: <widget> fits at …` commits); full 14-skin × 2-variant sweep at 110/150 is clean |
| 17 | med | QA probe | content clipped by the shell's `overflow:hidden` is not reported (clipped axes ignored) | fixed (d21fbaa) |
| 18 | low | legacy `hardwaremodern` | duplicate React keys (two sensors share a display name) | fixed (076c150: rows keyed by sensor key) |
| 19 | low | legacy image path | `/assets/...` root-relative images go through `/api/image-proxy` and 400 in dev | fixed (art tint loads same-origin images directly) |
| 20 | low | `core/primitives.tsx` Spark | gradient id from `Math.random()` in a ref initialiser | fixed (f32be1d) |

## Ports, batch 1 (8cb380a, de0a098, 076c150, worktree 07ac636 / 96fb74a)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 21 | high | `templateModule` render | legacy modules returned `null` with no data, so the kiosk hid the zone (`hasData` false); templates render an empty state instead → empty zones now show in the kiosk | fixed (379692c) |
| 22 | med | data adapter | `toFlat` drops `SensorValue.name`, so auto-discovered rows (Hardware, SensorGroup) show key-derived labels instead of the sensor's display name | fixed (ceb476a) |
| 23 | low | Network | legacy showed KB/s values as bytes/s; the template shows the sensor's real unit, and the busiest adapter instead of ethernet only | accepted: a bug fix; noted in the PR |
| 24 | low | ports | `docs/widget-settings.md`, `docs/module-catalog.md` still name deleted `Modern*` components | fixed (0bfea1a) |
| 25 | med | `templateModule` | three parallel ports added three legacy-alias mechanisms (`legacy`, `alias`/`base`, per-module) | fixed (e743142) |
| 26 | med | Bluetooth | devices matched by last key segment because names are dropped (see #22); unverified on real plugin keys | fixed (ceb476a) |
| 27 | low | Departures / Notifications | rows cut to fit the zone instead of a scroll area | accepted: kiosk zones aren't scrolled; "fit, don't overflow" rule |
| 28 | med | System alias | default device colours now follow the template palette (RAM green → amber); D1 says today's colours stay the default | fixed (47385d2) |
| 29 | low | System | hardware/drive names rebuilt from key slugs ("Kingston" vs "KINGSTON") | fixed (ceb476a) |
| 30 | low | NowPlaying "loudest live device" | legacy fallback that matched a sensor *named* "Level" dropped (names lost, #22) | fixed (ceb476a) |
| 31 | low | NowPlaying | legacy compact pill (progress as fill + knob) replaced by the template's compact view | accepted: progress still shown; D1 allows a new look |

## Before/after screenshots (cell 110; `docs/redesign/phase9/shots/{before,after}`)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 32 | high | Hardware 4×2 | raw floats (`58.88671875 °C`), names missing/clipped, a horizontal scrollbar inside the zone, header added; legacy showed `58.9` with names and no scrollbar | fixed 9.4c: one-decimal values, no scroll containers, header off unless titled (names via #22) |
| 33 | med | System 4×2 | legacy default look had load rings per device; the alias shows a column grid without rings; "Clock 0.00 GHz" shown when the clock sensor is missing | fixed 9.4c: 0 GHz clock hidden; 2x1 rings are CPU · GPU · RAM (VRAM dropped, amber when hot); 4x2 falls back to 2 columns so rings show |
| 34 | med | Wave Link 3×2/4×2/6×3 | dB scale labels overlap the channel names and meters (probe: 26 overlaps) | fixed (8c63783; probe clean) |
| 35 | low | Hardware 3×2, System 3×2, vbz 6×3 | text overlaps (probe) | fixed (probe clean on legacy ids at 110 and 150 after the parity pass) |
| 36 | high | all ported modules | visual parity findings: see `visual-review.md` (27 rows: 10 high, 10 med, 7 low) | fixed (4102a12 8c63783 c3e60f6 83c80ba d47fab3 5f55942..84b55e7); remaining lows accepted |
| 37 | med | Other sensors | the sensor `source` line was dropped; multi-line values clamp to 3 lines | fixed 9.4c: source line restored; multi-line values scroll instead of clamping |
| 38 | low | `src/components/SmartValue.tsx` | unused after the Other sensors port | fixed (541eacb) |
| 39 | low | Wave Link 3×2/4×2 | mix-route chips and output devices show only in column / lg layouts (legacy fit them by scrolling) | accepted: kiosk zones don't scroll; information still available at larger spans |

## Inspector schemas (9.5)
| # | Sev | Where | Finding | Decision |
|---|---|---|---|---|
| 40 | med | SensorGroup | item labels derived from the key's last segment, not the sensor display name (`names`, #22) | fixed (1d7f6ea) |
| 41 | low | SensorGroup | per-item label/max/warn/crit/decimals not settable (shared values only) | accepted: new template capability beyond today's features; shared thresholds cover the common case |
| 42 | low | VolumeMixer | `onSetVolume` / `onToggleMute` callbacks not wired, faders read-only (as the legacy volume view) | accepted: no write API in the dashboard today |
| 43 | high | template modules (25, e.g. SystemOverview, Vitals, Thermals, SensorValue) | no prefixes, so `useSensors([])` retained no stream and the zone never repainted in the kiosk | fixed: `readsAll` modules subscribe to every stream; sensorless ones keep `[]` |
| 44 | med | Other sensors (SensorValue) | IPs, times, versions, resolutions parsed as numbers | fixed: `isNumericText` |
| 45 | med | `readSystemFlat` | `" x"` / `"0x10"` read as numbers | fixed: strict decimal first token |
| 46 | med | `filterDisks` | stored `"C:"` loosened to `"c"` and matched any drive with a c | fixed: exact substring first; loose match only for slug-named drives and terms of 3+ chars |
| 47 | low | `ZoneErrorBoundary` | reset key was the children element, so a caught error cleared every tick | fixed: keyed on the placement object |
| 48 | low | synth / brutal / hud skins | fitted numerals clipped (wide display faces), Achievements progress row and FPS facts overflowed | fixed: `numWide` skin token, truncating progress label, facts hidden below 190px when metrics show |
| 49 | low | WebPage iframe / `customCss` scope | no `sandbox`, `javascript:` not filtered; `}` in custom CSS escapes `@scope` | accepted for this branch: identical on main (not a regression); follow-up |
| 50 | low | toFlat / panel sparkline / PanelSkin ctx / render-time refs (review #3 part, #6–#8, #10) | unit dropped when text is set; seed point; context rebuilt per render; StrictMode double-steps in dev | accepted: text shown verbatim as on main; others cosmetic or dev-only |
| 51 | high | NowPlaying visualiser, Calendar | user report: visualiser flat on MyDefault, live on another profile. NowPlaying did not subscribe to `plugins.audio-level-meter.` (levels arrived only when another zone opened that stream) and mapped an unset/Auto `liveSource` to `default-audio` (silent when audio plays elsewhere) instead of the loudest device; Calendar read the clock plugin without subscribing | fixed: reads added; Auto = "" as in the legacy media modules |
| 52 | high | Visualizer style Bars | user report: Bars looked like Mirror. The stored `visualizerAlign` default `center` centred Bars | fixed: `barsAlign` maps center to the baseline; only Mirror centres (`draw.test.ts`) |
| 53 | med | Auto audio device | flickered between Browser and Music when both played | fixed: `stickyDevice` (10-point margin, 1.5 s hold; `audio-device.test.ts`) |
| 54 | med | Capture | stuck at "loading": `resume()` never settles without a gesture | fixed: status `blocked` + tap hint, resume on first gesture |
| 55 | med | Capture bands | 1 kHz in band 18 (plugin 17): mean power, shared edge bins, FFT 1024 | fixed: plugin's rule (bin owned by one band, loudest bin, FFT 2048); tones 9/17/26 on both sources (`bands.test.ts`) |
| 56 | low | Visualiser V3 | shared defaults shift the look (8 % resting, 24 px fade); `scroll` lost centre-out mirroring; GameSpotlight style list not extended | accepted, noted in `visualizer/PLAN.md` §8 |
