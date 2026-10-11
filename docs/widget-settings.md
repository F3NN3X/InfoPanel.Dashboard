# Widget Settings (Standardized)

The schema, controls, and shared block behind every widget's **Advanced
settings** in the studio. One reference for: what a setting *is*, what every
widget gets for free, and how a new widget adopts it.

Companion to [`studio-redesign-zones-widgets.md`](studio-redesign-zones-widgets.md)
(the why) and [`module-catalog.md`](module-catalog.md) (the what, per module).

## The setting schema

A module declares `settings: ModuleSetting[]` (`src/modules/types.ts`). The
studio's Advanced inspector renders one control per entry
(`SettingsPanel`); values are stored **per placement**
(`Placement.settings`) and merged over the defaults at render time via
`effectiveSettings`.

| `type` | Control | `value` | Extra fields |
|---|---|---|---|
| `text` | text input | string | — |
| `number` | slider (when `min`/`max` set), else number field | number | `min`, `max`, `step` |
| `select` | segmented (≤ 4 options) else dropdown; `multiple: true` renders a checkbox list (value stored comma-separated) | string option value | `options[]`, `optionsFrom: "sources"` + `sourcePlugin` (live sensor device list — see below), or `optionsFrom: "media"` (the browser's audio-capture devices) |
| `boolean` | toggle | boolean | — |
| `color` | native color picker | `#rrggbb` (empty = auto) | — |
| `icon` | icon grid (18 lucide icons + "none") | icon key from `lib/widget-icons.ts` | — |
| `image` | URL field + live thumbnail | image URL (empty = none) | — |

### Presets (select options with `applies`)

A `select` option can carry an `applies` bundle: extra key/values persisted
**alongside** the option's own value when it is chosen. The bundle is a
one-click style preset — the individual options stay editable afterwards.
Bundles apply to keys the module declares; unknown keys are saved and
harmlessly ignored by `effectiveSettings`.

```ts
{
  key: "preset", label: "Preset", type: "select", default: "default",
  options: [
    { value: "default", label: "Default" },
    { value: "dark", label: "Dark",
      applies: { surface: "matte-dark", tint: false } },
    ...
  ],
}
```

### Dynamic source select (`optionsFrom: "sources"`)

A `select` can skip static `options[]` and derive its list **live from the
sensor stream** — for binding a widget to one device/container of a plugin:

```ts
{
  key: "source", label: "Source (device)", type: "select",
  default: "", // "" = all sources
  optionsFrom: "sources",
  sourcePlugin: "plugins.audio-level-meter.",
},
```

The studio threads the live `sensors` map into `SettingsPanel`, which
resolves the option list with `sourceOptions(sensors, sourcePlugin)`
(`lib/sources.ts`): every container the plugin is currently pushing, labeled
by `containerLabel` (`default-audio` reads "Default device"). The value
stored per placement is the container id (`""` = show all devices); the
module's `render` filters its groups to that container when set.

## The standard block (`STANDARD_SETTINGS`)

Every adaptive (modern) widget spreads
`STANDARD_SETTINGS` (`src/modules/standard-settings.ts`) into its
`settings`, so every widget offers the same core customization:

| key | type | default | what it does |
|---|---|---|---|
| `preset` | select | `default` | one-click bundle — see presets below |
| `layout` | select | `auto` | auto / card / standard / compact / simple |
| `surface` | select | `glass` | glass / matte-light / matte-dark |
| `label` | text | `""` | custom title line (empty = the widget's own header) |
| `icon` | icon | `""` | header icon (empty = none) |
| `accent` | color | `""` | accent for fills / header icon (empty = auto) |
| `background` | image | `""` | background image URL |
| `backgroundOn` | boolean | `false` | use that image behind the surface |

Module-specific options follow the standard block and keep their own keys
(`tint`, `showTimes`, `forecastDays`, `dimBanner`, `maxRows`, …).

### Presets

| preset | applies |
|---|---|
| `default` | — (the module's own defaults) |
| `dark` | `surface: matte-dark`, `tint: off` |
| `light` | `surface: matte-light`, `tint: off` |
| `vivid` | `surface: glass`, `tint: on` |
| `mono` | `surface: matte-dark`, `tint: off`, `accent: #fafafa` |

### View presets (per-widget `view` select)

The standard `preset` select is **style-only** (surface / tint / accent).
Widgets that offer more than one *layout* get a separate module-specific
`view` select whose options also use `applies` bundles — a one-click layout
preset that sets the module's own option keys:

```ts
// hardware-modern.tsx — "Temp gauges" flips the widget to arc gauges
{
  key: "view", label: "View", type: "select", default: "list",
  options: [
    { value: "list", label: "Reading list" },
    { value: "temps", label: "Temp gauges", applies: { showFans: true } },
  ],
},
```

Picking a `view` option persists both the option's own value **and** the
`applies` bundle, so the studio stores a complete, editable state. The
module's `render` reads `cfg.view` (and the toggles the bundle set) and
forwards them to the component. Every widget that ships a `view` select
targets only keys it declares itself.

Current `view` families:

| widget | `view` options |
|---|---|
| `systemmodern` | `rings` / `trends` (→ `sparkline`) |
| `hardwaremodern` | `list` / `temps` (→ `showFans`) |
| `fpsmodern` | `gauge` / `trend` (→ `sparkline`) |
| `audiomodern` | `meter` / `audiometer` (pro dB meter) / `volume` |
| `bluetoothmodern` | `full` / `devices` / `status` |
| `weathermodern` | `full` / `now` / `forecast` / `minimal` |
| `networkmodern` | `speeds` / `totals` (→ `showTotals`, `sparkline`) |

## The audiocn views

The audio + media widgets can render with the vendored **audiocn**
audio-visualization library (`src/lib/audio/*`, `src/components/ui/` —
`LevelMeter`, `DbReadout`, `DbScale`, `ClipIndicator`, `Waveform`,
`LiveWaveform`, `BarVisualizer`). Those components read CSS custom
properties as *colors*, so `index.css` defines the page-level color vars
they need (`--meter-ok|warn|clip`, `--channel-*`, `--wave-progress|unplayed|cursor`),
each wrapped in `hsl(var(--token))` so the runtime theme engine keeps
working. The live canvas components (`LiveWaveform`, `BarVisualizer`)
paint with the element's *text color*, so they inherit the widget
surface's foreground and work on every surface style with no extra vars.

### Pro level meter — `audiomodern`, `view: "audiometer"`

Real level metering off the plugin's dB sensors: `LevelMeter` is fed
declaratively from `peak-level` / `rms-level` (`minDb −60`, `maxDb 0`;
silence, −96 dB, reads **−∞** on the `DbReadout`). The percentage
readout stays the VU-curve value; the dB values are the plugin's raw
measurements. Options:

| key | options | default |
|---|---|---|
| `meterVariant` | solid / segmented / gradient | `solid` |
| `meterOrientation` | horizontal / vertical | `horizontal` |
| `meterBallistics` | peak (fast attack + peak-hold) / vu (slow) / instant | `peak` |

In stacked (card) layouts a vertical meter renders *inline* (short meter +
readout on one line per device) so many devices fit; the standard layout
keeps full-height columns.

### Live waveform — `spotifymodern` / `mediamodern`, `waveform: true`

Renders the audiocn **`LiveWaveform`** in place of the progress bar (card +
standard layouts; compact / simple keep the progress pill / bar), so it
animates in real time. The sensor stream carries no clip peaks, so it is
fed by a small frame source (`lib/audio/sensor-visual-source.ts` +
`hooks/use-sensor-visual-source.ts`):

- the **level** is live data — the AudioLevelMeter plugin's `audio-level`
  (VU %) for the device chosen in `liveSource`, smoothed at 20 fps with
  VU-style ballistics (fast attack, slow release) so the bars move
  between the ~1 Hz sensor pushes;
- the band **shape** is a stable, decorative per-track shape
  (`lib/waveform-peaks.ts` — seeded from the track/artist text), scaled by
  the live level;
- `scrolling` mode scrolls the smoothed level history (each history entry
  is one 50 ms sample, so the scroll speed is real-time);
- when the audio plugin is absent (or the level settles at silence) the
  source sleeps and the component shows its idle state — no wasted frames.

| key | options | default |
|---|---|---|
| `waveform` | on / off | `off` |
| `liveSource` | audio device (live container select); `""` (the default) = all devices → the **loudest** live device wins, so music routed to a virtual / secondary device (e.g. Elgato Virtual Audio) still drives the visualizer; pin a device to meter just it | `""` (all) |
| `waveformVariant` | bars / line / mirror | `bars` |
| `waveformMode` | scrolling (level history) / static (current bands) | `scrolling` |
| `waveformBarWidth` | 1–12 px | `3` |
| `waveformBarGap` | 0–8 px | `1` |
| `waveformBarRadius` | 0–8 px | `1.5` |
| `waveformMinBarHeight` | 0–40 px | `4` |
| `waveformLineWidth` | 0.5–6 px | `1.5` |
| `waveformFadeEdges` | on / off | `on` |
| `waveformFadeWidth` | 0–200 px | `24` |
| `waveformSensitivity` | 0.1–4 (visual gain) | `1` |
| `waveformActive` | on / off (off = idle dotted line) | `on` |

### Bar visualizer — `spotifymodern` / `mediamodern`, `visualizer: true`

Renders the audiocn **`BarVisualizer`** in place of the progress bar,
fed by the same live level source as the waveform (the per-track shape is
resampled to the bar count, so the bars read as a live spectrum of the
track; when both `waveform` and `visualizer` are on, the bar visualizer
wins). Bars paint on the animation frame without re-rendering React; with
no signal the `visualizerIdle` animation runs.

| key | options | default |
|---|---|---|
| `visualizer` | on / off | `off` |
| `visualizerBarCount` | 4–64 | `24` |
| `visualizerAlign` | center / start / end | `center` |
| `visualizerMirrored` | on / off | `off` |
| `visualizerMinLevel` | 0–0.5 (resting bar size) | `0.08` |
| `visualizerIdle` | static / pulse / wave | `static` |
| `visualizerLoading` | on / off (sweep animation) | `off` |
| `visualizerOrientation` | horizontal / vertical | `horizontal` |

### Live capture (Web Audio) — `liveCapture: true`, `liveSources`

The default live level comes from the Data API's sensor stream (the
AudioLevelMeter plugin), which the dashboard receives at ~1 Hz — plenty for a
calm meter, but the waveform / bars trail the music. **Live capture** bypasses
that ceiling: the widget reads the chosen audio *capture* device directly
through the browser's Web Audio API (`getUserMedia` + an `AnalyserNode`), at
the display's native frame rate. Each pinned device is a real, independent
source with its own spectrum, so several can be shown at once.

- `liveCapture` (boolean, off) — switch the visualizers from the sensor stream
  to Web Audio capture.
- `liveSources` (multi-select, `optionsFrom: "media"`) — the capture devices
  to pin, **one labeled visualizer row each** (stacked). With `liveCapture` on
  and no devices pinned, it falls back to the single sensor row; with
  `liveCapture` off the sensor row is always used.

The device list comes from `enumerateDevices()` (the studio's
`MediaDevicePicker`), so it reflects the capture devices present on the
machine (e.g. the Elgato Virtual Audio / Wave Mic capture side that music is
routed to) — no Data API involved. Labels resolve once the microphone permission
is granted: the studio offers an "Enable microphone access" button, and the
kiosk's WebView2 auto-grants it via a `PermissionRequested` handler
(`KioskWindow.cs`).

| key | options | default |
|---|---|---|
| `liveCapture` | on / off | `off` |
| `liveSources` | capture devices (one labeled row each); `""` = fall back to the sensor row | `""` |

The audiocn views are options on the modern widgets only (the classic
`audio` / `spotify` / `media` modules were retired in the 2026-10-09
cleanup). The static `Waveform` component remains vendored but is no longer
used by the widgets (the `waveform` view is now live).

## Shared primitives

Two small libraries back the trend/gauge looks (the reference dashboards'
"history" sparklines and temp-gauge cards):

- **`lib/sparkline.tsx`** — `useHistory(value, size)` keeps a rolling window
  of the last `size` *changed* samples (same number doesn't flatten the
  line); `Sparkline` renders it as an SVG trend line with a soft gradient
  fill. Used by `ModernSystem`, `ModernFps`, `ModernNetwork`.
- **`lib/gauge.tsx`** — `ArcGauge` (a 270° arc, value colored by the
  caller), plus `tempColor(t)` (green → amber → red at 55 / 70 / 85 °C) and
  `tempWord(t)` (`Cool` / `Normal` / `Warm` / `Hot`). Used by
  `ModernHardware` in its "temps" view.

## The chrome layer (`ModernChrome`)

`components/modern-chrome.tsx` renders the standard keys identically in
every modern widget; each component wraps its body in it:

```tsx
<div ref={ref} className={cn("h-full w-full", className)}>
  <ModernChrome chrome={chrome}>{body}</ModernChrome>
</div>
```

- **Background image** — when `backgroundOn && background`, the image sits
  behind the surface (`object-cover`, dimmed with a `black/45` overlay).
  Glass surfaces let it show through; matte surfaces cover it (intended).
  Steam: a game banner always wins; the user's image is the fallback when
  there is no banner.
- **Header** — an icon + custom-title line, top-left, only when set.
- **Accent** — exposed to the widget as the `--wp-accent` CSS variable;
  components opt in per element, e.g.
  `background: "var(--wp-accent, #34d399)"` — the widget's default when the
  user picks no accent.

Where the accent lands per widget:

| widget | accent tints |
|---|---|
| `ModernNowPlaying` (media/spotify) | progress fill (overrides the surface fill) |
| `ModernWeather` | the big temperature |
| `ModernSteam` | the big total-playtime |
| `ModernFps` | the ring track (value arc keeps its semantic color) |
| `ModernAudio` | level bar fill (red > 85% stays semantic) |
| `ModernBluetooth` | battery bar fill (green tier; amber/red stay) |
| `ModernHardware` | the "other" kind-dot |
| `ModernNetwork` | the utilization bar (DL/UL keep their green/blue) |

The module builds the `chrome` prop from resolved settings with the shared
`chromeOf(cfg)` helper (`standard-settings.ts`).

## Adopting the standard block (new widget)

Three steps, all in the module file:

```ts
import { chromeOf, STANDARD_SETTINGS } from "./standard-settings";

settings: [
  ...STANDARD_SETTINGS,
  { key: "tint", label: "Tint from cover art", type: "boolean", default: true },
],

render: (sensors, s) => {
  const cfg = effectiveSettings(myModule, s);
  return (
    <MyComponent
      /* data props… */
      layout={String(cfg.layout) as ModernVariant | "auto"}
      surfaceStyle={String(cfg.surface) as ModernStyle}
      chrome={chromeOf(cfg)}
    />
  );
},
```

And in the component: add `chrome?: ModernChrome` to the props, wrap the
body in `<ModernChrome chrome={chrome}>` (keep the measuring `ref` on the
outer div), and opt accent-sensitive elements in with
`var(--wp-accent, <default>)`. Layout / surface / preset / title / icon /
background then work everywhere with no further code.

## Extending

- **New control type** — add it to the `ModuleSetting.type` union, a case in
  `SettingsPanel`, and (if it takes extra data) fields on `ModuleSetting`.
  The renderer is fully schema-driven; nothing else changes.
- **New icon** — one line in `lib/widget-icons.ts` (`WIDGET_ICONS`); it
  shows up in every icon picker.
- **New preset** — an option with `applies` on the standard `preset`
  select; it applies to every module that declares those keys.

## The studio Sources view

The studio toolbar has a **Sources** button that swaps the canvas for a
two-pane manager (`components/studio/sources-panel.tsx`), modeled on
InfoPanel's own Sources tab:

- **Left — catalog.** Every plugin the host is currently exposing, with the
  sources (containers) each pushes, derived **live from the sensor stream**
  (`groupSources`, `lib/sources.ts`). Search filters across plugin names,
  source labels, and container ids; each plugin group collapses; each source
  row has an eye toggle (show/hide) and a live value chip.
- **Right — detail.** The selected source's live entries (key / value table),
  a display-name override, the show-in-dashboard toggle, and a
  **bind-to-widget** action: pick any placement whose module declares a
  compatible `source` setting (same plugin scope) and point it at this
  source.

All state is dashboard-side. The Data API is read-only towards InfoPanel's
plugins, so this view configures what the dashboard *shows* — it never reconfigures InfoPanel plugins; their
own settings stay in InfoPanel's Sources tab.

- **Source preferences** — `config.sourcePrefs` on `DashboardConfig`
  (`lib/layout.ts`), persisted with the rest of the dashboard config. Keys
  are `{plugin}::{container}` (`""` container for flat sources); values are
  `{ enabled?, displayName? }`.
- **Binding** — a placement's `settings.source` (the container id, `""` =
  all devices). Bind/Unbind in the Sources view write exactly the same key
  the widget's own "Source (device)" select writes, so both paths stay in
  sync.
