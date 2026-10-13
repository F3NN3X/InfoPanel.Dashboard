# Studio design: zones and widgets

> The studio's look and interaction design (top bar, icon rail and left panel,
> canvas with a floating zoom bar, the registry-driven inspector, the Data
> Explorer) is specified in [`docs/redesign/`](redesign/README.md); the
> decisions taken while building it are in [`redesign/DECISIONS.md`](redesign/DECISIONS.md)
> and the old-to-new feature checklist in [`redesign/FEATURE_MAP.md`](redesign/FEATURE_MAP.md).
> How it works now: the [customization guide](customization-guide.md) and
> [architecture](architecture.md#4-kiosk-and-studio).

This note originally argued for one zone-based studio instead of two editors
(grid and free canvas), and also described a Simple / Advanced split and the
per-widget option lists. Those parts are superseded: there is no Simple /
Advanced mode (the inspector has an Advanced toggle instead), the free-canvas
editor is gone, and every widget's options are in [`module-catalog.md`](module-catalog.md)
and [`widget-settings.md`](widget-settings.md). What still holds is below.

## Model

```
Profile  = width × height (px), cols, rows, fit ("fill" | "scroll")
Zone     = { id, colStart, rowStart, colSpan, rowSpan, visible, widget }
Widget   = module (registry) | panel (group of small widgets) | blank
```

A zone is a `Placement` with an explicit grid box (`src/lib/layout.ts`); a
widget is its content. Resizing a zone only changes the box and the widget
re-renders to fit: modules scale to their cell and a panel flows, grids or
overlays inside it.

### Grid cells

- `cols` and `rows` give a uniform cell of `width/cols × height/rows`
  (1920×550 with 12×4 is 160×137).
- The canvas draws the grid explicitly. `fit: "fill"` makes the canvas exactly
  the viewport (a kiosk strip); `fit: "scroll"` fixes the cell height and the
  page scrolls.
- Rows are a plain profile setting (default 4 for strips up to 600 px high,
  6 for 1080p). Changing the grid is refused if a zone would fall outside it.

### Zone rules

- Zones are drawn by dragging over empty cells, then moved and resized by
  dragging; there is no auto-flow.
- **No overlap.** A draw, move or resize that collides does nothing (or is
  clamped to free cells where it can be): overlap is a layout bug in a
  dashboard, not a feature.
- A zone can be **blank**: draw the region first, fill it later. Every widget
  declares a minimum footprint (`minCols × minRows`) that is enforced
  everywhere.

## Fluid fill

The zone border is the truth. A widget stretches to fill its zone (cards
center, lists scroll, art scales); content smaller than the zone is centered,
content bigger clips at the edge. There is no down-scaling and no empty
padding. The adaptive "modern" widgets pick card / standard / compact / simple
from the measured zone size.

## Migration (config v2)

- `config.version: 2`; `MonitorProfile` gained `rows`.
- Existing auto-flowed `placements` kept their position (filled in from the
  old flow), so nothing moved.
- `freeProfiles` and the 1:1 InfoPanel item model were dropped from saved
  configs; an `activeProfile` / `kioskProfileId` that pointed at one was
  repointed to the `arcv2` grid profile.

## Related

- [`module-catalog.md`](module-catalog.md) - the registry index: every
  module's id, picker name, minimum footprint, data keys and options.
- [`widget-settings.md`](widget-settings.md) - the setting schema, the
  standard block, presets and how a widget adopts them.
