# Clock  `Clock`

Digital or analog clock with date, 12/24 h and seconds.

| | |
|---|---|
| File | `widgets/Clock.jsx` |
| Category | Info |
| Default / min span | 2×1 / 1×1 |
| Icon | `schedule` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | own layout in every shape |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
format '24h' | '12h', showSeconds, showDate, face 'digital' | 'analog'
```

## Data
Owns prefixes: `plugins.clock-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.clock-plugin.*`
- `plugins.clock-plugin.clock.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: —
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num`

## Demo configurations on the overview page
- **2×2**: `{"face":"analog"}`
- **4×2**: `{"face":"analog"}`
