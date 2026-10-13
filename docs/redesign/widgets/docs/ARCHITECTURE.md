# Architecture

```
widgets/
  kit.jsx                ← barrel: `import { … } from './kit'` (re-exports core/*)
  core/
    data.js              ← get/num/fmt…, rows, detect, hw(), useInfoPanel (SSE)
    layout.js            ← tierOf, shapeOf, useBox, pickBy, useHistory
    tokens.js            ← mix(), hue() (accent colour-mix / hue rotation)
    surfaces.js          ← BASE_SURFACES (13 generic card materials)
    skins/<name>.js × 14 ← one skin pack each: { name, description, fonts, skin tokens, native surfaces }
    theme.js             ← assembles SKIN_PACKS → SKINS + SURFACES; RAMPS, TONES, STATE, INSTR, SkinCtx/useSkin, numFont, heat, tone
    primitives.jsx       ← Icon, Num, Metric, Bar, BarRow, Ring, Spark (+Braille), Dot, Chip, Pill, Segmented, Stat,
                           Empty, Img, Logo, KenBurns, weatherIcon, stepBands, MiniViz
    views.jsx            ← CompactView (tile/strip/column), StudioView (variant="studio"), SkinHeader
    Widget.jsx           ← <Widget> shell + shell(p) prop picker
  <WidgetName>.jsx × 44  ← one file per template: `export const meta`, `export default function`
  index.js               ← barrel + WIDGETS registry { id: { Component, meta } }
  _preview/              ← overview-page runtime only (Babel in-browser loader) — not shipped
  docs/                  ← this documentation
```

Dependency order is strictly `data → layout → tokens → surfaces → skins/* → theme → primitives → views → Widget → widgets`. No module imports from a later one.

## Rendering contract
Every template follows the same shape:

```jsx
export const meta = { id, name, category, icon, prefixes, defaultSize: [w, h], minSize: [w, h], description };

export default function Thing(p) {
  const d = p.data;                         // flat { key: value } map from the Data API
  const sk = useSkin();                     // only when drawing numerals/colours directly
  /* 1. read + parse values (get, num, rows, hw(d)) */
  /* 2. hooks: useHistory(…) for anything graphed — always unconditional */
  return (
    <Widget {...shell(p)} title=… icon=… right=…
      compact={{ label, value, unit, sub, pct, hist, img, viz, kind }}        // 1×1 / strips / columns
      studio={{ label, value, rows, meters, cells, img, progress, viz }}>     // variant="studio"
      {({ w, h, size, shape }) => /* full layout, branch on size/shape */}
    </Widget>
  );
}
```

## Shell props
Accepted by every widget and passed through `shell(p)`:

| Prop | Values | Notes |
|---|---|---|
| `data` | `{ [key]: string \| {value} }` | From `useInfoPanel()` or the app store |
| `accent` | any CSS colour | Exposed as `--accent`; skins may force their own |
| `surface` | `auto` + 24 names | See SURFACES.md |
| `radius` | px | Skins with a radius win unless you pass one explicitly |
| `skin` | 14 names | See SKINS.md |
| `graph` | `auto · area · line · step · bars · dots · braille` | Overrides the skin's |
| `meter` | `auto · bar · pill · segments · blocks · hair · wave · square` | Overrides the skin's |
| `variant` | `default · studio` | See VARIANTS.md |
| `size` | `auto · xs · sm · md · lg` | Forces a tier |
| `compactView` | `auto · off` | `off` = never use CompactView |
| `title`, `showHeader`, `className`, `style` | | `style` must be an object |

## Sizing
- `useBox` measures the **outer** border-box with ResizeObserver, so changes to padding never feed back into the tier.
  - Tier: `xs` is under 220×140; `sm` under 340×210; `md` under 500×320; `lg` is anything larger.
  - Shape: `tile` (under 240×240) · `strip` (ratio ≥ 2.6, h < 240) · `column` (ratio ≤ 0.62, w < 260) · `box`.
- The layout callback receives the **inner** content size (`w`, `h`, after padding and header) plus `outerW` / `outerH`. Row counts and font fitting use the inner size.
- Fit text to width rather than letting it overflow. Use `whitespace-nowrap` plus a computed `fontSize`: CompactView `Val` and StudioView `Big` both use `avail / (chars × 0.6)`.

## Data flow
- `useInfoPanel({ url, prefix, interval })` opens `GET /events?prefix=&interval=` (SSE). It merges each change into one flat map; normalisation accepts arrays, `{ sensors }` and `{ key: { value } }` payloads.
- Device ids are never hard-coded:
  - `hw(d)` returns `{ cpu, gpu, disks, adapters }`.
  - Audio and volume devices are matched by GUID.
  - Network adapters come from the `{GUID}.name` keys.
- Histories come from `useHistory(value, len, ease)`. It stores eased (EMA) values so graphs glide; pass `ease = 1` for raw values (frame time).

## Performance rules (the app should keep these)
- Animated canvases (`Visualizer`, `MiniViz`) run one `requestAnimationFrame` loop each, pause when off-screen (IntersectionObserver) or when the tab is hidden, and refresh the accent colour every 600 ms rather than every frame.
- Visualisers are fed through a ref, so data ticks don't re-mount the canvas. Never define a component that wraps a canvas inside render.
- CSS transitions animate meters (300–700 ms): bars use width/height, rings use stroke-dashoffset, needles use transform.
- On the overview page, `WidgetPreview` mounts only the widgets near the viewport. In the app, zones are already bounded, so this isn't needed there.

## Integrating in the app (Vite + Tailwind)
1. Copy `widgets/` (without `_preview/`) to `src/widgets/`.
2. Tailwind:
   - v3: add `./src/widgets/**/*.{js,jsx}` to `content`.
   - v4: no change needed.
   - Arbitrary values such as `bg-white/[0.06]` and `text-[color:var(--accent)]` are used throughout, so leave JIT on.
3. Load these fonts once: Geist, Geist Mono, JetBrains Mono, IBM Plex Sans, IBM Plex Mono, Archivo, VT323, Instrument Serif, Roboto Flex, Orbitron, Space Grotesk, Chakra Petch, Nixie One, plus Material Symbols Rounded. Load lazily per skin if needed.
4. Zone renderer: `const { Component } = WIDGETS[zone.type]; <Component data={data} {...zone.effectiveStyle} {...zone.props} />`. Map the studio's Follow/Custom style to `accent / surface / radius / skin / variant`.
5. Icons: swap the body of `Icon` in `core/primitives.jsx` if the app uses lucide-react.
