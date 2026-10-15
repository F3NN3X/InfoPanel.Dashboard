# Dynamic Island

A pill at the top centre of a profile, modelled on the macOS notch and the iPhone Dynamic Island (and
the Windows apps notchify and L4-Windows-NotchBar). When idle it shows the time, the date or one live
value. A live activity, such as the playing track, sits beside the time. It springs open for alerts
and notices, and shrinks to a badge while they last.

The island displays the existing alert engine (`docs/redesign/alerts/PLAN.md`). It does not replace
it. A notice bus lets the dashboard itself and widgets raise notices on it.

## Using it

- **Turn it on:** Studio → Dashboard → Profile → **Dynamic Island**. The settings:

  | Setting | Values |
  |---|---|
  | When idle | Time; + Date; + Sensor (a picked value with a short label); Hidden (shows only when there is something to show) |
  | Size | S, M, L. A short strip or a small screen gets a smaller size automatically (see Fit). |
  | Color | Black, or Theme (the theme's card colour and text) |
  | Offset from top | 0–64 px |
  | Reserve space | The zones start under the pill instead of under it on the top row |
  | Collapse alerts after | 0–120 s. For screens without touch: an alert that stays until tapped shrinks to a badge after this long. 0 = open until tapped. |
  | Preview an alert | Plays info, warning and critical samples on the canvas in turn |

- **Alerts:** set a rule's display style to **Island** (in the rule's Outputs, or in the global defaults).
  On a profile without an island, those alerts show as a toast at the top, so none is lost.
- **Widgets:** Now Playing, Steam Friends and Wave Link have a **Send to island** setting in their own
  group (Content tab). It is off by default.
- **"Plugin stopped reporting":** the alert preset of that name watches one of a plugin's sensors with
  the condition **stops reporting** (30 s) and shows on the island.

## What shows and when

| Source | What it raises | Where |
|---|---|---|
| Alert rules with the Island style | The alert: open for its display seconds (0 = until tapped or collapsed), then a badge until the server clears it | Kiosk; the canvas plays only Test alerts |
| Data API connection | After 5 s down, "Data API disconnected" (warning, stays as a badge). When it is back: "Data API reconnected" (3 s) | Kiosk |
| Now Playing | The playing track as the activity (title, artist, cover, progress). A new track opens the island for 4 s. | Kiosk |
| Steam Friends | "Ann is online" and "Bo is playing Doom", for 4 s; each friend at most every 10 min | Kiosk |
| Wave Link | "Microphone muted" (warning) and "Microphone live" (info) for any input, channel or mix, for 2.5 s | Kiosk |
| Preview button | Info, warning and critical samples | Studio canvas |

The plain page (not a kiosk) shows the idle pill only.

**Taps on the kiosk:**
- A tap on an open alert acknowledges it. A tap on any other open notice dismisses it.
- A tap on the badge opens the held notices again, one per tap, strongest first, for 6 s each.
- A tap on the activity opens it for 6 s.

**Quiet hours:** the alerts' quiet hours also apply to the dashboard's own notices. Inside the window,
a notice below the minimum severity is dropped. Server alerts are filtered on the server already.

## Decisions

1. Alerts reach the island through rules with the Island style, and widgets through their own "Send to island" setting. There is no "show every alert" option.
2. The island shows on the plain page as the idle pill only. Alerts and notices are kiosk-only.
3. The studio canvas plays only test alerts and previews. Live alerts stay on kiosks and in the Alerts drawer.
4. "Plugin stopped reporting" is the server op `missing`:
   - It fires once the key has been absent for `forSeconds`.
   - It counts only after the rule has seen the key, so a sensor that never reported stays quiet.
   - The Data API drops a stopped plugin's keys (`removed` in the stream).
5. A Data API disconnect is detected on each kiosk from `useSensorsConnected()`, debounced 5 s.
6. The island overlays the top row like a notch. **Reserve space** pushes the zones down instead.
7. The colour is black. **Theme** uses the theme's card colour.
8. The dashboard's own notices follow the alerts' quiet hours.
9. Taps and timers:
   - A tap acknowledges an alert.
   - For screens without touch, **Collapse alerts after** shrinks an alert that stays until tapped into the badge.
10. Widget notices are raised once per widget type, from its first zone with the setting on. Two Now Playing zones raise each track once.
11. Sources run for the zones on every page of the profile, not just the visible page, so a friend coming online shows while another page is up.
12. Zones inside panels are not sources.

## Model

`MonitorProfile.island?: IslandConfig` (`src/lib/island/config.ts`):

| Field | Default | |
|---|---|---|
| `enabled` | true | |
| `idle` | `"time"` | `time`, `time-date`, `sensor`, `hidden` |
| `sensorKey`, `sensorLabel` | `""` | The idle sensor, and up to 12 characters before it |
| `size` | `"m"` | `s`, `m`, `l` |
| `offsetY` | 8 | 0–64 px |
| `collapseAfter` | 0 | 0–600 s |
| `reserve` | false | |
| `tint` | `"black"` | `black`, `theme` |

- **Absent means no island.** `CONFIG_VERSION` stays 4: this follows the `alerts` precedent, where absent means none and no migration is needed.
- `normalizeIsland` runs in `profileExtras`. Missing fields take their defaults, so an island stored by an earlier build loads with the new options at their defaults. Bad enums fall back and numbers are clamped.
- `withIsland` patches the island. A profile without one starts from the defaults, switched off.
- `AlertStyle` gains `"island"`. An older kiosk build that doesn't know it draws it as a toast.
- A widget's opt-in is the zone setting `island` (boolean).

## Notice bus (`src/lib/island/`)

- **`types.ts`:**
  - `IslandNotice`:
    - `source` and `id`: the identity. Raising the same pair again updates the notice in place.
    - `severity`, `title`, `body` and `image`.
    - `ttl`: open time in ms. 0 means until tapped or collapsed. The defaults are info 4 s, warning 8 s, critical 0.
    - `cooldownMs`.
    - `badge`: after its open time the notice stays as a badge until its source drops it. Default false: it ends.
    - `onTap` and `alertId`.
  - `IslandActivity`:
    - `source`, `id`, `title`, `subtitle`, `image`, `color`, `progress` (0..1) and `priority`.
    - The highest priority shows, then the newest.
- **`queue.ts`:** pure functions of (state, now).
  - Only one notice is open at a time.
  - A stronger notice takes over at once. The one it replaced keeps its open time left. Equal or weaker notices wait their turn.
  - A notice that is not a badge ends with its open time. A badge stays held.
  - A rise in severity opens a notice again.
  - Cooldown applies after a notice ends.
  - At most 20 notices are held.
  - `peek` opens a held notice again (a tap on the badge).
- **`bus.ts`:** `createIslandBus(clock)`, the page's `islandBus`, `notify(n)` and `useIsland()` (`useSyncExternalStore`).
  - `syncSource(source, notices)` takes complete sets, such as server alerts.
  - `setActivity` and `clearActivity` manage activities.
  - `setGate` installs the quiet-hours filter.
  - `setSticky` sets the collapse time.
  - One timer runs, only for the moment the open notice runs out.
- **`from-alerts.ts`:**
  - `splitIslandAlerts` sends every shown alert to exactly one place: the island, or the alert layer.
  - `noticeFromAlert` builds a badge notice that is open for the rule's display seconds; a tap acknowledges it.
- **`system.ts`:** `createConnectionWatch(bus, clock)` produces the Data API disconnect and reconnect notices.
- **`quiet.ts`:** `isQuiet` is the client port of the server's `isQuiet`. `quietGate` is the bus gate.
- **`sources.ts`:** the widget contract (next section), `islandFeeds`, `applyUpdate` and `runDataFeeds`.
- **`use-island-sources.ts`:** `useIslandSources` and `useConnectionNotice`, which the kiosk mounts.

## Widgets as sources

A template opts in with `island` in `templateModule` (`src/widgets/module.tsx`). It then gets a **Send to island**
toggle (`islandSetting`) in its own group, and `DashboardModule.island` carries the definition:

```ts
interface DataSourceDef {          // from the sensor map, flattened as the template sees it
  from: "data"; hint: string; defaultOn: boolean; group: string;
  derive(prev: Data | null, next: Data, settings: ModuleSettings): IslandUpdate;
}
interface WavelinkSourceDef {      // from the shared Wave Link client's state
  from: "wavelink"; /* same fields */ derive(prev: WlState | null, next: WlState, settings): IslandUpdate;
}
interface IslandUpdate { notices?: SourceNotice[]; activity?: SourceActivity | null }
```

- **`derive` is pure.** It takes the previous and the new data, and returns the notices to raise and the current activity.
- **`prev` is null for the first data.** That call is the baseline: it may set the activity, but it raises no notice, so nothing fires on load. A source whose keys have not arrived yet is skipped until they do.
- **One shared subscription.** The kiosk runs one `useSensors` over the union of the enabled sources' prefixes, so no stream is opened per widget. Wave Link uses the shared `wavelink.subscribeState` client.
- **The source id is the template id.** It is the notices' `source`, and the activity is cleared when the widget goes.

The definitions live in `src/widgets/island-sources.ts`. To add one:
1. Write a `derive`.
2. Pass it as `island` in the registry entry.
3. Add tests for the baseline, the transitions and the repeats.

## View (`src/components/island/`)

- **Modes (`island-model.ts`):** `expanded`, then `compact`, then `activity`, then `idle`, then `none`.
  - `expanded`: icon or image, title, body.
  - `compact`: time plus a severity dot and count.
  - `activity`: time on the left, the activity on the right, a progress line.
  - `idle`: time, plus the date or the sensor value.
  - A held notice wins over the activity.
- **Animation:**
  - Width, height and radius move between fixed boxes (`islandBox`) with a CSS `linear()` spring (`.island-motion`, 560 ms).
  - The content fades in (`.island-fade`). A critical notice glows (`.island-critical`).
  - Reduced motion (the OS setting, or General › Motion) turns all of this off.
- **Fit:** `fitIslandSize` steps down from the chosen size until the open island stays within 40 % of the profile height and inside its width.
  - 1920×1080, 1920×550 and 1024×600 keep L.
  - Only a strip under about 240 px high goes smaller.
- **Reserve:** `islandReserve` = offset + idle height + 8 px. The kiosk page and the studio canvas both add it to the top padding, and the canvas row maths subtracts it.
- **Stacking:** z-55, above the zones and under the alert layer (z-60).
- **Structure:**
  - `DynamicIsland` keeps the kiosk's `LiveSources` (quiet gate, connection watch, widget sources) mounted in one place in every mode, so their baseline survives mode changes.
  - `IslandPill` draws the pill.
- **Clock:** reuses `formatClock` and General's clock settings. It is its own component, so the one-second tick re-renders only it.

## QA

Unit tests cover:
- config, queue, bus, quiet hours, the connection watch, the alert split
- the source contract and feed pass, and every widget `derive`
- the view, `fitIslandSize`, `islandReserve`
- the server `missing` op and the preset

Browser checks (Vite with the config mocked, every write blocked, and a fake Data API on 127.0.0.1:3931 with streams that stay open):

| Check | Result |
|---|---|
| Strip 1920×550 on load | Activity shown; no notice. Reserve made the top padding 56 px. |
| New track | Opens for 4 s, then back to the activity |
| Friend comes online, friend starts a game | Each opens in turn |
| Tap on the activity | Opens it |
| Media paused | Idle shows "time · GPU 71 °C" |
| Data API down | Warning after 5.0 s; "reconnected" when back, then idle |
| 1024×600 with Theme tint and size L | Critical alert at 470×96; a tap sends one `ack`; the warning opens next, collapses to a badge, and a tap on the badge peeks it |
| Studio | Inspector section with every option; Preview plays on the canvas (a warning preempts the info, which then resumes); "Send to island" found by the settings search |
| Quiet hours on (23:00–07:00) | Local info notices are held back |

Wave Link mutes are covered by unit tests only.

## Phases

| Phase | Scope | Status |
|---|---|---|
| I1 | Config, island alert style and fallback, queue, bus, view, kiosk / plain / canvas mounts, inspector section, collapse timer | done |
| I2 | Data API disconnect notice; server `missing` op and the "Plugin stopped reporting" preset; a sensor value as the idle item | done |
| I3 | Widget opt-in (`island` on `templateModule`, "Send to island"); one shared `useSensors`; baseline-first `derive`; live activity slot; Now Playing, Steam Friends and Wave Link sources | done |
| I4 | Reserve space, theme tint, studio Preview button, quiet hours for local notices, tap to peek at held notices, fit to the profile size, docs | done |

**Deploying the `missing` op:** the server (`server.mjs`, which runs `server/alerts.mjs`) must be restarted for rules with `stops reporting` to evaluate. An older server never fires them.
