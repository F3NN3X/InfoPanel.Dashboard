# Forecast  `Forecast`

Daily forecast with hi/lo range bars. Runs across in wide zones and down in tall ones.

| | |
|---|---|
| File | `widgets/Forecast.jsx` |
| Category | Info |
| Default / min span | 4×1 / 1×1 |
| Icon | `calendar_month` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
location (yr slug), days (default: as many as fit), units 'C' | 'F'
```

## Data
Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.yr-weather-plugin.*`

## Layout by size
- Tiers handled explicitly: continuous (measures w/h)
- Shapes handled explicitly: `tile`
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `rows` · `Icon` · `weatherIcon`

