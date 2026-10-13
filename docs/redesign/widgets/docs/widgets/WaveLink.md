# Wave Link  `WaveLink`

Elgato Wave Link inputs with mute and gain, and live L/R meters for each channel.

| | |
|---|---|
| File | `widgets/WaveLink.jsx` |
| Category | Audio |
| Default / min span | 2×2 / 1×1 |
| Icon | `mic` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
—
```

## Data
Owns prefixes: `plugins.wavelink-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.wavelink-plugin.*`
- `plugins.wavelink-plugin.wavelink.*`

## Layout by size
- Tiers handled explicitly: `sm`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `fmt` · `Icon` · `Dot` · `Chip` · `Empty`

