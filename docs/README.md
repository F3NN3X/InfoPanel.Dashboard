# Documentation

The project overview, install steps and server endpoints are in the
[top-level README](../README.md). The documents here go deeper.

## Using the dashboard

- [Customization guide](customization-guide.md) - the studio layout (top bar, left rail and drawers, canvas, inspector), undo, keyboard shortcuts and the command palette, and making a widget look the way you want: scaling, alignment, colors, borders, custom CSS, profile style, presets, hiding idle widgets.

## Widgets

- [Widget catalog](module-catalog.md) - every widget, its picker name, size, data keys and options.
- [Widget settings](widget-settings.md) - the setting schema, the standard block every modern widget shares, view presets, profile style and the audio views.
- [System widget](system-widget.md) - full reference for the System (modern) widget: settings, layouts, thresholds, drives and known limits.

## Internals

- [Architecture](architecture.md) - how data flows from the InfoPanel Data API to a zone, how a zone is rendered, how the config is stored and synced, and how the studio is put together (shell, rail and drawers, top bar, inspectors, undo history, shortcuts).
- [Studio design: zones and widgets](studio-redesign-zones-widgets.md) - the original design notes behind the zone-based studio (historical; predates the current layout).

## Development

- [Development](development.md) - scripts, running dev and the standalone server, tests, typecheck, adding a widget, and a verification checklist.
- `tools/ip-import.cjs` imports an InfoPanel profile as a dashboard layout (see the header of the file for usage).
