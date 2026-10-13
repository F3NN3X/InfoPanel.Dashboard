# Audio visualiser: real input + Waviz presets (plan)

Status: **draft, awaiting approval**. Research: `waviz-port-spec.md` (the renderer and all 29 presets),
`webview2-mic.md` (capture inside the InfoPanel web view).

## 1. Where we are

- The levels are real but arrive at 1 Hz: `audio-level`, `left-channel`, `right-channel` from the
  AudioMeter plugin, over the shared 1000 ms stream. The motion between pushes is local easing.
- **The spectrum is fabricated.** The `mini` engine and the Visualizer widget use a fixed envelope times
  sine wobble (`stepBands`). The `bars`/`waveform` engines use `trackPeaks`, a pattern seeded from the
  track and artist text. Nothing uses `Math.random`.
- Only the opt-in capture path (`liveCapture` + `liveSources`, `getUserMedia` → `AnalyserNode`) is real.
- The Data API has no band data. `InfoPanel.AudioMeter` reads `IAudioMeterInformation` (peak meters),
  so it never sees samples. It updates every 50 ms.
- Waviz (npm `waviz` 1.0.0, MIT) only analyses audio it owns (an element, a MediaStream, the microphone,
  tab audio). It cannot take pushed data. It is dormant, about 180 downloads a week, and has lifecycle
  bugs (no destroy, orphan rAF loops, closes a passed AudioContext, no DPR scaling). **We port its
  layer model and presets; no dependency.**

## 2. Decisions (user, 2026-10-13)

1. **Source: both, capture first.** Browser capture when it is available (60 fps, a real waveform and
   spectrum); the plugin's bands everywhere else (10 Hz, interpolated); plain levels last.
2. **Waviz: port its design.** Our own renderer with its layer model and all 29 gallery presets, fed by
   our data and coloured by theme, skin or custom colours. Attribution: MIT, "Copyright (c) 2025 Waviz Team".
3. **No spectrum: real level only.** Without bands, the bars move together with the true level, and
   the studio shows a "no spectrum source" hint. Nothing invented. `trackPeaks`, `stepBands` and the
   sine wobble go.
4. **Plugin changes** in `InfoPanel.AudioMeter`, on a feature branch, with every existing entry kept.

## 3. Design

### 3.1 Audio frame (one per device, shared by every zone that shows it)

```ts
interface AudioFrame {
  source: "capture" | "plugin" | "level" | "none";
  bands: Float32Array;        // N log-spaced bands, 0..1 (capture: from the FFT; plugin: `spectrum`; level: N copies of the level)
  wave: Float32Array | null;  // time domain, -1..1 (capture only)
  level: number; l: number; r: number; // 0..1
}
```
- `useAudioFrame(device, capture?)` is ref-counted per device, so one capture or subscription serves
  every zone. It reads into a ref on the existing shared frame loop (`lib/audio/frame-loop.ts`), with
  no React re-render per frame.
- **Capture:** the existing `media-visual-source` (`getUserMedia({deviceId: exact})` → analyser). The
  settings keep the existing keys `liveCapture` / `liveSources`. A capture input is an input device (a
  Wave Link output, Stereo Mix, a virtual cable), not the render device the plugin meters.
- **Plugin:** the new `spectrum` entry (§3.2), streamed at 100 ms. Frames are interpolated in the frame
  loop between pushes, with the attack/release from the existing `LIVE_TUNING`.
- **Level:** the existing level keys, on the same fast stream.
- `sensor-store` gains a fast stream: `plugins.audio-level-meter.` gets its own `interval=100` stream
  (not folded into the merged `plugins.` stream) while a visualiser retains it. The connection budget
  (six per host) is checked in the planner.

### 3.2 Plugin (`InfoPanel.AudioMeter`, branch `feat/spectrum` from `1.2.0-dev`)

- WASAPI loopback capture per active render device (raw COM, as the plugin already does for meters:
  `IAudioClient` with `AUDCLNT_STREAMFLAGS_LOOPBACK` → `IAudioCaptureClient`) on a background thread.
- FFT: 2048-point Hann, mono mix. Bands are log-spaced from 30 Hz to 16 kHz, in dB with a -80 dB floor,
  mapped to 0..1. A small radix-2 FFT, no new dependency.
- A new entry per device: `spectrum` (PluginText, comma-separated integers 0..100, N values; default
  N=32). That keeps the frame to one key, atomic per push, and cheap in the stream.
- Config: `SpectrumEnabled` (default on), `SpectrumBands` (16–64), `SpectrumMinHz` and
  `SpectrumMaxHz`. Devices that are silent or below the floor publish zeros and skip the FFT.
- Existing entries and keys stay unchanged. Version 1.3.0, CHANGELOG, README, and the test console
  prints the spectrum.

### 3.3 Renderer (`src/widgets/core/viz/`, ported from Waviz)

- The layer model:
  - `domain` (`time` or `freq`, amplitude, range, window: hann, hamming or exponential)
  - `coord` (`rect` or `polar`, with radius, rotation and spin)
  - `viz` (line, bars, dots, particles)
  - `colour` (solid, linear or radial gradient, palette)
  - `stroke` / `fill`

  Pure functions with unit tests, as in `waviz-port-spec.md` §A.
- Without capture, `time` layers read the spectrum as their curve (real data, a different picture).
  The studio says so beside the preset.
- One engine per canvas:
  - DPR-aware, sized by ResizeObserver
  - driven by the shared frame loop
  - paused off-screen and when the page is hidden
  - honours reduced motion
  - fully disposed on unmount
- Colours resolve CSS variables at draw time (accent, theme tokens, skin), so a theme or skin change
  repaints live without re-creating anything.
- Waviz's bugs are not reproduced (spec §D): the shared particle pool, dashes leaking between layers,
  inert colour props (Bar6, Dots3/4, Mixed1/5), the `randomPalette` hole, and the frozen spawn loop.

### 3.4 Presets

- **All 29 gallery presets:** Bars 1–6, Waves 1–7, Dots 1–4, Particles 1, Mixed 1–11. Each is a layer
  stack (spec §C) whose colour slots map to "Follow" (accent / skin) or custom colours.
- **The existing modes become presets** (bars, mirror, wave, dots, line, radial, blob, LED, the bar
  visualizer styles), so stored configs keep their look.

### 3.5 Settings (studio)

- New keys (Content › Visualizer):
  - `vizPreset`
  - `vizColors` (Follow / Custom) with `vizColor1..3` (Style, advanced)
  - `vizCount`, `vizSensitivity`, `vizSmoothing`, `vizRadius`, `vizRotation`, `vizSpin`, `vizStroke`
- Data tab: the device (existing `liveSource` / `device`) and capture (existing `liveCapture` /
  `liveSources`).
- **No renames.** Existing keys keep their meaning and map onto the new props:
  `waveformVariant`, `visualizerBarCount`, `visualizerMinLevel`, `visualizerAlign`,
  `visualizerOrientation`, `waveformSensitivity`, `vizRamp`, the Visualizer widget's `mode` / `bands` /
  `sensitivity` / `peaks` / `ramp`, and `LIVE_TUNING`. An unset `vizPreset` is derived from them, so
  existing configs render as before, now with real data.
- Applies everywhere a visualiser renders, through one `<AudioViz>`: NowPlaying (`progress=visualizer`,
  all engines), the Visualizer widget, GameSpotlight, the legacy bar visualizer.

## 4. Phases (build and tests green at the end of each)

| # | Phase | Output |
|---|---|---|
| V0 | Contracts + capture check | `spectrum` entry format frozen. The fast stream proven against the Data API. Capture verified in the kiosk web view (§6). |
| V1 | Plugin spectrum | `InfoPanel.AudioMeter` `feat/spectrum`: loopback, FFT, `spectrum` entry, config, test console, 1.3.0. Verified with a 1 kHz tone, which must peak in the right band. |
| V2 | Audio frame | Fast stream in `sensor-store`, `useAudioFrame` (capture → plugin → level), fabrication removed. Tests: spectrum parsing, interpolation, source selection, ref counting. |
| V3 | Renderer | `core/viz/` layer engine and math, with tests. Attribution header. |
| V4 | Presets | 29 Waviz presets + existing modes as presets. A `?viz-gallery` dev page renders every preset from a deterministic test signal. |
| V5 | Integration + settings | `<AudioViz>` in NowPlaying, Visualizer, GameSpotlight, bar visualizer. Inspector settings, migration from the legacy keys, FEATURE_MAP rows, docs. |
| V6 | Verification | Real-signal checks (tone and sweep through plugin and capture). The overflow sweep (cells 110/150, skins, variants). Performance (12 visualisers at 60 fps in the kiosk). Review ledger. |

## 5. Verification that it reacts to real audio

- **Plugin:** play a 1 kHz tone; the `spectrum` peak sits in the band containing 1 kHz. A 100 Hz → 10 kHz
  sweep walks the peak across the bands in order. Silence gives all zeros.
- **Dashboard:** the same tone on the live kiosk. The rendered bar heights (read back from the
  engine's frame) peak at the same band. Capture and plugin agree on the peak band.
- **No fabrication:** a test asserts that frames are built only from the frame inputs. For constant
  input, consecutive frames are identical once smoothing settles.

## 6. Open item for the user

- **Capture in the kiosk.** Either patch the InfoPanel fork to auto-grant the microphone
  (`DisplayWindow.WebView.cs`: allow `PermissionKind.Microphone` in `PermissionRequested`, 3 lines), or
  set the profile to Interactive once and click Allow in the web view's prompt. A loopback input device
  is needed for system audio either way.

## 7. Risks

- 10 Hz plugin frames soften transients. Mitigation: interpolation, and capture where available.
- FFT cost for several devices. Mitigation: skip silent devices and cap the band count.
- Time-domain presets look different on spectrum data. Mitigation: the studio labels it, and capture
  restores the true waveform.
- The plugin must be rebuilt and redeployed into InfoPanel before the dashboard can use bands. Until
  then the visualiser falls back to real levels.
