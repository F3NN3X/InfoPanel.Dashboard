# Weather  `Weather`

Conditions, feels-like, wind, humidity, pressure, rain or snow, and a 7-day forecast.

| | |
|---|---|
| File | `widgets/Weather.jsx` |
| Category | Info |
| Default / min span | 3×2 / 1×1 |
| Icon | `partly_cloudy_day` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
provider 'yr' | 'owm' (default: yr if available), location (yr container slug), units 'C' | 'F'
```

## Data
Owns prefixes: `plugins.yr-weather-plugin.`, `plugins.weather-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.yr-weather-plugin.*`
- `plugins.weather-plugin.*`
- `plugins.weather-plugin.weather`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Dynamic Island
Setting `island` (**Send to island**, off by default, in the Current conditions group). With it on, a kiosk's Dynamic Island opens with "Rain starting" or "Snow starting" when the Yr location's next-hour amount turns above 0; every hour at most. The rules are in `src/widgets/island/info.ts` (`weatherIsland`); see [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `rows` · `Icon` · `Stat` · `weatherIcon`

