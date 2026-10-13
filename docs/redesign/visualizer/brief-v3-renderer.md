# Brief V3: one visualiser renderer, real dynamics, Follow / Custom look

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`, main checkout. Read
`CLAUDE.md`, `docs/redesign/visualizer/PLAN.md` (§3.3–3.5 are the spec), `src/lib/audio/spectrum.ts`,
`src/lib/audio/sensor-visual-source.ts`, `src/lib/audio/media-visual-source.ts`,
`src/hooks/use-media-visual-source.ts`, `src/lib/audio/frame-loop.ts`, `src/widgets/core/primitives.tsx`
(`stepBands`, `MiniViz`), `src/widgets/Visualizer.tsx`, `src/widgets/core/media-progress.tsx`,
`src/components/ui/bar-visualizer.tsx`, `src/components/ui/live-waveform.tsx`,
`src/widgets/NowPlaying/settings.ts`, `src/widgets/registry/c.ts`,
`src/widgets/registry/settings-kit.ts`, `src/widgets/core/theme.ts` (`useSkin`, `accentOf`,
`rampColor`) and the skin packs in `src/widgets/core/skins/*.ts` (tokens `meter`, `glow`, `accent`).

Verify with `npm run typecheck` (never bare `npx tsc`), `npm test` and `npm run build`, reading each exit
code directly (no pipes). Conventional commits, explicit `git add <paths>`, no trailers, never override
the author, no push. Dev server: `http://localhost:5199` is already running (do not start another).
The live Data API at `http://127.0.0.1:3921` carries real `plugins.audio-level-meter.<dev>.spectrum`
values (32 bands, 0..100), so you can check against real music.

## Facts you need
- The AudioMeter plugin publishes `spectrum`: 32 log-spaced bands from 30 Hz to 16 kHz, each
  `clamp((dB + 80) / 80) * 100` (dBFS, -80 floor). `parseSpectrum` returns 0..1. On a 100 ms stream
  (`useFastSensors`).
- Real music sits at about 0.3–0.55 (-56 to -36 dB), with the treble 15–25 dB under the bass. That's
  why the bars look compressed today.
- Capture (`liveCapture` + `liveSources`) gives a 60 fps `VisualFrame` with FFT `bands` and a
  `timeDomain` waveform.
- **Nothing may be synthesised.** No `Math.random`, no time-driven sine carrier, no seeded shapes.
  Every pixel derives from bands, waveform or levels (plus easing). Decorative idle animation is off.

## 1. Engine — `src/widgets/core/viz/`
- `types.ts`:
  - `VizStyle = "bars" | "mirror" | "wave" | "line" | "dots" | "radial" | "blob" | "scroll"`
    (scroll = the level-history waveform of the old `waveform` engine's scrolling mode)
  - `VizLook`: every option in §3
  - `VizInput`: `{ bands: Float32Array; wave: Float32Array | null; history: { buf, start, length };
    level: number; source: "capture" | "plugin" | "level" | "none" }`
- `dynamics.ts` (pure, tested): `shapeBands(raw0to1, out, { floorDb, ceilDb, tiltDb, autoGain, state })`:
  - convert back to dB (`v * 80 - 80`)
  - add the tilt: `tiltDb * log2(fc / 1000)` per band, where `fc` is the band's log centre between
    30 and 16 000 Hz for N bands
  - map `floorDb..ceilDb` to 0..1
  - auto-gain: a slow peak follower (attack ~150 ms, release ~3 s) that scales so the loudest band
    sits near 0.9, never boosting silence (below floor stays 0)
  - defaults: floor -60, ceil -12, tilt +3 dB/oct, auto-gain on
  - also `easeBands(cur, target, dtMs, attackMs, releaseMs)`, dt-based, not per-frame constants
- `palette.ts` (pure where possible, tested): resolves the colours each frame.
  - **Follow:** the zone's accent (`accentOf`), the track (`--w-track`) and the skin (`useSkin()`:
    `meter` → bar shape, `glow` → glow).
  - **Custom:** `solid` (colour 1); `gradient` (colours 1→2→3, vertical / horizontal / radial);
    `ramp` (per-band colour by value, the existing `rampColor` names, or colours 1→3).
  - CSS strings, including `var(--x)` and `color-mix()`, are resolved through a hidden probe element
    (as `MiniViz` does for `--w-track`) and re-resolved at most every 500 ms, so a theme or skin
    change repaints live.
- `draw.ts`: one function per style on a 2D context, inputs `(ctx, w, h, input, palette, look)`.
  Port the existing drawings from `MiniViz` and `Visualizer` (bars, mirror, dots, radial, blob) and
  the bar visualizer / live waveform (bar shapes, scroll). Wave and line:
  - with capture, draw the `wave` time domain
  - without it, draw a smooth curve through the shaped bands (Catmull-Rom). `wave` is mirrored
    around the centre line with 2–3 layered strokes at decreasing opacity; `line` is a single stroke.

  No time-based carrier. Bar shapes:
  - `round` (rounded caps)
  - `square`
  - `segments` (LED cells; segment height ~3 px, gap 1 px)
  - `pill`
  - `auto` = from the skin's `meter` token: segments/blocks → segments, pill → pill, square → square,
    else round

  Peak caps with hold. `orientation` vertical/horizontal; `align` start/center/end; `mirror` (for
  bars). `minLevel` keeps a resting bar.
- `engine.ts`: `createVizEngine(canvas)` with `setInput(getter)` / `setLook(look)` / `dispose()`.
  - It draws in the shared frame loop's paint phase.
  - DPR-aware sizing from a ResizeObserver, paused off-screen (IntersectionObserver) and when hidden.
  - `prefers-reduced-motion` → no easing (it jumps to targets) and no peak fall animation.
  - Full cleanup.
- `AudioViz.tsx`: `<AudioViz style look input className aria-label>`.
- `use-viz-input.ts`: `useVizInput({ data, device, captureDeviceId?, look })` returns a stable getter.
  - The plugin path: `spectrumOf` / `levelDevice` from `src/widgets/audio-device.ts`, shaped by
    `dynamics`, eased per frame in the update phase.
  - The level path: the plugin before 1.3.0 or spectrum off; every band = the level shaped by the
    same dynamics.
  - The capture path: the existing `useMediaVisualSource`. Its FFT bands also go through the same
    dynamics, with tilt and range.
  - `source` reports which one is live.
  - `history` is the eased broadband level, one sample per 50 ms, for `scroll`.

## 2. Integration (one renderer everywhere)
- `MediaProgress` `mode="visualizer"`: every engine renders `<AudioViz>`.
  - `mini` + `vizMode` → that style.
  - `bars` engine → `bars`/`mirror` with `visualizerBarCount` / `visualizerAlign` /
    `visualizerMinLevel` / `visualizerOrientation`.
  - `waveform` engine → `scroll` when `waveformMode=scrolling`, else `bars`, with the `waveformBar*` /
    `waveformLineWidth` / `waveformFadeEdges` / `waveformFadeWidth` values.
  - Capture rows (`captureDevices`) stay, one labelled row per device, each an `<AudioViz>` with its
    capture input.
- The `Visualizer` widget renders `<AudioViz>` (all its modes).
- Remove after migration: `MiniViz`, `stepBands`/`BandState`/`NEUTRAL_SENS` (move their tests to
  `dynamics`/`draw` equivalents; don't weaken them), the Visualizer's own canvas loop,
  `components/ui/bar-visualizer.tsx`, `components/ui/live-waveform.tsx`, and `lib/audio/bar-levels.ts`
  / `sensor-visual-source.ts` / `history-playback.ts` if nothing else imports them (grep, including
  `ui-preview`). Keep their tests' intent by porting them.

## 3. Settings (inspector; no renames, no changed defaults)
- New keys, added to the **NowPlaying template** and the **Visualizer widget** only (legacy alias
  settings arrays must not change; aliases render with the defaults, which follow the theme and skin).
  Use the `settings-kit` builders. Group "Visualizer"; colours in Style, advanced.
  - `vizColorMode` select follow|solid|gradient|ramp, default `follow`
  - `vizGradient` select vertical|horizontal|radial, default `vertical`, visible for gradient
  - `vizColor2`, `vizColor3` (colour 1 is the existing `vizRamp` on NowPlaying / `ramp` on the
    Visualizer: keep those keys, and keep their ramp-name values working in `ramp` mode)
  - `vizPeakColor`
  - `vizOpacity` 10–100, default 100
  - `vizGlow` auto|on|off, default auto
  - `vizShape` auto|round|square|segments|pill, default auto
  - `vizGap` 0–80 (% of the bar slot), default 30
  - `vizFloorDb` -90…-30, default -60
  - `vizCeilDb` -30…0, default -12
  - `vizTilt` 0–6 dB/oct, default 3
  - `vizAutoGain` bool, default true
  - `vizAttack` 10–500 ms, default 60
  - `vizRelease` 50–2000 ms, default 300
  - NowPlaying also gets `vizPeaks` (bool, default false). The Visualizer keeps `peaks`.
- Extend the style options (additive): NowPlaying `waveformVariant` gains `radial`, `blob`, `scroll`;
  the Visualizer `mode` gains `line`, `scroll`.
- `toProps` maps every key into a `VizLook`. Schema tests (`registry/c.schema.test.ts`) must still
  pass. Update `MANIFEST` only where a prop is genuinely new, and add the new keys to the inspector
  category tests if they assert counts.
- Help text on the capture setting: "Needs the profile set to Interactive once, then Allow in the
  prompt; captures an input device (a loopback such as a Wave Link output)." On the dynamics group:
  "Real spectrum from the AudioMeter plugin (v1.3.0+)".

## 4. Dev gallery and tests
- `?viz-gallery` (lazy, like `?widget-qa`): every style × Follow under 4 skins (default, synth, retro,
  ios) + 3 Custom looks, at 110 and 150 cells, from a deterministic labelled **test signal**: a fixed
  pink-ish spectrum stepping through 4 frames. It's a dev QA input, never production.
- Unit tests:
  - `dynamics`: floor/ceil mapping, tilt per band, auto-gain convergence, never boosting silence,
    dt-based easing
  - `palette`: the follow/solid/gradient/ramp stop lists, the skin `meter` → shape mapping
  - the `draw` geometry helpers: band rects for count/gap/align/orientation, segment counts
  - `use-viz-input` source selection (capture > plugin > level > none)
  - "no synthesis": a constant input gives identical consecutive frames once eased, and silence draws
    no bars above `minLevel`
- Run the overflow probe on `?widget-qa&module=NowPlaying,Visualizer,mediamodern,spotifymodern`
  at cells 110/150 with skins default/synth/retro/ios. It must report 0 rows and 0 error tiles.
- Screenshot the gallery and the live kiosk (`?kiosk=1&profile=strip-1920x550`) to the scratchpad
  `C:\Users\joransrb\AppData\Local\Temp\claude\E--GitHub-MyRepos-InfoPanel-Dashboard\8932d894-4e1a-42be-b593-b48f958dd3d0\scratchpad\v3-*.png`.

## 5. Docs
`docs/widget-settings.md` (visualiser keys and dynamics), `docs/architecture.md` (the viz engine
replaces MiniViz / BarVisualizer / LiveWaveform), and FEATURE_MAP rows for the visualiser (repoint
any that name a removed component). Commit in logical steps, e.g. `feat: viz engine and dynamics`,
`feat: one renderer for every visualiser`, `feat: visualiser look settings`,
`chore: remove the old visualiser renderers`, `docs: …`.

Report in ≤12 lines: commits, the settings added, the files removed, the test/build exit codes, the
probe result, the screenshot paths, and anything not done.
