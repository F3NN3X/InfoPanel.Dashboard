# Variants

A variant changes the **layout grammar** of every widget. A skin, by contrast, changes the look. The two combine freely: `variant="studio" skin="ios"` works.

## `default`
Each widget's own full layout in box shapes, plus CompactView for tiles, strips and columns, built from its `compact` descriptor. Shape rules are in ARCHITECTURE.md#sizing.

## `studio`
The minimal look of the Studio app's sample tiles. Rendered by `StudioView` from the widget's `studio` descriptor; it falls back to `compact` and then to `{ label: title }`.

| Element | Spec |
|---|---|
| Surface (auto) | `studio`: `linear-gradient(160deg, rgba(255,255,255,.075), rgba(255,255,255,.022))`, 1px `rgba(255,255,255,.08)` |
| Padding | `px-3 py-2.5`; single-row zones use `px-3` |
| Label | Geist Mono 9.5px, uppercase, tracking 0.06em, `#8a8a94`; optional live dot (5px, `oklch(0.75 0.15 150)`) and a `right` slot |
| Value | anchored to the bottom (`mt-auto`); 26 / 34 / 44px at heights under 190 / under 280 / larger; fitted to width; 600, −0.02em |
| Sub | 10px `#9696a0` |
| Bar | 3px, radius 2px, track `#2a2a31`, accent fill (tone colour when warn/crit) |
| Single row (h < 100, or a strip under 130 tall) | label ← line graph or 3px bar → value 15px |
| `meters: [{ n, v }]` | vertical bars, 3px radius, track `#1c1c21`, 9px names under each bar |
| `rows: [{ n, v, pct?, dot? }]` | 10.5px rows with an optional 3px bar and status dot; shows a 26px headline when h ≥ 210 |
| `cells: [v%]` | accent-intensity grid (`color-mix(accent 8–100%, #1c1c21)`) with the value below |
| `img` + `progress: { a, b, pct }` or `viz` | cover square, 14–17px title, mono times with a 3px bar (or a visualiser) |
| `hist` | faint 1px line graph above the value (h ≥ 150) |

Widget descriptors are listed in each widget's spec under "Studio variant".

## Per-widget layout options (variants within one widget)
| Widget | Prop | Options |
|---|---|---|
| NowPlaying | `layout` · `progress` · `vizMode` | card · vinyl · backdrop · wave · bar · wave · visualizer · bars · mirror · wave · dots · line |
| GameSpotlight | `layout` · `progress` | hero · poster · logo · ticker · combo · wave · visualizer |
| AudioMeter | `meterStyle` · `mode` | led · bar · vu · ring · mirror · wave · single · bridge |
| MeterBridge | `ladder` · `orientation` | led · smooth · vertical · horizontal |
| Visualizer | `mode` · `ramp` | bars · mirror · radial · wave · blob · dots · 7 ramps |
| CoreHeatmap | `shape` · `ramp` · `metric` | grid · hex · radial · waterfall · 7 ramps · load · clock · power · vid |
| CpuMonitor | `coreView` · `heatRamp` | bars · heatmap · off |
| SystemOverview | `sections` · `ring` · `coreView` · `unifiedColor` | — |
| Clock | `face` · `format` | digital · analog · 24h · 12h |
| NetworkThroughput | `chart` | overlay · mirrored |
| ServiceHealth | `layout` | list · pills |
| Achievements | `display` | ring · pips |
| SensorValue | `display` | value · gauge · bar · spark |
| SensorGroup | `layout` | auto · rows · grid |
