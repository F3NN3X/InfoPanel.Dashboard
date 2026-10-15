---
title: Widget editing redesign — quick bar, one-column inspector, bottom sheet
status: built on feat/widget-editing, not merged
created: 2026-10-15
updated: 2026-10-15
tags: [studio, inspector]
---

Built from `docs/redesign/widget-editing/SPEC.md`, which replaces the bottom-inspector handoff. The
first bottom-strip build was dropped before it was committed: it still scrolled sideways in
"Size & alignment" and "Colors & surface" on the live studio.

## What shipped

- The inspector's place now comes from the studio's width: docked at 1100 px and wider, a floating
  card from 640 px (closed by default), and a bottom sheet below 640 px. The Side / Bottom / Auto
  setting, the bottom dock, its splitter and the scroll-spy are gone.
- Quick bar over the canvas with each widget type's pinned settings (at most 6, the pins saved in
  `studio.quickPins`), shared pins for a multi-selection, and "Dashboard" + All settings when
  nothing is selected in floating mode.
- One-column inspector with an accordion (`studio.accordion`), search across all tabs, a Changed
  filter, Reset all, per-section reset, inline rows and colour swatches. A value equal to the
  inherited one drops the override.
- Bottom sheet with peek, half and full snaps, a tool strip, 44 px touch targets, and the zoom bar
  sitting above the sheet. On a phone the top bar moves Undo / Redo into the ⋯ menu.
- Canvas: a 2 px selection outline 5 px outside the zone, a hover outline, hidden zones faded with a
  dashed border and a badge, and an empty-canvas click that also puts the inspector away.

## Checked

In the Vite dev server against the live config, with POSTs to `/api/config` intercepted during
every edit (each response body was `{}`, so no edit reached the server):
- Widths: 1440 docked, 1024 floating, 390 sheet.
- Quick bar: pin and unpin, sync both ways, multi-select, dashboard bar, swatch popover.
- At 1024: the longest quick set scrolls only in the middle.
- Inspector: Changed, section, dot and Reset all; "glow" found from Content; one-open accordion;
  no sideways scroll in the aside.
- Sheet: tap, drag, Collapse, tile to half, and empty tap back to peek.
- Canvas: hidden badge and hover.

Every studio load POSTs the config once, from `src/App.tsx`, which this branch does not change.
Before the interception, those POSTs from page loads where nothing was edited did reach the live
server.

## Decisions

- Default quick sets follow a rule (Layout, Accent, then the first two own compact settings),
  not a hand-picked list per widget.
- Lucide icons instead of Material Symbols. Sources view unchanged.
- The quick bar's top room is reserved whenever the bar is on, so selecting a zone never refits the
  page.

## Still open

- The final `npm run build` rewrote `dist/`, so the live server on 3922 served this branch before it
  was merged.
