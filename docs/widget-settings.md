# Widget Settings (Standardized)

The schema, controls, and shared block behind every widget's settings in
the studio inspector (tabs of collapsible sections, driven by one registry). One reference for: what a setting *is*, what every
widget gets for free, and how a new widget adopts it.

Companion to [`redesign/`](redesign/README.md) (the studio's design) and [`module-catalog.md`](module-catalog.md) (the what, per module).

## The setting schema

A module declares `settings: ModuleSetting[]` (`src/modules/types.ts`). The
studio's inspector renders one control per entry, as a compact row in a
section (`inspector-model.ts` builds the sections and `setting-control.tsx` /
`setting-rows.tsx` draw the rows). The section is the setting's *category*:
standard keys are filed by key in the general
categories (`GENERAL_CATEGORIES` in
`src/components/studio/inspector-categories.ts`), module-specific ones by
their `group` (`categorize`); values are stored **per placement**
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
| `align` | 3×3 alignment picker + Spread toggle | `key` holds the horizontal value, `keyY` the vertical one (both written as one change) | `keyY` |

Any setting can also list `keywords`: extra terms the settings search
matches besides the label, key and option names.

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

Every widget spreads
`STANDARD_SETTINGS` (`src/modules/standard-settings.ts`) into its
`settings`, so every widget offers the same core customization:

| key | type | default | what it does |
|---|---|---|---|
| `preset` | select | `default` | one-click bundle — see presets below |
| `layout` | select | `auto` | auto / card / standard / compact / simple |
| `surface` | select | `glass` | glass / matte-light / matte-dark / theme (from the theme tokens) |
| `label` | text | `""` | custom title line (empty = the widget's own header) |
| `icon` | icon | `""` | header icon (empty = none) |
| `accent` | color | `""` | accent for fills / header icon (empty = auto) |
| `background` | image | `""` | background image URL |
| `backgroundOn` | boolean | `false` | use that image behind the surface |
| `skin` | select | `auto` | auto / one of the 14 skins (see Look below) |
| `variant` | select | `default` | default / studio (see Look below) |
| `graph` | select | `auto` | graph style: auto / area / line / step / bars / dots / braille (Advanced) |
| `meter` | select | `auto` | meter style: auto / bar / pill / segments / blocks / hair / wave / square (Advanced) |
| `compactView` | select | `auto` | auto / off: off keeps the full layout in small zones (Advanced) |
| `autoScale` | boolean | `true` | kept for older configs; see Scaling |
| `scale` | number | `100` | size %, 50–200, on top of auto-scale |
| `alignX` + `alignY` | align | `auto` | one picker: left / center / right / spread × top / middle / bottom |
| `padding` | select | `auto` | inner padding, px |
| `gap` | select | `auto` | gap between items, px |
| `radius` | select | `auto` | corner radius, px or pill |
| `textColor` | color | `""` | main text color |
| `mutedColor` | color | `""` | secondary text color |
| `font` | select | `auto` | theme (the page font, General > Font) / sans / rounded / serif / mono |
| `fontWeight` | select | `auto` | weight of the big values |
| `labelCase` | select | `auto` | caption case: UPPERCASE / as written / Capitalized |
| `stroke` | number | `100` | ring / bar thickness %, 50–250 |
| `customCss` | text (multi-line) | `""` | CSS scoped to this widget (`:scope` = its root) |
| `borderWidth` | select | `auto` | surface edge width, px (auto = 1px) |
| `borderColor` | color | `""` | surface edge color |
| `glow` | select | `none` | inner edge glow: none / soft / strong |
| `glowColor` | color | `""` | glow color (empty = accent) |
| `surfaceOpacity` | number | `100` | surface background opacity %, 0–100 |
| `blur` | select | `auto` | backdrop blur, px |

Everything from `skin` through `customCss` is `STYLE_SETTINGS`; the
surface keys after it are `SURFACE_SETTINGS` (widgets with a surface box).
The plain card modules (Departures, notifications, text file, Stream Deck) add
`CARD_SETTINGS` after their own options, and the "Other sensors" cards use it
alone: `surface` (default `theme`, the shadcn card they always had), `accent`,
`STYLE_SETTINGS` and `SURFACE_SETTINGS`. Web page takes `scale`, `radius`,
`accent` and the border / glow keys (an edge drawn over the frame). In the studio the standard options sit in the **general
categories**, the same sections on every widget (`group` carries the title; the
keys are listed in `GENERAL_CATEGORIES`):

| Category | Keys |
|---|---|
| Widget | `label`, `icon`, `hideWhenIdle` (plus the type picker and *Visible*, added by the zone) |
| Look | `skin`, `variant`, `graph`, `meter`, `compactView` (the last three are Advanced) |
| Size & alignment | `layout`, `autoScale`, `scale`, `alignX` / `alignY` |
| Typography | `textColor`, `mutedColor`, `font`, `fontWeight`, `labelCase` |
| Spacing & shape | `padding`, `gap`, `radius`, `stroke` |
| Colors & surface | `preset`, `surface`, `accent`, `background`, `backgroundOn`, `surfaceOpacity`, `blur` (plus Follow / Custom and the style tools) |
| Border & effects | `borderWidth`, `borderColor`, `glow`, `glowColor` (plus the zone frame) |
| Advanced | `customCss` |

`preset`, `layout`, `surface` and `hideWhenIdle` carry no `group` and are
filed by key. "Auto" / empty always means the widget's own look. The
constants are `GROUP_WIDGET`, `GROUP_SIZE`, `GROUP_TYPOGRAPHY`,
`GROUP_SPACING`, `GROUP_COLORS`, `GROUP_EFFECTS` and `GROUP_ADVANCED`.

Modules with an idle rule (`DashboardModule.isIdle`: media / Spotify not
playing, FPS without frames, Steam not in a game, notifications with none
unread) add `IDLE_SETTING` (`hideWhenIdle`): the kiosk then hides the zone
while idle, and the studio badges it "idle · hidden in kiosk".

### Look: skin, variant, graph and meter

The Look keys restyle a widget's whole drawing, not just its colors. They are
ordinary look keys: they resolve default → dashboard → profile → widget, obey
Follow / Custom and Force global style, show source dots, and are saved in
style presets and appearance presets. Their defaults (`auto` / `default`)
leave a widget looking as it always did.

- **Skin** — `auto` or one of 14: `default`, `tui`, `macos`, `fluent`, `hud`,
  `ink`, `retro`, `ios`, `android`, `synth`, `cyber`, `nixie`, `brutal`,
  `instrument`. A skin sets the header style, numeral and label fonts (loaded
  on first use), corner radius, ring thickness, and the default graph and meter
  style. It also brings its own surface: with a skin chosen and no `surface`
  saved, the skin's surface is used; a saved `surface` always wins, and the
  default stays `glass` while the skin is `auto`. A skin's own accent applies
  only while no accent is set and the surface is not light.
- **Variant** — `default`, or `studio`, a dense summary of the same data (a
  headline value, a trend and a few rows) drawn instead of the normal layout.
- **Graph style** and **Meter style** — override the skin's choice for every
  sparkline-type graph and for bars and meters in the widget (`auto` = the
  skin's).
- **Compact view** — zones of 1 x 1, strip or column shape swap to a compact
  summary of tile, strip or column form (`auto`); `off` keeps the full layout.
  Widgets without a compact descriptor ignore it.

Skin, variant, graph, meter and compact view are drawn by the shared widget
shell (below). They have no effect on custom panel zones, which hide
`variant` and `compactView` (`NOT_FOR_PANELS`); with a skin set, a panel's bars,
sparklines, gauges and numerals take the skin's primitives (see
[architecture.md](architecture.md#the-widget-shell)).

### Global style, copy / paste and style presets

The look-only keys (`PROFILE_STYLE_KEYS`: `surface`, `accent` and every
key of `STYLE_SETTINGS` / `SURFACE_SETTINGS`) can be set once for every
profile (`DashboardConfig.style`) and per profile (`MonitorProfile.style`),
in the Dashboard inspector (nothing selected: **Appearance** for the scope
(All profiles / This profile), **Global style** for the values). Resolution order (`resolveStyle`,
`src/lib/style-resolve.ts`): module default → dashboard style → profile
style → the widget's own value. A placement's `styleMode: "follow"` skips
its own look values (kept stored); `styleEnforce` (dashboard, or the
profile's when set) does that for every widget and also drops a panel's
own widget colors. The inspector marks each row with a dot (own value,
from the dashboard style, from the profile style, or own value overriding
them), and a hover reset drops an own value.

The inspector's style tools copy a widget's style (Copy / Paste), make it
the global style (Use as global… → All profiles / This profile), and save /
apply named presets (`DashboardConfig.stylePresets`). Paste and Apply
replace the widget's style wholesale (`replaceStyle`): unset keys fall back
to the global style / defaults again, content settings are untouched, and keys the widget has
no setting for are skipped.

Appearance presets (`DashboardConfig.appearancePresets` and the built-ins in
`src/lib/appearance-presets.ts`) work one level up: they set the theme, the
radius and the dashboard or profile style (plus, optionally, the page
background) - a whole look, not one widget. Their `style` uses the same
look keys, and every value must be one of the setting's options
(`isValidStyleValue`); a new look option therefore becomes available to
presets automatically.

Four optional fields place a row in the inspector (everything else about the
registry is in [architecture.md](architecture.md#adding-a-setting-to-a-module)):

| Field | Effect |
|---|---|
| `tab` | `"content"`, `"style"` or `"data"`. Unset, the category decides: general categories by their kind, a widget's own categories in Content, those made only of color pickers in Style. Put data-related options in Data. |
| `advanced` | Tucked away until the inspector's **Advanced settings** toggle is on (counted in "Show N advanced settings"). |
| `hint` | One-line explanation behind the row's info icon; it is searched too. |
| `visibleIf(values)` | The row shows only while this holds for the zone's effective values (e.g. glow colour only when glow is not none). |

Module-specific options follow the standard block and keep their own keys
(`tint`, `showTimes`, `forecastDays`, `dimBanner`, `maxRows`, …). Give each
one a `group`: its own category section (aim for 2-10 options each; a section
named like a general one is not allowed). The test
`inspector-categories.test.ts` fails for an unfiled option or a one-option
category that is not on its allow-list. Per-element colors (e.g. the System
widget's CPU / GPU / RAM / VRAM colors) get a category of their own
("Device colors"), not the general Colors & surface section. Examples: Media -
*Now playing*, *Cover art*, *Waveform*, *Visualizer*, *Waveform shape*,
*Audio source*; System - *Devices*, *CPU*, *GPU*, *Memory*, *Drives*,
*Trends*, *Thresholds*, *Units & labels*, *Device colors*.

### Panels (`PANEL_SETTINGS`)

A custom panel zone's look is its placement's `settings` too, rendered on
the general sections from `PANEL_SETTINGS` (`src/modules/standard-settings.ts`):
the standard block without `preset`, `layout`, `autoScale` and `stroke`
(a panel has no layout variants, design size or rings of its own), with
two changes:

| key | change |
|---|---|
| `label` | "Title (empty = hidden)": the panel's title line (`.wp-panel-title`) |
| `surface` | default `panel`; options `none` / `panel` (card) / `bordered` (bordered card) before glass / matte-light / matte-dark / theme |

`alignX` + `alignY` place a panel whose **Fit in zone** is Hug; `padding`
and `gap` are the fallbacks for the panel's own Gap / Padding fields;
`customCss` is scoped to the zone like any widget's, and the PanelDef's
`css` (the Code view, saved panels) joins it. The panel's arrangement and
widgets are not settings: they live in `Placement.panel` (see
[architecture.md](architecture.md#the-render-pipeline-of-a-panel-zone)).

Panels saved before the look moved here keep `title` / `titleVisible` /
`accent` / `background` on the PanelDef. Loading copies the title into
`label` (`normalizePanelPlacement`); the accent and background stay the
panel's lowest style layer (`panelLegacyLook`, below the dashboard and
profile style), read at render time. Panels migrated by older builds hold
`accent` / `surface` copies as their own values; following the global
style lets it through. A saved panel preset
(`DashboardConfig.panelPresets`) stores these settings with the panel.

The panel editor's alignment pickers (stack alignment, grid cell
alignment, a widget's align self) reuse the `align` control
(`AlignGrid`) with a **Stretch** toggle on the cross axis besides Spread;
they write PanelDef / widget fields, not settings.

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

In stacked layouts a vertical meter renders *inline* (short meter +
readout on one line per device) so many devices fit; the standard layout
keeps full-height columns.

### Live waveform — `spotifymodern` / `mediamodern`, `waveform: true`

Renders the audiocn **`LiveWaveform`** in place of the progress bar (the
roomier size tiers; the compact view keeps the progress bar), so it
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
kiosk's WebView2 host auto-grants it via a `PermissionRequested` handler
(`KioskWindow.cs`, in the InfoPanel host app — not this repo).

| key | options | default |
|---|---|---|
| `liveCapture` | on / off | `off` |
| `liveSources` | capture devices (one labeled row each); `""` = fall back to the sensor row | `""` |

The audiocn views are options of the Audio and Now Playing widgets only (the classic
`audio` / `spotify` / `media` modules were retired in the 2026-10-09
cleanup). The static `Waveform` component remains vendored but is no longer
used by the widgets (the `waveform` view is now live).

## Shared primitives

The library's drawing parts live in `src/widgets/core/primitives.tsx` and are
re-exported from `src/widgets/kit.ts`; a widget imports them from the kit.

- **`Num`**, **`Bar`**, **`Spark`**, **`Ring`**, **`RingStack`**,
  **`LedLadder`**, **`MiniViz`** and the other primitives read the active skin
  (`useSkin`): numerals use the skin's font, a bar or meter takes the skin's
  meter style unless the Meter style look key is set, a graph the skin's or
  the Graph style look key's. A widget never sets a font or a fixed accent of
  its own.
- **`useHistory(value, len)`** (`core/layout.ts`) keeps an eased rolling window
  of the last samples for any graphed value.
- **State colors** — `STATE` (ok / warn / crit) are the only fixed colors;
  everything else derives from the accent (`hue(deg)`).

The panel widgets keep their own small set: `lib/sparkline.tsx` (`useHistory`,
`Sparkline`) feeds the panel `sparkline` widget; with a skin set the panel
renderers use the library primitives instead (`components/widgets/panel-skin.tsx`).

## The widget shell and the chrome layer

Every library widget renders inside one `<Widget>` shell
(`src/widgets/core/Widget.tsx`); a widget never draws its own background,
border or radius. The shell applies the standard keys identically to all of
them: `chromeOf(cfg)` (`standard-settings.ts`) turns the resolved settings
into a `chrome` object, and the shell turns that into the surface box, text
colors, font, padding, header, background image and scoped CSS. The `look`
(resolved settings) reaches the shell through the module factory
(`src/widgets/module.tsx`), so a widget file only declares what it draws:

```tsx
<Widget {...shell(p)} title="Fans" icon="mode_fan" compact={…}>
  {({ w, h, size, shape }) => /* content for the inner box */}
</Widget>
```

The shell measures its own outer box and gives the content a size tier
(`xs` / `sm` / `md` / `lg`) and a shape (`tile` / `strip` / `column` / `box`).
Content is given the *inner* size after padding and header, so row counts and
font sizes come from the room that is really there. `ModernChrome`
(`components/modern-chrome.tsx`) remains the root of custom panel zones; the
`ModernChrome` type is the `chrome` object both use.

- **Scaling** — the content box gets `zoom: s`, where `s` is the user's Size %
  (50–200). The tier and shape are measured after the zoom, and the padding
  option is not scaled by it. Library widgets adapt to their zone by tier and
  shape rather than by scaling, so `autoScale` has no effect on them (the
  key stays stored for older configs).
- **Style variables** — the chosen options become `--wp-pad`, `--wp-gap`,
  `--wp-radius`, `--wp-fg`, `--wp-muted`, `--wp-weight`, `--wp-label-case`,
  `--wp-x` / `--wp-y` (+ `-cross`), `--wp-text-align`, `--wp-flex`, and the
  font family on the root. Widgets read them through
  `components/widget-style.ts` (`ws.pad(20)`, `flow("row", { x, y })`,
  `labelStyle()`, `ws.weight(700)`, `strokeOf(chrome, base)`), each with the
  widget's own value as the fallback. Surface text colors from
  `makeSurface` already read `--wp-fg` / `--wp-muted`.
- **Token re-scope** — `tokenScope(chrome)` (part of `chromeVars`) also
  sets the theme tokens on the root from the hex accent / text / secondary
  text colors: `--accent`, `--foreground` and `--card-foreground`,
  `--muted-foreground` (as the HSL triplets the theme uses). Anything inside
  that reads the theme — Tailwind's `text-foreground`, `hsl(var(--accent))`,
  the theme surface, a panel's widgets — follows the widget's colors, and
  so the global style. `placementContent` returns the same tokens as
  `scope` for the zone frame.
- **Surface box** — `surfaceBox(sv, chrome)` builds the widget's surface
  (background, text color, edge) with the border, glow, opacity and blur
  options applied. The glow sits inside the edge: an outer one would be
  clipped by the zone. Opacity rewrites the alpha of every color in the
  surface background (`fadeColors`: rgb / hex and theme token colors
  `hsl(var(--x))` / `hsl(var(--x) / a)`), so gradients fade too.
- **Surfaces** — the shell resolves the `surface` setting through the surface
  registry (`src/widgets/core/surfaces.ts`, `theme.ts`). `glass`,
  `matte-light`, `matte-dark` and `theme` are the app's own materials
  (`makeSurface`, `components/surfaces.ts`): fixed palettes, optionally
  tinted; `theme` is `hsl(var(--card) / 0.85)` with card-foreground text, a
  muted track, a primary fill and a border ring, so it follows the theme
  preset and the re-scoped tokens and ignores a tint. The registry adds the
  skins' own surfaces, which a skin picks when no `surface` is saved. Each
  surface has a tone (dark, light or theme) and the shell derives the text
  variables `--w-fg`, `--w-muted`, `--w-faint` and `--w-track` from it.
- **Plain cards** — the card modules (Departures, notifications, text file,
  Stream Deck) and the catch-all "Other sensors" cards are template widgets
  too, so they use the same shell; their surface defaults to `theme`. A
  fixed-palette surface also sets the text and chip tokens (`surfaceTokens`)
  unless the user picked text colors, so content drawn with `text-foreground`
  / `bg-secondary` stays legible on it.
- **Custom CSS** — rendered as a `<style>` wrapped in
  `@scope ([data-wp-scope="…"])` on the chrome root, so selectors match
  inside this widget only. It is the user's own dashboard: the CSS is not
  sanitized beyond that scope.

- **Background image** — when `backgroundOn && background`, the image sits
  behind the surface (`object-cover`, under a 45 % scrim: black on a dark
  surface, white on a light one, the theme's page color on the theme surface).
  Glass surfaces let it show through; matte surfaces cover it (intended).
  Steam: a game banner always wins; the user's image is the fallback when
  there is no banner.
- **Header** — an icon + custom-title line, only when set, in the header
  style of the skin (plain, boxed, window bar, …), in the text color
  (`--w-fg`) at 75 %. The small size tier and the compact view hide it.
- **Accent** — exposed to the widget as the `--wp-accent` CSS variable;
  components opt in per element, e.g.
  `background: "var(--wp-accent, #34d399)"` — the widget's default when the
  user picks no accent.

The shell sets the accent as `--accent` on the widget root (and the legacy
`--wp-accent`); primitives read it, so a bar, ring or sparkline takes the
accent unless it shows a state (ok / warn / crit), which keeps its fixed
color. A skin may bring its own accent (ink, synth, cyber, nixie,
instrument); an accent set on the zone, the profile or the dashboard always
wins over it. Secondary series are rotated from the accent with `hue(deg)`.
Where it lands per widget is the widget's own business: the big temperature
in Weather, the progress fill in Now Playing, the ring track in FPS Monitor,
and so on; the per-widget color options (device colors, speed colors,
battery colors, …) override it for one element.

The shell builds the `chrome` object from the resolved settings with the
shared `chromeOf(cfg)` helper (`standard-settings.ts`).

## Adopting the standard block (new widget)

A library widget is a component over flat data plus a registration; the
factory `templateModule` (`src/widgets/module.tsx`) adds the standard block,
the Look keys, the shell props and the empty state:

```ts
export const MY_SETTINGS: ModuleSetting[] = [
  { key: "showUnit", label: "Show unit", type: "boolean", default: true, group: "Content" },
];

templateModule({
  meta,                       // id, name, category, icon, min / default size, description
  Component: MyWidget,        // renders <Widget {...shell(p)}> over `data`
  settings: MY_SETTINGS,    // after STANDARD_SETTINGS
  toProps: (s) => ({ showUnit: s.showUnit !== false }),
});
```

- The module's `render` reads the sensors through the data adapter
  (`toFlat`, below), resolves the zone's look (`useZoneLook`: defaults,
  then the skin's surface when none is saved), and passes `shellProps(look)`,
  `toProps(look)` and `look` to the component. The component spreads
  `shell(p)` onto `<Widget>`, which applies the look.
- Stored keys never change: `toProps` maps the stored settings to props, so a
  prop named like a standard key (`layout`, `icon`, `label`, `surface`,
  `style`) is stored under another name (Now Playing `playerLayout`, Game
  Spotlight `spotlightLayout`).
- Colors and sizes come from the primitives and CSS variables, never from
  fixed greys or fonts: the shell sets `--w-fg`, `--w-muted`, `--w-faint` and
  `--w-track` from the surface, so text stays legible on light surfaces.
- Fit, don't overflow: row counts come from the inner height, big numbers get a
  font size fitted to their width, and anything that cannot fit is dropped,
  not clipped. `?widget-qa` (see [architecture.md](architecture.md#qa-harness))
  checks this at six spans.
- A legacy module id that should keep loading passes `alias: { id, title, … }`;
  it is hidden from the Library and keeps its own settings array key for key.

## Extending

- **New control type** — add it to the `ModuleSetting.type` union, a case in
  `SettingRow` (`setting-control.tsx`), and (if it takes extra data) fields on `ModuleSetting`.
  The renderer is fully schema-driven; nothing else changes.
- **New icon** — one line in `lib/widget-icons.ts` (`WIDGET_ICONS`); it
  shows up in every icon picker.
- **New preset** — an option with `applies` on the standard `preset`
  select; it applies to every module that declares those keys.

## The studio Data Explorer

The studio's left icon rail has a **Sources** button (and the top bar a
**Design | Sources** switch) that swaps the canvas and the inspector for the
Data Explorer (`components/studio/sources-panel.tsx`, `explorer/`): a source
tree, a table of every data point with its live value and the zones that use
it, and a point inspector. The customization guide describes it
([Data Explorer and binding](customization-guide.md#data-explorer-and-binding));
this section is about what it stores.

The tree and table are derived **live** from `/api/sources` and the sensor
stream (`buildDataModel`, `src/lib/data-points.ts`); "Used by" is derived from
the config (`computeUsage`, `src/lib/data-usage.ts`). The Data API is
read-only towards InfoPanel's plugins, so the Explorer configures what the
dashboard *shows* - it never reconfigures InfoPanel plugins; their own
settings stay in InfoPanel's Sources tab.

- **Source preferences** — `config.sourcePrefs` on `DashboardConfig`
  (`lib/layout.ts`), persisted with the rest of the dashboard config. Keys
  are `{plugin}::{container}` (`""` container for flat sources); values are
  `{ enabled?, displayName? }`.
- **Binding** — `bindPoint` / `unbindPoint` write only fields that already
  exist: a panel widget's `sensor`, or a placement's `settings.source` (the
  container id, `""` = all devices; a widget can be bound to a container,
  never to a single key). That is the key the widget's own "Source (device)"
  select writes, so the Explorer, the inspector's Bound data and the select
  stay in sync.
