# Network Adapters  `NetworkAdapters`

Public IP plus each adapter’s status, link speed, IPv4 and IPv6.

| | |
|---|---|
| File | `widgets/NetworkAdapters.jsx` |
| Category | Network |
| Default / min span | 2×2 / 1×1 |
| Icon | `lan` (Material Symbols Rounded) |
| Rendering | DOM + SVG |
| Compact views | yes — `compact` descriptor (tile / strip / column) |
| Studio variant | custom `studio` descriptor |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
showDown (default false), showIpv6 (default: lg only), hideIp (privacy blur)
```

## Data
Owns prefixes: `plugins.network-info-plugin.`

Keys read (literal parts; `${…}` segments are resolved at runtime by detection or props):
- `plugins.network-info-plugin.*`
- `plugins.network-info-plugin.public-ip.ipv4`
- `plugins.network-info-plugin.public-ip.ipv6`

## Layout by size
- Tiers handled explicitly: `xs` · `lg`
- Shapes handled explicitly: via CompactView
- Inner content size (after padding + header) is passed to the layout as `{ w, h }`; tier/shape come from the outer size. See [../ARCHITECTURE.md](../ARCHITECTURE.md#sizing).

## Core building blocks used
`Widget` · `shell` · `get` · `num` · `fmt` · `has` · `Dot` · `Chip` · `Icon`

## Demo configurations on the overview page
- **4×2**: `{"showDown":true}`
