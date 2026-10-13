# Brief 9.5: inspector schema per template

Repo `E:\GitHub\MyRepos\InfoPanel.Dashboard`, branch `feat/widget-library`. Read
`docs/redesign/PHASE9_PLAN.md` §3 (decisions 1–3) and §4 step 9.5, `docs/redesign/DATA_MODEL.md` §2–§3,
`src/modules/types.ts` (`ModuleSetting`), `src/components/studio/inspector-categories.ts`,
`src/components/studio/setting-control.tsx`, `src/components/studio/widget-editor/sensor-field.tsx`,
`src/widgets/module.tsx`, `src/widgets/registry/*.ts`, and each template's spec
`docs/redesign/widgets/docs/widgets/<Id>.md`. Verify with `npm run typecheck` (project script only)
and `npm test`, exit codes read directly. No trailers.

## Part 1 (one implementer, first) — `feat: sensor and device pickers for widget settings`
- `ModuleSetting.type` gains `"sensor"` (one key; `multiple: true` = comma-separated keys, ordered).
  Rendered with the existing `SensorField` / `DataPicker` on the **Data** tab (default tab for this
  type). Search keywords include "sensor", "data", "bind".
- `optionsFrom` gains `"cpu" | "gpu" | "disk" | "adapter" | "audio" | "drive"`: options computed from
  live keys with the core `hw()` / detection helpers (`""` = Auto first), label = sensor display
  name when available. Data tab by default.
- `colors`-style object props are flattened to one colour setting per entry (reuse legacy keys
  where they exist, e.g. `cpuColor`); `toProps` rebuilds the object.
- Enums: segmented when ≤4 options, select otherwise (existing rule) — keep.
- A shared `src/widgets/registry/settings-kit.ts` with helpers (`enumSetting`, `boolSetting`,
  `numberSetting`, `colorSetting`, `sensorSetting`, `pass`/`pick` narrowing) replacing the per-group
  local helpers (`pass`, `pick`, `numberOf`, `oneOf`, `listOf`, `stringOf`).
- Tests for the new type/controls (pure parts) and the helpers.

## Part 2 (one implementer per registry group, in parallel, after Part 1) — `feat: inspector settings for <group> widgets`
For every template in your group (registry file `src/widgets/registry/<group>.ts`, plus
`system-overview.ts` / `NowPlaying/settings.ts` where they exist):
1. Every widget-specific prop in its spec becomes a setting, unless the port already added it (don't
   duplicate; keep the legacy key per decision 2; collisions per decision 3).
2. Placement: content/display props → Content (grouped in a widget-named section); `sensor`,
   `sensors`, `device`, `adapter`, `disk`, `drive`, `cpu`, `gpu`, `vizDevice` → Data tab pickers;
   colour props (`colors`, `vizRamp`, `heatRamp`, `ramp`, any `*Color`) → Style, `advanced: true`;
   thresholds (`warn`, `crit`, `*Db`) → Content › Thresholds.
3. Defaults = the template's current defaults (so rendering doesn't change).
4. `toProps` maps every setting; no stored key reaches the widget unmapped.
5. Test `src/widgets/registry/<group>.schema.test.ts`: a manifest of each template's spec props
   (parse the spec's "Widget-specific" block from `docs/redesign/widgets/docs/widgets/<Id>.md` via
   `import.meta.glob(..., { query: "?raw" })`) — every prop reachable through exactly one setting (or
   documented as shell-level/callback-only, e.g. VolumeMixer `onSetVolume`), no setting key colliding
   with a standard key, every enum default inside its options, and `toProps(defaults)` renders.
Other implementers edit other registry files at the same time: only touch your group's registry
file(s), its templates if a prop needs a small fix, and your test. Commit with explicit `git add`
paths; retry on `index.lock`.

Report in ≤12 lines: commit hash, settings added per widget (counts), anything left unreachable.

## Part 1 result (a8e07e9) — helper API for Part 2, from `src/widgets/registry/settings-kit.ts`
Narrowing: `pass<P>(...keys)`, `pick<P>(keys[])`, `numberOf`, `oneOf(v, allowed)`, `listOf(v, item)`,
`stringOf`, `boolOf`; key lists `splitKeys`, `joinKeys`, `toggleKey`. Builders:
`enumSetting(key, label, def, options, extra?)`, `boolSetting(key, label, def, extra?)`,
`numberSetting(key, label, def, extra?)`, `textSetting(key, label, def?, extra?)`,
`colorSetting(key, label, extra?)` (style, advanced), `sensorSetting(key, label, extra?)`,
`deviceSetting(key, label, kind, extra?)`; flattened colours `ColorEntry {entry, key, label}`,
`colorSettings(entries, extra?)`, `colorsOf(s, entries)` in `toProps`.

Group files: A = `registry/a.ts` + `registry/system-overview.ts`; B = `registry/b.ts`;
C = `registry/c.ts` + `src/widgets/NowPlaying/settings.ts`; D = `registry/d.ts`; E = `registry/e.ts`.
Legacy alias settings arrays must not change (their parity tests guard them); add new settings to the
template modules.
