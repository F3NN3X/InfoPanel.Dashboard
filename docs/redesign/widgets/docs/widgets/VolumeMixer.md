# Volume Mixer  `VolumeMixer`

Volume and mute for each device, plus the default device and Wave Link status.

| | |
|---|---|
| File | `widgets/VolumeMixer.jsx` |
| Category | Audio |
| Default / min span | 2×2 / 1×1 |
| Icon | `tune` (Material Symbols Rounded) |
| Rendering | DOM + SVG · interactive |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
onSetVolume(containerKey, value 0-100), onToggleMute(containerKey) — optional; without them the faders are read-only
```

## Data
Owns prefixes: `plugins.volume-plugin.`, `plugins.wavelink-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.volume-plugin.*`
- `plugins.wavelink-plugin.*`
- `plugins.wavelink-plugin.wavelink.status`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `Ring` · `Icon` · `Dot` · `Chip`

