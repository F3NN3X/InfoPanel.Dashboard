# Audio visualiser: real input (plan)

Status: **approved 2026-10-13** (scope revised the same day: no Waviz presets, see §2). Research: `waviz-port-spec.md` (reference only),
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
  bugs (no destroy, orphan rAF loops, closes a passed AudioContext, no DPR scaling). **Not used.**

## 2. Decisions (user, 2026-10-13)

1. **Source: the plugin first, so it works with no setup.** The plugin captures what each output device
   plays (WASAPI loopback) and publishes bands: no permission, no virtual cable. Browser capture stays
   an opt-in extra for a 60 fps spectrum and a true waveform (profile set to Interactive once, then
   Allow in the web view's prompt, plus a loopback input). Plain levels come last.
2. **No Waviz presets.** Keep today's visualiser styles and make them fully customisable: colours,
   gradients, shape, motion. By default they follow the theme and skin. The Waviz porting spec stays as
   reference only.
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

### 3.3 Renderer (`src/widgets/core/viz/`)

- One engine draws every style:
  - canvas 2D, DPR-aware, sized by ResizeObserver
  - driven by the shared frame loop
  - paused off-screen and when the page is hidden
  - honours reduced motion
  - disposed on unmount
- **Styles** (today's, merged from the `mini` engine, the Visualizer widget and the bar visualizer):
  bars, mirror, wave, line, dots, radial, blob, plus a segmented (LED) bar shape.
- `wave` / `line` draw the true waveform with capture, else a smooth curve through the bands.
- Colours resolve CSS variables at draw time (accent, theme tokens, skin), so a theme or skin change
  repaints live without re-creating anything.

### 3.4 Look: follow the theme and skin, or customise

- **Follow** (default): the accent and the skin's tokens decide the look. The skin's `meter` style picks
  the bar shape (segments, blocks, pill, …) and its `glow` adds a glow. A light surface darkens the
  colours as the rest of the widget does.
- **Custom:**
  - colour mode: solid, a gradient (vertical, horizontal or radial) or a per-band ramp, with colours 1–3
  - peak-cap colour
  - opacity and glow
- **Shape and motion:** bar count, gap, roundness, mirror, orientation and alignment, sensitivity,
  smoothing (attack/release), minimum level, peak caps and hold.

### 3.5 Settings (studio)

- New keys only where no existing key covers it: the colour source (Follow / Custom), gradient mode,
  colours 2–3, peak colour, opacity, glow, gap, roundness and bar shape. Colours go in Style
  (advanced); shape and motion go in Content › Visualizer.
- Data tab: the device (existing `liveSource` / `device`) and capture (existing `liveCapture` /
  `liveSources`).
- **No renames.** Existing keys keep their meaning and map onto the engine's props:
  `waveformVariant`, `visualizerBarCount`, `visualizerMinLevel`, `visualizerAlign`,
  `visualizerOrientation`, `waveformSensitivity`, `vizRamp`, the Visualizer widget's `mode` / `bands` /
  `sensitivity` / `peaks` / `ramp`, and `LIVE_TUNING`. Existing configs render as before, now with real data.
- Applies everywhere a visualiser renders, through one `<AudioViz>`: NowPlaying (`progress=visualizer`,
  all engines), the Visualizer widget, GameSpotlight, the legacy bar visualizer.

## 4. Phases (build and tests green at the end of each)

| # | Phase | Output |
|---|---|---|
| V0 | Contracts + capture check | `spectrum` entry format frozen. The fast stream proven against the Data API. Capture verified in the kiosk web view (§6). |
| V1 | Plugin spectrum | `InfoPanel.AudioMeter` `feat/spectrum`: loopback, FFT, `spectrum` entry, config, test console, 1.3.0. Verified with a 1 kHz tone, which must peak in the right band. |
| V2 | Audio frame | Fast stream in `sensor-store`, `useAudioFrame` (capture → plugin → level), fabrication removed. Tests: spectrum parsing, interpolation, source selection, ref counting. |
| V3 | Renderer + look | `core/viz/` engine drawing every style, the Follow / Custom look, with tests. A `?viz-gallery` dev page renders every style and skin from a deterministic test signal. |
| V4 | Integration + settings | `<AudioViz>` in NowPlaying, Visualizer, GameSpotlight, bar visualizer. Inspector settings, migration from the legacy keys, FEATURE_MAP rows, docs. |
| V5 | Verification | Real-signal checks (tone and sweep through plugin and capture). The overflow sweep (cells 110/150, skins, variants). Performance (12 visualisers at 60 fps in the kiosk). Review ledger. |

## 5. Verification that it reacts to real audio

- **Plugin:** play a 1 kHz tone; the `spectrum` peak sits in the band containing 1 kHz. A 100 Hz → 10 kHz
  sweep walks the peak across the bands in order. Silence gives all zeros.
- **Dashboard:** the same tone on the live kiosk. The rendered bar heights (read back from the
  engine's frame) peak at the same band. Capture and plugin agree on the peak band.
- **No fabrication:** a test asserts that frames are built only from the frame inputs. For constant
  input, consecutive frames are identical once smoothing settles.

## 6. Capture in the kiosk (decided)

The InfoPanel fork stays unchanged. To use capture, set the profile to Interactive once and click
Allow in the web view's prompt. The studio's capture setting explains this in its help text.

## 7. Risks

- 10 Hz plugin frames soften transients. Mitigation: interpolation, and capture where available.
- FFT cost for several devices. Mitigation: skip silent devices and cap the band count.
- Wave / line styles show a band curve without capture. Mitigation: the studio labels it, and capture
  restores the true waveform.
- The plugin must be rebuilt and redeployed into InfoPanel before the dashboard can use bands. Until
  then the visualiser falls back to real levels.
