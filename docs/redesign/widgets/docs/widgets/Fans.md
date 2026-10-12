# Fans  `Fans`

GPU fans with duty % plus the CPU fan. Each icon spins in proportion to its RPM.

| | |
|---|---|
| File | `widgets/Fans.jsx` |
| Category | Hardware |
| Default / min span | 2×1 / 1×1 |
| Icon | `mode_fan` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
maxRpm (default 3000), spin (default true)
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.*`
- `libre.embedded_controller_cpu_optional_fan`

## Layout by size
- Tiers handled explicitly: `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `detect` · `Icon` · `Bar` · `hw`

