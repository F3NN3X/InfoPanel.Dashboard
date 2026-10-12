> **Full documentation:** [docs/README.md](docs/README.md), covering architecture, the reuse audit, design tokens, primitives, variants, skins, surfaces and one spec per widget. The core is split into `core/`; `kit.jsx` is the barrel.

# Widget templates

44 React + Tailwind widget templates built from the InfoPanel Data API (653 points). Every template:
- **fits any size**: it measures itself (ResizeObserver) and switches between 4 layout tiers: `xs` <200×120, `sm` <320×190, `md` <480×300, `lg` ≥480×300. You can force a tier with `size="sm"`.
- **adapts to its grid span**: `shapeOf(w, h)` picks `tile` (1×1), `strip` (3×1, 4×1), `column` (1×2, 1×3) or `box`. Tiles, strips and columns use the shared compact layouts, filled from each widget's `compact` descriptor (value, sub, spark / bar / ring / image). Pass `compactView="off"` to always use the full layout.
- **graphs glide**: `useHistory` eases the values (EMA), and `Spark` draws a smooth Catmull-Rom curve with a gradient fill.
- **variant** (`variant="studio"`): the minimal Studio-app look. It uses a mono micro-label, a big tight value anchored low, a sub line and a 3px bar, and drops to a single label/value row in 1-row zones. Each widget passes a `studio` descriptor (`label, value, unit, sub, pct, hist, img, progress, rows[], meters[], cells[]`) and falls back to `compact` when it has none.
- **skins** (`skin` prop): `default` · `tui` (btop-style: ┐title┌ box, braille graphs, gradient block meters) · `macos` (vibrancy, 22px, rounded numerals, thick rings) · `fluent` (Win 11 Mica, Segoe UI Variable) · `hud` (grid, corner brackets, stepped graphs) · `ink` (monochrome, hairlines, serif numerals) · `retro` (CRT, VT323) · `ios` (iOS 18 widget) · `android` (Material You tonal, squiggly progress) · `synth` (synthwave neon) · `brutal` (neo-brutalist hard shadow) · `cyber` (chamfered, signal yellow) · `nixie` (glowing tube numerals) · `instrument` (Widget Sampler: IBM Plex Sans/Mono, condensed Archivo numerals, colour only for state; palette exported as `INSTR`). Each skin picks a default surface, radius, font, `graph` (`area|line|step|bars|dots|braille`) and `meter` (`bar|pill|segments|blocks|hair`). All of these can be overridden per widget. Fonts to load: JetBrains Mono, VT323, Instrument Serif, Roboto Flex, Orbitron, Space Grotesk, Chakra Petch, Nixie One.
- **colour ramps** (`RAMPS` / `rampColor`): accent · thermal · viridis · magma · ice · synth · mono.
- **can be customised** through the shared shell props: `accent` (any CSS colour, exposed as `--accent`), `surface` (`solid` · `glass` · `outline` · `flat` · `tinted` · `aurora` · `neon` · `holo` · `mesh` · `carbon` · `inset` · `terminal`, all tinted from the accent), `radius` (px), `title`, `showHeader`, `className`, `style`. Each widget also has its own props, listed at the top of its file and on the overview page.
- **reads data** from a flat `data` map of `key → value`, for example `{ 'system.cpu.load': '26.2 %' }`. It parses units itself and finds devices, adapters and disks automatically, so there are no hard-coded GUIDs.

## Use in the app (Vite)
1. Copy this folder to `src/widgets/`. You don't need `_preview/`: it only runs the overview page.
2. Tailwind: add `./src/widgets/**/*.{js,jsx}` to `content` (v3). v4 picks the folder up automatically.
3. Icons use Material Symbols Rounded (`<Icon name="memory"/>` in `kit.jsx`). If the app uses lucide-react, swap the body of `Icon`.
4. Data:
```jsx
import { useInfoPanel, WIDGETS } from './widgets';
const data = useInfoPanel({ url: 'http://localhost:PORT' });   // SSE on /events
const { Component } = WIDGETS.CpuMonitor;
<div className="h-[270px] w-[440px]"><Component data={data} accent="#60a5fa" surface="glass" /></div>
```
In the studio, pass the zone's effective style (accent, surface, radius) straight through as props.

## Files
`kit.jsx`: shared helpers (parsing, formatting, `useBox`, `useHistory`, `useInfoPanel`) and the building blocks (`Widget` shell, `Metric`, `Bar`, `BarRow`, `Ring`, `Spark`, `Stat`, `Chip`, `Dot`, `Img`, `Empty`).
`index.js`: the barrel export plus the `WIDGETS` registry (`{ Component, meta }`). `meta` carries the id, name, category, icon, key prefixes, default/min grid size and description, ready for the Add-widget library.

| Widget | Sources |
|---|---|
| SystemStatus | system.* |
| CpuMonitor | LibreHW CPU + embedded controller |
| GpuMonitor | LibreHW NVIDIA |
| MemoryUsage | LibreHW total/virtual memory |
| ProcessList | system-info › processes |
| Uptime | system-info › uptime |
| FpsMonitor | RTSS |
| DriveSpace | drive-info |
| StorageHealth | LibreHW SSD SMART (Kingston, WDC…) |
| NetworkThroughput | LibreHW adapters (Ethernet, WiFi, Tailscale, vEthernet, Bluetooth) |
| NetworkAdapters | network-info + public IP |
| NowPlaying | media, Spotify, pushed spotify.* |
| AudioMeter | audio-level-meter (single or bridge) |
| VolumeMixer | volume-plugin + Wave Link |
| Clock | clock-plugin |
| Weather | MET/Yr or OpenWeatherMap |
| SteamProfile | Steam profile + social |
| SteamGame | Steam session + achievements + art |
| SteamLibrary | Steam library + news |
| SensorValue | any single key |
| Vitals | CPU / GPU / RAM / net (reflows) |
| ServiceHealth | status of every source |
| Thermals | all temperature sensors |
| PowerDraw | CPU + GPU package W |
| Fans | GPU fans + CPU fan |
| DiskIO | per-disk read/write |
| WaveLink | Wave Link state + meters JSON |
| Calendar | clock-plugin date |
| Forecast | Yr forecast (wide or tall) |
| Achievements | Steam achievements |
| SteamNews | Steam news |
| SensorGroup | any list of keys |
| SystemOverview | unified CPU/GPU/RAM/VRAM/NET, per-section colours, core heatmap, activity rings at 1×1 |
| MeterBridge | multi-channel dB meters, peak hold, volume, L/R dB |
| GameSpotlight | Steam banner / logo / poster now-playing: hero · poster · logo · ticker · combo (music overlay) |
| MenuBar | glance strip, stacked label/value, click for detail |
| KpiTiles | value · change · trend with end dot |
| GpuRings | stacked VRAM/load rings + legend |
| StatusTracker | one block per reading history |
| OsdStrip | RTSS-style overlay cells |
| FramePacing | frame-time graph with Hz budget lines, empty state |
| PlaytimeShare | segmented share bar of recent games |
| CoreHeatmap | per-core grid / hex / radial / waterfall |
| Visualizer | canvas visualiser from level meter (no FFT in API, bands synthesised) |

AudioMeter `meterStyle`: led · bar · vu · ring · mirror · wave. NowPlaying `layout`: card · vinyl · backdrop · wave.

CPU core view: `coreView="bars" | "heatmap" | "off"`, `coreMetric="load" | "clock"`, `heatRamp="accent" | "thermal"`.

Sampler upgrades: CoreHeatmap `hotOutline` (default 80%) plus a hottest-thread readout · NetworkThroughput `chart="mirrored"` · DriveSpace sorts fullest first, stays neutral below 80% and shows a critical badge (`sort`, `neutral`) · ServiceHealth `layout="pills"` · Achievements `display="pips"` · ProcessList CPU/Memory tabs · MeterBridge volume bar.
