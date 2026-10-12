# Documentation

The project overview, install steps and server endpoints are in the
[top-level README](../README.md). The documents here go deeper.

## Using the dashboard

- [Customization guide](customization-guide.md) - the studio layout (top bar, left rail and drawers, canvas, inspector beside or below it, sticky fit zoom), undo, keyboard shortcuts and the command palette, panels (layout starters, saved panels, stack / grid / overlay layouts, alignment, the widget editor, canvas selection, the Code view and panel CSS hooks), and making a widget look the way you want: scaling, alignment, colors, borders, custom CSS, presets, hiding idle widgets; and the dashboard-wide settings: appearance presets, the global style, theme colours (per profile too), the page background (image or video, uploads), general settings (font, clock and locale, motion, kiosk cursor) and the grid gap and padding.

## Widgets

- [Widget catalog](module-catalog.md) - every widget, its picker name, size, data keys and options.
- [Widget settings](widget-settings.md) - the setting schema, the standard block every modern widget shares, view presets, profile style, the panel settings and the audio views.
- [System widget](system-widget.md) - full reference for the System (modern) widget: settings, layouts, thresholds, drives and known limits.

## Internals

- [Architecture](architecture.md) - how data flows from the InfoPanel Data API to a zone, how a zone (and a custom panel) is rendered, how the config is stored and synced (with a table of where each setting comes from: app default, dashboard, profile, widget), how the theme, page background, grid spacing and general settings reach the page, and how the studio is put together (shell and layout, rail and drawers, top bar, inspectors, undo history, shortcuts, selection model, saved panels).
- [Studio design: zones and widgets](studio-redesign-zones-widgets.md) - the original design notes behind the zone-based studio (historical; predates the current layout).

## Development

- [Development](development.md) - scripts, running dev and the standalone server, tests, typecheck, adding a widget, and a verification checklist.
- `tools/ip-import.cjs` imports an InfoPanel profile as a dashboard layout (see the header of the file for usage).
- `tools/gen-bg.mjs` regenerates `public/assets/bg/aurora.png`, the page background of the Glass and Frosted appearance presets (`node tools/gen-bg.mjs`).
