# Roadmap after the widget library (agreed 2026-10-13)

Order agreed in discussion: **pages → control channel + Stream Deck → alerts**, with widget-control
refinement as a parallel track (backlog: `widget-backlog.md`). Each phase ends with the build and
tests green, and existing configs load and render unchanged.

## P. Profile pages

A profile holds several pages. A new profile starts with one page ("Main"); "Add page" gives a blank
canvas on the same grid. Example: Main (overview), Game (FPS, GPU, frame times), Stream (Wave Link,
chat, now playing).

### Model

```
Dashboard config
  └ Profile   size, grid, fit, gap, padding, theme / style / background (unchanged)
      └ Page  id, name, icon (for Stream Deck keys and the switcher), placements
          └ Zone  (unchanged)
```

- `MonitorProfile.placements` moves to `MonitorProfile.pages[].placements`. Config `version` 2 → 3; the
  migration wraps the old placements in one page `{ id: "main", name: "Main" }`. Shipped sample
  profiles (`sampleVersion`) get the same wrap.
- Detailed phases: `pages/PLAN.md`.
- Pages share the profile's grid, size and style. Per-page overrides (background, style) are left out
  until asked for; the model leaves room for them.
- Moving `placements` (not adding a `page` field per zone) makes the compiler find every one of the
  ~66 reads in 16 files. Most of them take a profile, so a `profileWithPage(profile, pageId)` view
  (the profile with that page's placements) keeps them unchanged; edits go through
  `updatePagePlacements`.

### Studio

- Page tabs above the canvas: switch, add, rename, reorder (drag), duplicate, delete (confirm), icon.
- Layers and the explorer show the current page; "Move to page" in the zone context menu.
- Undo: add / delete / reorder / rename page = one step each. Switching the page being edited is
  view state, not undoable.
- Keyboard: Ctrl+PageUp / PageDown switch pages (never inside inputs).

### Kiosk

- Shows the profile's **active page** (runtime state, below), else the first page. `?page=<id>` pins one.
- Page dots and swipe to switch on touch screens (a General setting, off by default).
- Auto-rotate through the pages on a timer (a profile option, off by default; toggleable at runtime,
  pauses 30 s after a touch or remote switch).
- A page switch cross-fades (respecting reduced motion).

## C. Control channel

Runtime state that is not config and not undoable: the active page per profile, active alerts.

- `server.mjs` holds it in memory (persisted to a small JSON so a restart keeps the page).
- `GET /api/control` → state; `POST /api/control/page` `{ profile?, page | "next" | "prev" }`;
  `POST /api/control/profile` `{ profile }`.
- Pushed to kiosks, the studio and the Stream Deck plugin over SSE (`/events/control`, next to the
  existing `/events/config`).
- `request-guard.mjs` already limits hosts to loopback and this machine; the Stream Deck plugin runs
  locally.

## S. Stream Deck plugin (native, Elgato SDK v2, TypeScript)

Separate repo: `InfoPanel.StreamDeckDashboard`. Talks only to the dashboard server (`/api/config`, `/api/control`, `/events/control`).

| Action | Key | Feedback |
|---|---|---|
| Go to page | pick profile + page in the property inspector (lists from `/api/config`) | page icon + name; highlighted while active |
| Next / previous page | — | current page name |
| Switch profile | pick profile | active state |
| Toggle auto-rotate | pick profile (or the active one) | on / off state |
| Page cycler (Stream Deck + dial) | rotate = next/prev, press = first page | touch strip: page name + dots |
| Sensor value | pick a sensor (from the Data API) | live value on the key, colour by threshold |
| Alerts | press = acknowledge the newest | count badge, colour by severity |

Key images are drawn in the plugin (SVG) using the dashboard theme colours from `/api/config`.

## A. Alerts

**Sources**
- Sensor thresholds: any sensor, above/below a value for N seconds, with hysteresis and a cooldown
  (high GPU temperature, power draw, usage…). Presets for the common ones.
- Windows notifications: mirrored from Windows (app, title, body, icon), filtered by app.
- Plugin / host events where a plugin exposes them.

**Outputs** (per rule): toast overlay on the kiosk (position, duration, style following the theme),
switch to a page (and back after it clears), highlight the widget that shows the sensor, sound.
Severity (info / warning / critical) sets the default look. An alert history in the studio.

**Where it runs**: rules are dashboard config (edited in the studio); the dashboard server evaluates
them on one Data API subscription, so alerts fire even with no studio open and every kiosk sees the
same alert, cooldown and acknowledgement.

**Windows notifications**: the browser cannot read them, so a native process must. The
`InfoPanel.Notifications` plugin today shows its own WPF toasts (CPU threshold, manual triggers); it
does not read Windows' notification centre. Extending it with `UserNotificationListener` (WinRT) and
publishing each notification as Data API entries makes it the source; the dashboard does the rules and
display. Open: the listener API needs user consent and may need package identity for an unpackaged
app; to be proven first (spike).

## W. Widget controls (parallel track)

Work through `widget-backlog.md` in small batches between the phases above.
