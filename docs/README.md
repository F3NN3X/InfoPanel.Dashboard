# Documentation

The project overview, install steps and server endpoints are in the
[top-level README](../README.md). The documents here go deeper.

## Using the dashboard

- [Customization guide](customization-guide.md) - the studio layout (top bar, icon rail and left panel, canvas with a floating zoom bar, inspector Side 340 / Bottom 320 / Auto, sticky fit zoom), selecting zones, context menus, undo, keyboard shortcuts and the command palette, the tabbed inspector (sections, source dots, Advanced, search), the Data Explorer and binding, panels (layout starters, saved panels, stack / grid / overlay layouts, alignment, the widget editor, canvas selection, the Code view and panel CSS hooks), and making a widget look the way you want: scaling, alignment, colors, borders, custom CSS, presets, hiding idle widgets; and the dashboard-wide settings (the Dashboard inspector): appearance presets, the global style, theme colours (per profile too), the page background (image or video, uploads), the font catalog, general settings (font, clock and locale, motion, kiosk cursor) and the grid gap and padding.

## Widgets

- [Widget catalog](module-catalog.md) - every widget, its picker name, size, data keys and options.
- [Widget settings](widget-settings.md) - the setting schema, the standard block every modern widget shares, view presets, profile style, the panel settings and the audio views.
- [System widget](system-widget.md) - full reference for the System (modern) widget: settings, layouts, thresholds, drives and known limits.

## Internals

- [Architecture](architecture.md) - how data flows from the InfoPanel Data API to a zone, how a zone (and a custom panel) is rendered, how the config is stored and synced (with a table of where each setting comes from: app default, dashboard, profile, widget), how the theme, page background, grid spacing and general settings reach the page, and how the studio is put together (shell and layout, chrome tokens and fonts, canvas, rail and left panels, top bar, the registry-driven inspector and how to add a setting, the Data Explorer and binding, undo history and drag transactions, shortcuts, selection model, saved panels).
- [Studio redesign](redesign/README.md) - the spec the studio was rebuilt from (layout, inspector, Data Explorer, tokens), with [decisions](redesign/DECISIONS.md) and the [feature map](redesign/FEATURE_MAP.md).
- [Studio design: zones and widgets](studio-redesign-zones-widgets.md) - the grid model that still holds (zones, no overlap, fluid fill, config v2); the rest is superseded by the redesign.

## Development

- [Development](development.md) - scripts, running dev and the standalone server, tests, typecheck, adding a widget, and a verification checklist.
- `tools/ip-import.cjs` imports an InfoPanel profile as a dashboard layout (see the header of the file for usage).
- `tools/gen-bg.mjs` regenerates `public/assets/bg/aurora.png`, the page background of the Glass and Frosted appearance presets (`node tools/gen-bg.mjs`).
