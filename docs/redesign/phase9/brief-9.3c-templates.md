# Brief 9.3c: port the 44 templates (one group per implementer)

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. Prereqs committed: core
(`src/widgets/core/**`, `src/widgets/kit.ts`), data adapter (`src/widgets/data-adapter.ts`), factory
(`src/widgets/module.tsx`, `templateModule`), registry (`src/widgets/registry.ts`).

Read first: `docs/redesign/widgets/CLAUDE.md`, `docs/redesign/widgets/docs/CLAUDE_CODE.md` §4,
`docs/redesign/widgets/docs/ARCHITECTURE.md`, `docs/redesign/PHASE9_PLAN.md` §3, `src/widgets/kit.ts`,
`src/widgets/core/Widget.tsx`, `src/widgets/module.tsx`, then for each of your widgets its source
`docs/redesign/widgets/<Id>.jsx` and spec `docs/redesign/widgets/docs/widgets/<Id>.md`.

## Your group
You are given one group name (A–D). Only create/edit the files of your group:
- `src/widgets/<Id>.tsx` for each widget in the group
- `src/widgets/registry/<group>.ts` exporting `export const GROUP_<X>: DashboardModule[]`
- `src/widgets/registry/<group>.test.ts`

| Group | Widgets |
|---|---|
| A (system/hardware) | SystemOverview MenuBar KpiTiles StatusTracker SystemStatus Vitals ServiceHealth ProcessList Uptime CpuMonitor CoreHeatmap GpuRings GpuMonitor MemoryUsage Thermals PowerDraw Fans |
| B (storage/network/info/generic) | DriveSpace StorageHealth DiskIO NetworkThroughput NetworkAdapters Clock Calendar Weather Forecast SensorValue SensorGroup |
| C (media/audio) | NowPlaying AudioMeter VolumeMixer MeterBridge Visualizer WaveLink |
| D (gaming) | FpsMonitor GameSpotlight OsdStrip FramePacing PlaytimeShare SteamProfile SteamGame Achievements SteamLibrary SteamNews |

`src/widgets/registry/{a,b,c,d}.ts` already exist as empty stubs and `registry.ts` concatenates them —
fill only yours. Do **not** touch core, kit, module, registry.ts, or other groups' files. If the core
lacks something you need, write it locally in your widget file and list it in your report (the
controller consolidates later).

## Port rules (per widget)
1. TypeScript `.tsx`, typed props interface `<Id>Props extends ShellProps` with the widget-specific
   props from its spec. Logic unchanged except:
   - **Hooks unconditional.** Move every early return (`if (!id) return <Widget …><Empty/></Widget>`)
     below all hooks (e.g. CpuMonitor's early return before `useHistory`).
   - **No component defined during render** that wraps a canvas or holds state; call it as a function.
   - **Text colours** via the shell variables: replace `text-zinc-100/200/300` → `text-[color:var(--w-fg)]`
     (or an opacity of it), `text-zinc-400/500` → `var(--w-muted)` / `var(--w-faint)`, white tracks
     `bg-white/[0.05..0.08]` → `var(--w-track)`. Keep fixed colours only for `STATE`, ramps, imagery
     scrims and text placed on images (keep those light).
   - Icons via the kit `Icon` (Material names; the map covers them). Images via `widgetImage()`.
   - Numerals via `<Num>` / `numFont(useSkin())`; no hard-coded font families (OsdStrip exception).
   - `style` prop is always an object; options use `display`/`layout`/`mode`.
2. Export `meta` (unchanged values) and the component as default.
3. In `registry/<group>.ts`, one `templateModule({ meta, Component, settings: [], toProps })` per
   widget. `toProps` for now passes stored settings whose key equals a widget prop name straight through
   (typed). Full inspector schemas come in 9.5; legacy ports in 9.4.
4. Fit, don't overflow: row counts from the inner `h`; big numbers fitted to width.

## Test (`registry/<group>.test.ts`)
For every widget in the group, `renderToString` with `data = toFlat(snapshot.sensors)` from
`src/widgets/__fixtures__/snapshot.json`, for `size` in xs/sm/md/lg × `variant` default/studio × `skin`
default/instrument/tui, plus once with `data = {}` (empty state): no throw, non-empty output.
Also assert each module's `id`, `minCols/minRows` = `meta.minSize`, and that every widget renders some
live value from the fixture at `size="md"` (e.g. the output contains a digit) unless its source is
absent from the snapshot (list those explicitly in the test with the reason).

## Verify and report (do NOT commit — the controller commits all groups together)
- `npm run typecheck` may show errors from other groups' in-progress files; filter the output to your
  own paths and make those zero. Run your test file: `npx vitest run src/widgets/registry/<group>.test.ts`.
- Report in ≤12 lines: files, test count, any core gap you worked around locally, any spec prop you
  could not support, widgets whose data is absent from the snapshot.
