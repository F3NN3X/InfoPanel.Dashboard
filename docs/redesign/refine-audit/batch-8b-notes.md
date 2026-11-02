# Batch 8b: audiocn's LevelMeter in the Strips view, and Wave Link inputs in Strips and LCD (D-21 follow-up)

Finishes the two things batch 8 left out. The rows view and every saved widget are unchanged (a missing key is today's behaviour).

## 1. The LevelMeter

### Vendored (`src/components/ui/audiocn/`)
- New: `level-meter.tsx`, `db-readout.tsx`, `clip-indicator.tsx`, `use-visibility.ts`. Same header, import paths and `local:` rule as batch 8; the MIT notice is the folder's `LICENSE`.
- Hooks the upstream meter needs, and where they come from:
  - `use-frame-source`, `use-clip-hold`: the repo already has them in `src/hooks/`, identical to upstream apart from line endings. Used as they are.
  - `use-reduced-motion`: the repo's `src/hooks/use-reduced-motion.ts` (same API; it reads `usePerformance().reduceMotion`, so General > Motion and the profile override the OS setting, which upstream's `matchMedia` does not). Used instead of upstream's. One `local:` comment in `level-meter.tsx` says so.
  - `use-visibility`: new, in the audiocn folder (like `use-audio-config`), because the repo had none.
  - `use-audio-context`: not vendored. Nothing in the three components imports it (it feeds a Web Audio analyser).
- `lib/audio`: nothing added. `frame-loop` (ours, diverged on purpose) has the `createFrameTask` and `createPainterClock` the meter calls; `frame-source`, `zones`, `taper`, `ballistics`, `decibels` and `types` were already there.
- `ChannelStrip` already watched for `[data-slot=level-meter][data-clipping]`, so a clipping meter lights its strip as upstream intends.

### Where it draws and what it is fed
- `ChannelStrip.Meter` in the Strips view is now `StripMeter` (`core/mixer-views.tsx`): a `LevelMeter` of two tracks (L, R) with `LevelMeterChannels`, `Track`, `Bar` and (with `meterHold`) `Hold`, in the optional `ClipIndicator` and `DbReadout`. Tracks are 6 px (vertical) or 3 px (horizontal), set with `--meter-thickness` and `--meter-gap`, because upstream's vertical meter keeps `min-h-32`. The range, zones and response go on the `Mixer`, which hands them to every strip (`AudioConfigProvider`). The Rows view keeps `LedLadder` / `MeterPair`.
- The data is a `FrameSource<MeterFrame>`, so the meter paints without React re-renders. `StripChannel.useLevel` returns it. It is called inside `StripMeter`, which mounts and unmounts with the meter, so a strip's hook count never changes when Meter is toggled or the view changes (fix round 1: a Wave Link-sourced StreamMixer crashed with "fewer hooks" when Meter was turned off; regression test in `mixer-views.test.tsx`).
  - **Wave Link** (the widget, and a Wave Link source in StreamMixer): its meter emitters through `useWavelinkMeter` (`channel:`, `input:` for an input device, `mix:`).
  - **VolumeMixer**: the level-meter plugin's `left-channel` / `right-channel` (% of full scale) of the device, found by its GUID (`levelContainerOf`, `audio-data.ts`).
  - **StreamMixer, Windows source**: the default output (Master) and default input (Mic) from the same plugin containers (`default-audio`, `default-input`). An app has no level in the plugin.
  - `core/level-source.ts`: `levelFrame` (the % to dBFS, pure), `sameFrame`, and `useDeviceLevel`. It keeps the 100 ms level stream open while the strip's meter is mounted (so only while the Strips view with Meter on is drawn: neither widget's `prefixes` gain anything, and the rows pay nothing), and writes store changes straight into an emitter through `sensorStore.subscribe`. Nothing in the widget re-renders at 10 Hz (fix round 1; the first version re-rendered the whole widget on each tick through `useSensors`).
- **No level data**: a channel with no level draws its meter at silence (an app in StreamMixer; any device the plugin doesn't report, or the plugin absent, in VolumeMixer), so the strips stay level. The meter is left out only when no channel could have a level. Never synthesised motion.
- The safe zone takes the channel's colour (`--meter-ok` on the meter), warn and clip come from the scope: `--meter-warn` (the theme's warning) and the new `--meter-clip` / `--meter-clip-foreground` (`mixer-views.css`, mapped in `index.css`, set only inside `.audiocn`). The track and the clip light use `--muted` and `--muted-foreground`, already themed. A saved Wave Link widget now gets amber from −20 dB and red from −9 dB in Strips (the old `MeterPair` had fixed 70 % / 90 % zones): intended, Strips replaces that meter; variant, response and colour keep their keys and defaults, and Rows are untouched. Checked in dark, light, paper and nixie (sheets below). On a light surface the amber and red are the theme's darker warn and crit; they read, and are the same as the rest of the widgets there.

### Settings (Strips view, `visibleIf` the strip's Meter is on; `mixerViewSettings`, `audio-settings.ts`)
| key | what | default | shown |
|---|---|---|---|
| `meterVariant` | solid / segmented / gradient (Wave Link's existing row, which also drives its rows; the others get it) | `solid` | Strips with the meter |
| `meterBallistics` | the existing Meter response (peak / vu / instant; Wave Link's existing row) | `peak` | Strips with the meter |
| `meterSegments` | LEDs, 4 to 64 | `24` | segmented, More |
| `meterMinDb`, `meterMaxDb` | range: floor −120 to −12, top −6 to 6, kept at least 6 dB apart | `-60`, `0` | More |
| `meterTaper` | linear / audio | `linear` | More |
| `meterWarnDb`, `meterClipDb` | where amber and red start, inside the range (clamped to `meterMinDb`..`meterMaxDb`), red never below amber | `-20`, `-9` | More |
| `meterHold` | the peak-hold marker (holds for the response's own time) | on | More |
| `meterValue` | a dB readout (`DbReadout`) | off | |
| `meterClip` | a clip light (`ClipIndicator`) | off | |

`meterMaxDb` above 0 only leaves headroom: a % sensor never reads above 0 dB (`levelFrame` stops there; the setting's hint says so). The defaults are upstream's (`-60`/`0`, zones from `DEFAULT_ZONES`, `peak`, linear, `solid`, 24, hold on), and the readout and clip light, which upstream's default meter does not draw, are off. The zones are two numbers, not colours: the colours are the theme's tokens (the `levelColor` / `hotColor` pattern is Meter Bridge's and Wave Link's rows; strips keep the channel's own colour). `mixerLookOf` clamps and falls back; `tests/widgets/registry/mixer-views.test.ts` round-trips every key.

### Every upstream prop (replaces "not exposed: LevelMeter isn't vendored" in `batch-8-notes.md`, which now points here)
- `source`: used (the feed above). `peakDb`, `rmsDb`, `channels`: not used (declarative values re-render; there is a source). `channelCount`: fixed at 2 (every source is an L/R pair).
- `minDb`, `maxDb`, `zones`, `ballistics`: `meterMinDb`, `meterMaxDb`, `meterWarnDb` + `meterClipDb`, `meterBallistics`. `taper`: `meterTaper`. `variant`: `meterVariant`. `segments`: `meterSegments`.
- `orientation`: from the strip. `size`: not exposed; the tracks are 6 / 3 px so the fit's maths hold (`stripSize` already sizes the fader and LCD). `actionsRef`: not exposed (a callback handle). `className`, `style`, `ref`: used for the thickness and the zone's size.
- Parts: `LevelMeterChannels`, `Channel`, `Track`, `Bar`: used. `Hold`: `meterHold`. `Scale` (`LevelMeterScale`): not used, the fader's own dB scale sits beside the meter. `Value`: `meterValue`, through `DbReadout` (0 decimals, the unit on horizontal strips, floor `meterMinDb`; 250 ms). `Clip`: `meterClip`, through `ClipIndicator`. `Bar measure="rms"`: not used, no source gives RMS.
- `ClipIndicator`: `thresholdDb` (−1 dBFS), `holdMs` (1.5 s) and `showCount` are upstream's defaults, not exposed. Its click resets the light (harmless, not a write).
- `DbReadout`: `holdMs`, `measure`, `channel`, `intervalMs`, `format`, `zones`: defaults (peak, loudest channel, 250 ms, no hold).

### Fit (`mixer-fit.ts`)
The clip light (20 px) and readout (16 px) stack on a vertical meter and sit beside the bars on a horizontal one: `meterClip` and `meterValue` widen a vertical strip (`stripWidth`), raise `columnHeight` (the meter column keeps 24 px of travel) and raise a row strip's meter line. With the meter off they cost nothing. Tests: `mixer-fit.test.ts` ("makes room for a meter's clip light and dB readout").

## 2. Wave Link input devices in Strips and LCD
- `stripsOf` (`WaveLink.tsx`) adds one strip per input device, from the same `devices` the rows use (same Show filter and Meters to show), between the channels and the mixes: name, "Input", a mic icon, the mute mark when any input is muted, the input meter (`meterKey.input(first input id)`, as `DeviceRow`) and the gain as the LCD readout (`gainLabel`, without the unit; "Mute" or "Live" when Fader level is off, as the channels do).
- Read-only, and **no fader**: a gain's position is not on the channels' −60 to 0 dB (or %) scale, and the rows show it as text, so the strip shows the meter and the gain readout.
- **Visibility**: there is no setting that shows inputs in Rows (only lg shows them, after the channels), so the Show filter and Meters to show decide in every view; no new key.
- **Group**: `StripChannel.input`. Strips: `mixerGrid` (pure) lays out `channels | separator-in inputs | separator master`, vertical or horizontal, each group its own `MixerSeparator`. LCD: `LcdDisplaySeparator` between the three groups in the vertical list (horizontal columns have none, as for masters).
- **Fit**: `MixerFitInput.inputs`; `separatorsOf(count, masters, inputs)` counts one separator per boundary between non-empty groups. Both `fitStrips` (`sepOf`) and `fitLcd` use it. Tests: `mixer-fit.test.ts` (separators; strips vertical and horizontal; LCD) and `mixer-views.test.tsx` (the strips and LCD lists: Music, Game, Wave:3, Stream Mix, Monitor Mix, two separators, no slider).

## Tests
- New: `tests/widgets/core/level-source.test.ts` (the frame adapter, `sameFrame`, `meterZones`, `levelContainerOf`), `tests/widgets/core/level-sources.test.tsx` (`useDeviceLevel`; `mixerGrid`).
- Extended: `mixer-fit.test.ts`, `mixer-views.test.tsx` (each widget draws one `[data-slot=level-meter]` of two tracks per strip, none in Rows or with the Meter off; variant, hold, readout and clip options; silence and no-meter without level data; the inputs), `registry/mixer-views.test.ts` (round trip, clamps, gates).
- The widget tests spy `useFastSensors` (the real store opens an `EventSource`) and `sensorStore.getValues` / `subscribe`: they assert the fast stream opens only for strips with Meter on, and that a sensor change reaches a strip's dB readout. `level-sources.test.tsx` covers `useDeviceLevel` (a change emits; an unchanged level and another plugin's change do not; no re-render). The Wave Link fixture's `useWavelinkMeter` now calls a hook, as the real one does.
- `npm run verify` exits 0: lint, actionlint, typecheck, unit (453 files), build, budgets, settings-build, server-bin, server-suite, lab, import-check, e2e, one-editor, cargo-server, stub-desktop, cargo-app all passed.
- Snapshot `refiled-widgets.schema.test.ts.snap` (VolumeMixer and WaveLink): only gains rows, the Meter group's new keys (and `meterBallistics` on VolumeMixer). No existing row moved, so the update is right.
- `tests/lib/__fixtures__/v8-parity.json` is unchanged.

## Budgets (`npm run perf:budgets`, Windows build)
| | HEAD (`aa00cbcc`, worktree build) | batch 8b | change |
|---|---|---|---|
| kiosk | 275760 B | 276358 B | +598 |
| studio | 615449 B | 616093 B | +644 |

- The budget file's entry budgets are CI's (Linux) bytes and this is the Windows delta, as in batch 8: confirm on the first CI run.
- Raised by exactly those deltas (`tools/perf/budgets.json`: kiosk 275610 to 276208, studio 615252 to 615896). The growth is the eager registry chunk: the new settings rows of the three mixers (the schema loads with the module list).
- The meter code is lazy: the `mixer-views` chunk went from 19.2 KB to 25.7 KB gzip and loads with the three widgets only. No new eager chunk, so the kiosk's request count is as before.

## Overflow probe
`scratchpad\refine\b8-overflow.mjs` (3 widgets × rows, strips, lcd × vertical and horizontal, at 1x1, 2x2, 4x2, 2x4 and 4x4): `of-b8b.json` with the defaults, `of-b8b-opts.json` with lg strips and LCD, console cap, card, badge, segmented meter, dB readout, clip light and scale after.
- Result: the same as batch 8, nothing new. Left: StreamMixer and VolumeMixer at 2x4 (the compact column summary, shared by every view, not touched), and StreamMixer's Base UI hidden `<input>` inside each thumb (meant to be clipped).
- The probe rule the marker relies on: `clippedContent` skips anything inside `[data-qa-bleed]` (`qa-geometry.ts`, `probe.ts`). The meter's track clips its sliding bar on purpose, and the probe counted that (up to 288 px). The track carries `data-qa-bleed`, the marker the probe already honours for art that bleeds, so it is skipped.
- Options run only: WaveLink at 1x1 (the rows view, the widget's own `LedLadder` with `meterVariant: segmented`, the shared key). Not in the defaults run, and in code this batch did not touch, so probably pre-existing; not checked against HEAD.

## Screenshots (`scratchpad\refine\shots\b8b\`)
- Sheets: `sheet-dark-4x4.png`, `sheet-light-4x4.png`, `sheet-paper-4x4.png`, `sheet-nixie-4x4.png` (each: the three widgets × strips vertical, strips horizontal, LCD vertical) and `sheet-2x2.png` (all four looks, strips both ways). Singles: `final\<look>_<widget>_<view>-<orientation>_<span>.png` (120).
- Options (segmented, dB readout, clip light) in dark: `options-4x4.png`, `options\`.
- Stills can't show motion. The demo data is the QA harness's; its Wave Link meters sit near silence, so the movement is best seen in a running kiosk. StreamMixer's Windows demo has no level-meter data, so its strips show no meter, as designed.
- Look at: VolumeMixer 4x4 vertical (the meters, zones in each theme); WaveLink 4x4 vertical (inputs, the two separators); the options sheet (readout and clip light in both orientations).

## Not done or uncertain
- `mixerGrid`'s inline template areas override `Mixer`'s class areas, and `[grid-area:separator-in]` relies on `twMerge` replacing `[grid-area:separator]`; the string output is unit-tested and the Wave Link test counts the two separators in the DOM.
- StreamMixer's apps have no level, so a Windows mixer shows meters only on Master and Mic (silence on the apps) when the plugin reports them.
- On a light surface the meter's amber and red are the theme's dark warn and crit (olive and dark red in the sheet): readable, but not as bright as on dark.
- A refused (`ReadOnly`) StreamMixer's clip light is still clickable (reset only); `inert` covers it where `ReadOnly` wraps the view.
