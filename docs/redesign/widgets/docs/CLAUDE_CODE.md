# Widget library: implementation guide for Claude Code

This guide turns the widget templates in `widgets/` into the app's real widget system. It is **Phase 9** of `design_handoff_studio_redesign/IMPLEMENTATION_PLAN.md`; start it after Phase 7 (data layer) is merged. Follow the same rules as that plan: every step must build, run and keep every existing feature, with one commit per step.

## 0. Read first (in this order)
| # | File | Why |
|---|---|---|
| 1 | `design_handoff_studio_redesign/CLAUDE.md` | Standing rules (no feature loss, config compatibility, tokens) |
| 2 | `design_handoff_studio_redesign/DATA_MODEL.md` §2, §6 | The 16 existing widgets, their own categories and the styling model (Follow / Custom) |
| 3 | `design_handoff_studio_redesign/reference/design-overview.md` | How the current widgets, panels and styling work today |
| 4 | `widgets/docs/ARCHITECTURE.md` | Rendering contract, shell props, sizing, data flow, performance rules |
| 5 | `widgets/docs/AUDIT.md` | What is already shared, and what to merge while porting |
| 6 | `widgets/docs/DESIGN_TOKENS.md`, `SKINS.md`, `SURFACES.md`, `VARIANTS.md`, `PRIMITIVES.md` | Every colour, font, radius and motion value |
| 7 | `widgets/docs/WIDGETS.md` → `widgets/docs/widgets/<Id>.md` | Per-widget spec: props, data keys, sizes, descriptors |
| 8 | `Widget Templates.dc.html` (open in a browser) | Live reference for every widget, gallery, skin and variant, with controls |

The `.jsx` files in `widgets/` are **production-shaped**: React function components, Tailwind classes and plain ES modules. Port them into the codebase instead of rebuilding them from screenshots. **Do not ship `widgets/_preview/`**; it is the in-browser loader for the overview page only.

## 1. Target structure in the app
```
src/widgets/
  core/            data.js · layout.js · tokens.js · surfaces.js · skins/*.js · theme.js · primitives.jsx · views.jsx · Widget.jsx
  kit.js           barrel (rename from kit.jsx if the repo prefers .js barrels)
  <Id>.jsx         one per template (44)
  index.js         WIDGETS registry
```
- If the repo uses TypeScript, convert the files with `.tsx` and add the types listed in §6. Keep the logic unchanged.
- Keep one file per widget and one file per skin. They are the unit of review.

## 2. Steps
### 2.1 Core (no UI change yet)
1. Copy `widgets/core/**` and `widgets/kit.jsx`, then fix the import paths.
2. Tailwind:
   - v3: add `./src/widgets/**/*.{js,jsx,ts,tsx}` to `content`.
   - v4: nothing to do.
   - Keep JIT on, because arbitrary values are used throughout (`bg-white/[0.06]`, `text-[color:var(--accent)]`).
3. Icons: if the app uses lucide-react, replace only the body of `Icon` in `core/primitives.jsx`, with a name map from Material Symbols to lucide. Keep the `name` prop.
4. Fonts: load Geist and Geist Mono globally. Load each skin's fonts **lazily** when that skin is first used; the list is `SKIN_PACKS[i].fonts`. Write a `ensureSkinFonts(name)` helper that injects one Google Fonts `<link>` per family. Material Symbols Rounded stays global unless it is replaced in step 3.
5. **Acceptance:** a scratch page renders `<SystemStatus data={snapshot} />` with no console errors.

### 2.2 Data adapter
1. The Phase 7 data client already holds the flat `{ key: value }` map. Pass it as `data`. Use `core/data.js → useInfoPanel()` only if the client has no hook of its own; don't run two SSE connections.
2. Never hard-code device ids:
   - `hw(d)` gives CPU, GPU, disks and network adapters.
   - Audio and volume devices are matched by GUID (see `MeterBridge.volFor`).
   - Network adapters come from the `{GUID}.name` keys.
3. The demo-only data in the overview page logic (`DEMO`, random walk) **must not** be ported.
4. **Acceptance:** each widget spec's "Keys read" list resolves against `/api/sensors`.

### 2.3 Registry and zone renderer
1. Register `WIDGETS` (from `index.js`) in the existing widget registry, next to or in place of the current 16 modules:
   - `meta.defaultSize` / `minSize` → grid spans.
   - `meta.category` → Library chips (System · Hardware · Storage · Network · Media · Audio · Info · Gaming · Generic). Map these onto the existing chips (System, Media, Network, Info, Other) and add any missing ones. Check with the user before changing the chip set.
   - `meta.icon` → Library card icon.
2. Zone renderer:
   ```jsx
   const W = WIDGETS[zone.type].Component;
   <W data={data} {...resolveLook(zone)} {...zone.props} />
   ```
   `resolveLook` is the Phase 2 effective-style resolver (Follow / Custom). It maps:
   | Studio look setting | Widget prop |
   |---|---|
   | Accent | `accent` |
   | Material / surface | `surface` (`auto` = skin default) |
   | Radius | `radius` (omit to let the skin decide) |
   | **new** Skin | `skin` |
   | **new** Variant | `variant` (`default` / `studio`) |
   | **new** Graph style | `graph` |
   | **new** Meter style | `meter` |
3. Add the four new look settings to the **Style** tab (README §4.6). Use the same source-dot and Follow/Custom rules as the other look settings. Global style, profile style and widget style must all accept them.
4. **Acceptance:** existing configs render exactly as before, because the new settings default to `auto` / `default`. The new widgets can be added from the Library.

### 2.4 Port the existing 16 widgets onto the shell
For each current widget, find the matching template (table below):
1. Keep the existing settings and keys (FEATURE_MAP §10).
2. Render through `<Widget>` plus a `compact` / `studio` descriptor so that skins, variants and shapes apply.
3. Delete the old component only after its replacement is wired up and checked.

| Current module (design-overview) | Template(s) |
|---|---|
| System / CPU / GPU / RAM | `SystemOverview`, `CpuMonitor`, `GpuMonitor`, `MemoryUsage`, `CoreHeatmap`, `GpuRings`, `Vitals`, `KpiTiles`, `MenuBar` |
| Storage / drives | `DriveSpace`, `StorageHealth`, `DiskIO` |
| Network | `NetworkThroughput`, `NetworkAdapters` |
| Media / Spotify | `NowPlaying` (`source`, `layout`, `progress="visualizer"`) |
| Audio levels / volume / Wave Link | `MeterBridge`, `AudioMeter`, `VolumeMixer`, `WaveLink`, `Visualizer` |
| Clock / date / weather | `Clock`, `Calendar`, `Weather`, `Forecast` |
| RTSS / FPS | `FpsMonitor`, `OsdStrip`, `FramePacing` |
| Steam | `GameSpotlight`, `SteamGame`, `SteamProfile`, `Achievements`, `SteamLibrary`, `SteamNews`, `PlaytimeShare` |
| Uptime / processes / status | `Uptime`, `ProcessList`, `ServiceHealth`, `StatusTracker`, `SystemStatus` |
| Single sensor / custom | `SensorValue`, `SensorGroup` |

**Panel widgets** (Stack / Grid / Overlay) also render through `<Widget>`, using `variant="studio"` by default; it is the closest match to the current panel item look. The Overlay layout should pass `surface="flat"`.

### 2.5 Inspector schema per widget
1. For each template, turn the "Widget-specific" props in its spec (`docs/widgets/<Id>.md`) into Content / Style / Data fields with the Phase 2 settings registry. Rules:
   - Enums become segmented controls when there are 4 options or fewer; otherwise they become selects.
   - `sensor` / `sensors` / `device` / `adapter` / `disk` props become **Data tab** pickers that read from Sources.
   - Colour props (`colors`, `vizRamp`, `heatRamp`, `ramp`) go to **Style › Advanced**.
2. **Acceptance:** every prop in every spec is reachable in the inspector, and nothing is duplicated.

### 2.6 Consolidate while porting (from AUDIT.md "Remaining consolidation")
Do these in the app, not in the templates:
- `LedLadder`, used by AudioMeter and MeterBridge.
- `RingStack`, used by SystemOverview tile, GpuRings and the AudioMeter ring.
- `LegendRow`, `useFitRows`, `StatGrid` and `MediaProgress`.
- Merge `TONES.warn/crit` into `STATE`.

Each consolidation is one commit, with a before/after screenshot of the affected widgets at three spans.

### 2.7 QA
Use the overview page as the oracle.
1. For each widget, compare the app render with the overview at spans 1×1, 2×1, 3×1, 1×2, 2×2 and 4×2, at cell sizes 110 and 150. Do this for the `default` and `instrument` skins and both variants.
2. Check for overflow: no descendant's rect may exceed the zone, and no text may overlap.
3. Performance: with 20+ widgets on a 1920×550 profile, the app must hold 60 fps while visualisers run. Canvases must pause off-screen.
4. Tick the new FEATURE_MAP rows (§3 below).

## 3. Add to FEATURE_MAP.md
| New capability | Where |
|---|---|
| 44 widget templates | Library, grouped by category |
| Skin (14) | Style › Look › Skin (Follow/Custom) |
| Variant (default / studio) | Style › Look › Variant |
| Graph style, meter style | Style › Look › Advanced |
| Per-widget layout options (e.g. NowPlaying layout / visualiser) | Content tab, per the widget spec |
| Shape-aware compact views (tile / strip / column) | Automatic; `compactView: off` in Style › Advanced |

## 4. Guardrails specific to widgets
- **One shell:** every widget renders inside `<Widget>`. A widget must never set its own background, border or radius on its root.
- **No hard-coded accent.** Derive secondary colours with `hue(deg)`. Only the `STATE` colours are fixed.
- **No hard-coded fonts.** Use `<Num>` / `numFont(sk)` for numerals; the skin decides. The one exception is the OSD strip's HUD digits.
- **Hooks are unconditional,** and every graphed value goes through `useHistory`.
- **Canvases:** keep one rAF loop each, pause off-screen, feed data through a ref, and never wrap a canvas in a component defined during render.
- **Fit, don't overflow.** Row counts come from the inner height, and big numbers get a font size fitted to width.
- **`style` is always an object.** Widget options must never be named `style`; use `display`, `layout` or `mode`.
- **Top-level names** in a widget file must not shadow a `kit` export.

## 5. Skin files: how to add a skin
1. Create `core/skins/<name>.js` exporting `<name>Skin = { name, description, fonts, skin: {…}, surfaces: {…} }`.
2. Add it to `SKIN_PACKS` in `core/theme.js`; the array order is the picker order.
3. If it needs a new header, add a branch to `SkinHeader` in `core/views.jsx`.
4. Write `docs/skins/<name>.md` and add its row to `SKINS.md`.

Skin token keys: `surface · radius · accent · font · num · numWeight · numStretch · numUp · numGlow · glow · graph · meter · header · ring`. All are optional.

## 6. Types (for a TypeScript codebase)
```ts
type Data = Record<string, string | { value: string }>;
type Tier = 'xs' | 'sm' | 'md' | 'lg';
type Shape = 'tile' | 'strip' | 'column' | 'box';
interface ShellProps { data: Data; accent?: string; surface?: string; radius?: number; skin?: string; graph?: string; meter?: string;
  variant?: 'default' | 'studio'; size?: Tier | 'auto'; compactView?: 'auto' | 'off'; title?: string; showHeader?: boolean; className?: string; style?: React.CSSProperties; }
interface Compact { label?: string; value?: string | number; unit?: string; d?: number; sub?: string; icon?: string; t?: 'ok' | 'warn' | 'crit';
  pct?: number; hist?: number[]; min?: number; max?: number; img?: string; viz?: (heightClass: string) => React.ReactNode; kind?: 'spark' | 'bar' | 'ring' | 'text' | 'value'; }
interface Studio extends Compact { live?: boolean; right?: React.ReactNode; rows?: { n: string; v: string; pct?: number; dot?: boolean }[];
  meters?: { n: string; v: number }[]; cells?: number[]; progress?: { a?: string; b?: string; pct?: number }; }
interface WidgetMeta { id: string; name: string; category: string; icon: string; prefixes: string[]; defaultSize: [number, number]; minSize: [number, number]; description: string; }
interface SkinPack { name: string; description: string; fonts: string[]; skin: Partial<SkinTokens>; surfaces: Record<string, { c: string; s: React.CSSProperties }>; }
```
