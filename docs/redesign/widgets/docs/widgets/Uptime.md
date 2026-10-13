# Uptime  `Uptime`

Time since boot, split into days, hours, minutes and seconds.

| | |
|---|---|
| File | `widgets/Uptime.jsx` |
| Category | System |
| Default / min span | 2×1 / 1×1 |
| Icon | `timer` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
showSeconds (default true)
```

## Data
Owns prefixes: `plugins.system-info-plugin.uptime.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.system-info-plugin.uptime.*`

## Layout by size
- Tiers handled explicitly: `xs` · `md` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num`

