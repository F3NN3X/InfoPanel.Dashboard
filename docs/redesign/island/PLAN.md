# Dynamic Island

A pill at the top centre of a profile, modelled on the macOS notch and the iPhone Dynamic Island (and
the Windows apps notchify and L4-Windows-NotchBar). When idle it shows the time, the date or one live
value. A live activity, such as the playing track, sits beside the time. It springs open for alerts
and notices, and shrinks to a badge while they last.

The island displays the existing alert engine (`docs/redesign/alerts/PLAN.md`). It does not replace
it. A notice bus lets the dashboard itself and widgets raise notices on it.

## Using it

- **Turn it on:** Studio → the **Dynamic Island** rail panel (`island-panel.tsx`), or Dashboard → Profile →
  **Dynamic Island** (the same section). The panel adds the profile's island widgets on every page with their
  "Send to island" switches (a click opens the zone and its settings) and the alert rules shown as Island.
  The settings:

  | Setting | Values |
  |---|---|
  | When idle | Time; + Date; + Sensor (a picked value with a short label); Hidden (shows only when there is something to show) |
  | Size | S, M, L. A short strip or a small screen gets a smaller size automatically (see Fit). |
  | Color | Black, or Theme (the theme's card colour and text) |
  | Offset from top | 0–64 px |
  | Reserve space | The zones start under the pill instead of under it on the top row |
  | Collapse alerts after | 0–120 s. For screens without touch: an alert that stays until tapped shrinks to a badge after this long. 0 = open until tapped. |
  | Preview an alert | Plays info, warning and critical samples on the canvas in turn |
  | Dashboard notices | Page name, Layout updated, Plugin back, On air (OBS), Calendar countdown: each off until switched on |
  | Count down from | 1–120 min (Calendar countdown on): when the countdown starts and the island opens |
  | OBS WebSocket, Calendar links | Shown while On air or Calendar countdown is on. Saved on the server only, each with its own button (see Server extras) |

- **Alerts:** set a rule's display style to **Island** (in the rule's Outputs, or in the global defaults).
  On a profile without an island, those alerts show as a toast at the top, so none is lost.
- **Widgets:** these have a **Send to island** setting in their own group (Content tab), off by default,
  and their own island options under it while it is on: Now Playing, Steam Friends, Wave Link, FPS
  Monitor, Achievements, Steam News, Drive Space, Network (adapters), Network Throughput, Volume Mixer,
  Weather, Notifications and Timer.
- **"Plugin stopped reporting":** the alert preset of that name watches one of a plugin's sensors with
  the condition **stops reporting** (30 s) and shows on the island.

## What shows and when

| Source | What it raises | Where |
|---|---|---|
| Alert rules with the Island style | The alert: open for its display seconds (0 = until tapped or collapsed), then a badge until the server clears it | Kiosk; the canvas plays only Test alerts |
| Data API connection | After 5 s down, "Data API disconnected" (warning, stays as a badge). When it is back: "Data API reconnected" (3 s) | Kiosk |
| Now Playing | The playing track as the activity (title, artist, cover, progress). A new track opens the island for 4 s. | Kiosk |
| Steam Friends | "Ann is online" and "Bo is playing Doom", for 4 s; each friend at most every 10 min | Kiosk |
| Wave Link | "Microphone muted" (warning) and "Microphone live" (info) for any input, channel or mix, for 2.5 s. Option **Fader moves**: a level bar with the dB value while a channel or mix fader moves | Kiosk |
| FPS Monitor | The running game and its FPS as the activity. Options: **Game started notice** (3 s); **Low FPS warning below** N (two readings in a row under it; every 2 min at most) | Kiosk |
| Achievements | "Achievement unlocked" with the name, game and icon (6 s) | Kiosk |
| Steam News | A new post for a library game: the game and the title (6 s); the first new one per refresh | Kiosk |
| Drive Space | A drive passing the widget's Warn (warning) or Critical (critical) threshold upwards: "Drive C: 91% full" with the free space; every 6 h at most per drive | Kiosk |
| Network (adapters) | An adapter connecting (info) or dropping (warning). Option **Public IP changes** | Kiosk |
| Network Throughput | The download rate as the activity while it is above **Show above** (default 5 MB/s) | Kiosk |
| Volume Mixer | The Windows default device's volume or mute as a level bar, kept open while it moves (1.5 s). Option **Output switched** (on): the new default output device | Kiosk |
| Weather | "Rain starting" or "Snow starting" at the widget's Yr location; every hour at most | Kiosk |
| Notifications | Windows notifications (Notifications plugin 2.0+) from the apps in **Apps** only; none until one is added. Option **Show the message** (on) | Kiosk |
| Timer | The countdown as the activity (amber; green for a break); "Timer done", "Break time" or "Back to focus" when one runs out (10 s) | Kiosk |
| Page name | The page's name for 2 s when the kiosk shows another page | Kiosk |
| Layout updated | "Layout updated" when a studio save reaches the kiosk | Kiosk |
| Plugin back | "Volume is back" when a plugin that stopped reports again (`/api/sources`, polled every 30 s) | Kiosk |
| On air (OBS) | A red Live / Recording dot as the activity (above the others); "You are live", "Stream ended", "Recording started / stopped" | Kiosk |
| Calendar countdown | The next timed event within the lead as the activity ("Standup · in 8 min"); opens once when the countdown starts and again when it begins. All-day events are left out. | Kiosk |
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
13. Every new source is optional: a widget's **Send to island** is off by default, its options show only while it is on, and each dashboard notice is a switch of its own, off by default.
14. The OBS password and the calendar links are secrets. They live in `integrations.json` beside the config, never in `config.json`, which every kiosk downloads. Kiosks get only the state (live or not, the next events). The studio sends a password or link once and then sees only "Saved" and the link's host.
15. OBS and the calendar run on the dashboard server, not in each kiosk: one connection and one fetch for every kiosk, and no secret in the browser. The server has no dependencies, so it speaks the obs-websocket 5 protocol over Node's own WebSocket and reads iCalendar with its own parser (`server/ical.mjs`).
16. Windows notifications pass through an allow-list: the island shows no app until one is added, so switching the source on never floods it.
17. The Timer is the page's own: one countdown shared by its Timer zones and the island, kept across a reload in that browser, not shared between kiosks. It is started from a Timer widget, for screens you can touch.
18. A source whose widget names no key prefixes (Achievements and Steam News read every stream) names its own (`reads`), so the island subscribes only to those.
19. "Plugin back" pairs with the "Plugin stopped reporting" alert preset, which raises the stop; the dashboard notice adds only the return, so a stop is not raised twice.

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
| `notices` | all false | `page`, `layout`, `plugins`, `onAir`, `calendar`: the dashboard notices; only `true` switches one on |
| `calendarLead` | 10 | 1–120 min |

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
    - `progress` (0..1): a level bar under the title (a volume).
    - `refresh`: a repeat while it is held starts its open time again, so a moving volume stays open.
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
- **`dashboard-notices.ts`:** pure: `pageNotice`, `LAYOUT_NOTICE`, `pluginChanges` (the plugins back since they went), `onAirUpdate` and `calendarUpdate` (the countdown and its two announcements).
- **`use-dashboard-notices.ts`:** `useDashboardNotices`, which the kiosk mounts: the page name and layout version from `App.tsx`, the `/api/sources` poll, and the server extras (`src/lib/extras.ts`) for OBS and the calendar.
- **`quiet.ts`:** `isQuiet` is the client port of the server's `isQuiet`. `quietGate` is the bus gate.
- **`sources.ts`:** the widget contract (next section), `islandFeeds`, `applyUpdate` and `runDataFeeds`.
- **`use-island-sources.ts`:** `useIslandSources` and `useConnectionNotice`, which the kiosk mounts. The data feeds run once per new reading, not per render, so a source that repeats a notice while a condition holds (low FPS) cannot loop.

## Widgets as sources

A template opts in with `island` in `templateModule` (`src/widgets/module.tsx`). It then gets a **Send to island**
toggle and the source's own options (`islandSettings`) in its own group; the options show only while the
toggle is on. `DashboardModule.island` carries the definition:

```ts
interface SourceBase {
  hint: string; defaultOn: boolean; group: string;
  options?: ModuleSetting[];       // keys start with "island" (isIslandKey); derive reads them from settings
}
interface DataSourceDef extends SourceBase {   // from the sensor map, flattened as the template sees it
  from: "data";
  reads?: string[];                // its key prefixes, when the widget names none (it reads every stream)
  derive(prev: Data | null, next: Data, settings: ModuleSettings): IslandUpdate;
}
interface StoreSourceDef extends SourceBase {  // from a client store: Wave Link, the timer
  from: "store";
  watch(settings: () => ModuleSettings, emit: (u: IslandUpdate) => void): () => void;
}
// storeSource({ store: { getState, subscribe }, derive, ...base }) builds a StoreSourceDef (and keeps derive for tests).
interface IslandUpdate { notices?: SourceNotice[]; activity?: SourceActivity | null }
```

- **`derive` is pure.** It takes the previous and the new data, and returns the notices to raise and the current activity.
- **`prev` is null for the first data.** That call is the baseline: it may set the activity, but it raises no notice, so nothing fires on load. A source whose keys have not arrived yet is skipped until they do.
- **The streams arrive one by one,** so a pass can hold some of a source's keys and not others. A source whose notice compares one key checks that `prev` had it (Achievements, Notifications, the FPS start notice).
- **One shared subscription.** The kiosk runs one `useSensors` over the union of the enabled sources' prefixes (`feedReads`), so no stream is opened per widget. Each store source gets one watch.
- **The settings are the zone's resolved ones,** so a source can use the widget's own settings too (Drive Space's thresholds and pinned drive, Network Throughput's adapter, Weather's location).
- **The source id is the template id.** It is the notices' `source`, and the activity is cleared when the widget goes.

The definitions live in `src/widgets/island-sources.ts` (Now Playing, Steam Friends, Wave Link) and
`src/widgets/island/` (`gaming.ts`, `hardware.ts`, `audio.ts`, `info.ts`, `timer.ts`). To add one:
1. Write a `derive` (and any `options`, with keys starting with `island`).
2. Pass it as `island` in the registry entry.
3. Add tests for the baseline, a partial first pass, the transitions and the repeats.

## Server extras (`server/extras.mjs`)

| Route | |
|---|---|
| `GET /api/extras`, SSE `/events/extras` | `{ obs: { configured, connected, streaming, recording }, calendar: { configured, events, error? } }`: the state kiosks read (`src/lib/extras.ts`, one shared EventSource) |
| `GET /api/integrations` | The settings without secrets: `{ obs: { host, port, hasPassword }, calendar: { links: [{ id, label, host }] } }` |
| `PUT /api/integrations` | A patch (`applyIntegrations`): `obs.password` replaces it, `""` clears it, absent keeps it; `calendar.links` is the full list, `{ id }` keeps a stored link, `{ url, label }` adds one. Needs `X-Dashboard-Config: 1` and JSON, like `/api/config`. |

- **`integrations.mjs`:** `integrations.json` in the data folder. Hosts, ports and links are validated (http, https, and webcal as https; at most 10 links).
- **`obs.mjs`:** an obs-websocket 5 client (OBS 28+, Tools › WebSocket Server Settings). Hello, then Identify (with `obsAuth` when OBS asks) subscribed to Outputs; then `GetStreamStatus` and `GetRecordStatus`, and the `StreamStateChanged` and `RecordStateChanged` events. It reconnects every 5–60 s while OBS is closed.
- **`calendar.mjs`:** fetches each link every 10 minutes (15 s timeout, 5 MB at most) and sends the occurrences from an hour ago to 36 hours on (at most 50). A failing link keeps its last good feed and reports the error. Before each fetch, and on each redirect hop (followed by hand, at most three), every address the host resolves to is checked: loopback, link-local (cloud metadata), unspecified and multicast addresses are refused, also when written as IPv4 inside IPv6 (`::ffff:7f00:1`, NAT64). The request connects through the same check (`guardedFetch` over node:http(s) with its own `lookup`), so a name that changes its answer after the first check is refused too. LAN addresses stay allowed for calendars on a NAS or Nextcloud.
- **`ical.mjs`:** UTC, floating, TZID (IANA and the common Windows names) and all-day times; RRULE with FREQ (daily to yearly), INTERVAL, COUNT, UNTIL, BYDAY (also the nth weekday), BYMONTHDAY and BYMONTH; EXDATE; RECURRENCE-ID overrides; cancelled events left out. Not covered: BYSETPOS, BYWEEKNO, BYYEARDAY, hourly rules and custom VTIMEZONE definitions (such a time is read as the server's local time).

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
- every new source's `derive` (baseline, partial first pass, transitions, options), the timer, the dashboard notices, the calendar countdown, the extras parser
- the server: integrations (no secret in the public form, patches, validation, the file), the obs-websocket steps and the documented auth string, the iCalendar reader (zones and DST, recurrence, EXDATE, overrides, all-day) and the calendar refresh

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

Second round (I5–I9), same setup with every new source on a QA page, the extras and `/api/integrations`
GET routed to the fake, and the control and config streams mocked (0 writes; the studio's own autosave
POST was blocked):

| Check | Result |
|---|---|
| Load | Idle; nothing fired (after fixing a partial-baseline achievement notice) |
| Game starts, FPS drops to 50 then 40 | "Game started", the game and FPS beside the time, then "40 FPS · under 60" |
| New achievement, new Steam post, drive to 85 % | Each opens in turn |
| Ethernet down, up; public IP changes; 92 MB/s download | "disconnected", "connected", "Public IP changed", "↓ 92.0 MB/s" as the activity |
| Volume 40 → 55 %, default output switches, rain starts | Level bar "Volume 55%", "Headphones · Output device", "Rain starting · 0.6 mm/h · Oslo" |
| Notification from Steam (not listed), then Discord | Nothing, then "Discord: Bo · gg" |
| Timer widget: 1m | Countdown beside the time; "Timer done" a minute later |
| OBS streaming, then recording | "You are live", the Live dot, "Recording started" |
| Calendar event in 8 min | "Standup · in 8 min · Room 1", then the countdown |
| A plugin leaves the list and comes back | "Volume is back" |
| Control switches the page; the config changes | "Gaming · Page"; "Layout updated" |
| Widget QA, Timer at cell 110 and 150, idle and running | No overflow |
| Studio | Dashboard notices, Count down from, the OBS and Calendar card ("Connected", the link as its host); the Notifications zone's Apps chips with the plugin's apps offered |

Found and fixed on the way: the data feeds ran on every render, so a repeating low-FPS notice looped;
Achievements and Steam News name no prefixes, so their changes did not reach the island; a pass before a
source's key arrived counted as its baseline.

## Phases

| Phase | Scope | Status |
|---|---|---|
| I1 | Config, island alert style and fallback, queue, bus, view, kiosk / plain / canvas mounts, inspector section, collapse timer | done |
| I2 | Data API disconnect notice; server `missing` op and the "Plugin stopped reporting" preset; a sensor value as the idle item | done |
| I3 | Widget opt-in (`island` on `templateModule`, "Send to island"); one shared `useSensors`; baseline-first `derive`; live activity slot; Now Playing, Steam Friends and Wave Link sources | done |
| I4 | Reserve space, theme tint, studio Preview button, quiet hours for local notices, tap to peek at held notices, fit to the profile size, docs | done |
| I5 | Source options (`islandSettings`), store sources (`storeSource`), notice `progress` and `refresh`, the dashboard notices and their switches | done |
| I6 | FPS Monitor, Achievements, Steam News, Drive Space, Network, Network Throughput, Volume Mixer, Weather and Notifications sources; Wave Link fader moves | done |
| I7 | Server extras: integrations file and routes, obs-websocket client, iCalendar reader and calendar refresh; the studio's OBS and calendar card | done |
| I8 | Timer widget and its island source | done |
| I9 | Docs and browser QA | done |
| I10 | Motion: open / close / morph springs from L4 NotchBar (open 0.42 s bounce 0.24, close 0.32 s / 0.04, morph 0.36 s / 0.14) written as CSS `linear()` (`spring.ts`); content never scales, it enters with blur 6 px and a 6 px lift after 50 ms and leaves faster (120 ms) on its own layer; Lively / Smooth / Off; `?slow=N` | done |
| I11 | Look: Pill or Notch (concave corners from radial gradients, on the top edge), scale 80-150 %, Black / Theme / Custom colours, opacity with backdrop blur, border, shadow, font and weight, seconds and 12/24 h over General (`island-look.ts`) | done |
| I12 | Glanceable extras: up to three idle values with orange / red levels (one stored `sensorKey` migrates), idle rotation of the date, the values and the next event, the hairline idle (`line`), grouped notices with a count (`group`, `count`) | done |
| I13 | Claude Code / Codex on the island: hooks and the statusline post to the server through `tools/agent-status.mjs` (loopback, JSON, `X-Agent-Event: 1`), installed by `tools/agent-install.mjs`; `server/agents.mjs` reduces them to sessions (working, waiting, done, error) with only a hashed key and the folder's name; the island shows the most urgent session as an activity, a badge while one waits, "finished" after a turn of 20 s or more, an error, and the plan passing 80 / 95 % | done |
| I14 | The Coding Agents widget: plan 5 h / 7 d with reset times, sessions with tool, time and context, tokens today and per day for 14 days (`server/agent-usage.mjs` reads `~/.claude/projects` and `~/.codex/sessions` incrementally) | done |

**Deploying the extras:** the server must be restarted for `/api/extras`, `/events/extras` and `/api/integrations` to exist; until then On air and Calendar stay quiet and the studio card shows its load error.

**Deploying the `missing` op:** the server (`server.mjs`, which runs `server/alerts.mjs`) must be restarted for rules with `stops reporting` to evaluate. An older server never fires them.
