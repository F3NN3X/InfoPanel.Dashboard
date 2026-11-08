# Network Traffic  `NetworkThroughput`

Live download and upload rate with history, totals and utilisation for any adapter.

| | |
|---|---|
| File | `widgets/NetworkThroughput.jsx` |
| Category | Network |
| Default / min span | 3×1 / 1×1 |
| Icon | `swap_vert` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | falls back to `compact` |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
adapter (slug, e.g. "ethernet", "wifi", "tailscale"); default = busiest adapter
```

## Data
Owns prefixes: `libre.ethernet`, `libre.wifi`, `libre.tailscale`, `libre.bluetooth_network`, `libre.vethernet`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `libre.ethernet`
- `libre.wifi`
- `libre.tailscale`
- `libre.bluetooth_network`
- `libre.vethernet`
- `libre.*`

## Layout by size
- Tiers handled explicitly: `xs` · `sm` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Dynamic Island
Setting `island` (**Send to island**, off by default, in the Content group). With it on, a kiosk's Dynamic Island shows the download rate of the widget's adapter beside the time while it is faster than `islandMinRate` (*Show above*, 5 MB/s). The rules are in `src/widgets/island/hardware.ts` (`networkThroughputIsland`); see [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `fmtGB` · `fmtRate` · `detect` · `pretty` · `Spark` · `Stat` · `Icon` · `useHistory` · `Empty`

## Demo configurations on the overview page
- **2×2**: `{"adapter":"tailscale"}`
