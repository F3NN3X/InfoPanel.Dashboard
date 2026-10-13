# Profile pages (plan)

Status: **awaiting approval 2026-10-13**. Context: `../ROADMAP.md` §P and §C. Each phase ends with `npm run build`
and `npm test` green, and existing configs load and render unchanged.

## Decisions (user, 2026-10-13)

- A profile holds several pages; "Add page" gives a blank canvas on the profile's grid.
- Pages share the profile's size, grid, fit, gap, padding, theme, style and background.
- The kiosk can show page dots and switch by swiping (General setting, off by default).
- Pages can auto-rotate on a timer (profile option, off by default). Rotation pauses for 30 s after a
  touch or a remote switch, and can be toggled on and off at runtime (studio, kiosk dots, Stream Deck)
  without losing its interval and page list.
- Downgrade guard: the server refuses a config save from a build older than the stored config.
- The Stream Deck plugin is a separate repo, `InfoPanel.StreamDeckDashboard` (its own plan, after P3).

## Model

```ts
interface ProfilePage {
  id: string;            // "main" for the migrated page
  name: string;          // "Main"
  icon?: string;         // lucide name; the switcher and Stream Deck keys show it
  placements: Placement[];
}
interface MonitorProfile {
  // …unchanged fields, minus `placements`
  pages: ProfilePage[];  // at least one
  /** Auto-rotate; unset or `enabled: false` = off (the interval and list stay stored). `pages` empty = every page. */
  rotate?: { enabled: boolean; seconds: number; pages?: string[] };
}
// GeneralSettings
kioskPageNav?: boolean;  // page dots + swipe in the kiosk; default false
```

- `DashboardConfig.version` 2 → 3. `mergeConfig` wraps `placements` into `pages: [{ id: "main",
  name: "Main", placements }]`; a profile with neither gets one empty Main page. The same path covers
  local storage, the server copy, file import (`config-file.ts`) and the shipped samples, whose builders
  emit pages (their `sampleVersion` stays, so saved copies are migrated, not replaced).
- **Downgrade guard:** an older build that loads a v3 config sees no `placements` and could push back a
  page-less copy. `server.mjs` refuses a `POST /api/config` whose `version` is below the stored one (409),
  and the studio says "a newer dashboard version saved this config; reload" and stops auto-pushing.
- **Rotation toggle:** `rotate.enabled` is the saved default; the control channel holds a runtime
  override per profile (`on` / `off`), so a Stream Deck or kiosk toggle does not touch the config or
  the undo history. "Reset to saved" clears the override; a config change to `rotate` clears it too.
- Helpers in `src/lib/pages.ts`: `pageOf(profile, pageId?)` (falls back to the first),
  `profileWithPage(profile, pageId)` (a `MonitorProfile`-shaped view whose `placements` are the page's,
  so the existing readers keep working), `updatePagePlacements(profile, pageId, fn)`, `addPage`,
  `removePage` (never the last), `movePage`, `renamePage`, `duplicatePage` (fresh zone ids),
  `moveZoneToPage` (keeps the box if free, else the first free spot that fits the widget minimum).

Readers today: 66 `.placements` reads in 16 files, 29 of them in `studio-actions.ts`. Moving the field
makes the compiler list every one; each either takes the page view or goes through the helpers.

## Phases

| # | Phase | Output |
|---|---|---|
| P1 | Model + migration | Types, `pages.ts`, v3 migration in `mergeConfig`, samples emit pages, the downgrade guard in `server.mjs`. Every reader moved to the current page (the first one; no UI yet). Tests: migration (v1, v2, v3, missing, empty), helpers, guard, a v2 config round trip renders the same zones. |
| P2 | Studio pages | Page tabs above the canvas: switch, add, rename (double-click), reorder (drag), duplicate, delete (confirm, not the last), icon. Layers and explorer follow the current page; "Move to page" in the zone menu; Ctrl+PageUp / PageDown (not in inputs). Undo: one step per page add / delete / reorder / rename / duplicate / zone move; the page being edited is view state. Profile inspector: Auto-rotate group (on/off toggle, seconds, page checklist). |
| P3 | Control channel + kiosk | `server.mjs`: runtime state (active page per profile, active profile override) persisted to `control.json`; `GET /api/control`, `POST /api/control/page` `{ profile?, page \| "next" \| "prev" }`, `POST /api/control/profile`, `POST /api/control/rotate` `{ profile?, state: "on" \| "off" \| "toggle" \| "saved" }`; SSE `/events/control`. The kiosk shows the active page (`?page=` pins one), cross-fades on switch (instant with reduced motion). The studio shows which page the kiosk is on and can send it there. Tests: state transitions, next/prev wrap, unknown ids, rotate override and its reset, persistence, SSE payload. |
| P4 | Kiosk navigation | Page dots (bottom, theme-coloured, tap to switch) and swipe when `kioskPageNav` is on; auto-rotate per profile (pauses for 30 s after a touch or a remote switch; long-press the dots toggles it, with a pause icon while off; the studio top bar shows a rotate toggle while a kiosk is rotating). Both go through the control channel, so every kiosk and the Stream Deck stay in step. QA: dots never cover zones at cell 110/150 in any skin. |

After P4: the Stream Deck plugin plan (`InfoPanel.StreamDeckDashboard`), then alerts (`../ROADMAP.md` §A).

## Feature map

New rows in `FEATURE_MAP.md` for: page tabs, page CRUD and reorder, move zone to page, page icon,
kiosk active page, page dots and swipe, auto-rotate and its toggle, control API, downgrade guard. No existing row changes owner.

## Risks

- **Older builds pushing page-less configs** — the downgrade guard (P1).
- **Hidden placements readers** outside TypeScript (server, docs, fixtures) — grep for `placements`
  in `server.mjs`, `__fixtures__`, `widget-qa.tsx` and the docs in P1.
- **Selection across pages** — clear or keep the selection per page on switch; multi-select never spans
  pages.
