# Primitives (`core/primitives.jsx`)

All primitives read the active skin through `useSkin()`, so they restyle with no extra props.

| Primitive | Signature | Notes |
|---|---|---|
| `Icon` | `{ name, className, fill }` | Material Symbols Rounded; swap for lucide here |
| `Num` | `{ children, className, style, weight=700 }` | Skin numerals: font, weight, stretch, glow |
| `Metric` | `{ label, value, unit, d, scale: sm..2xl, sub, t, align }` | Labelled big number; `numUp` skins go one size larger |
| `Bar` | `{ value, max=100, t, className, track, style: meter override }` | Meter styles: bar · pill · segments · blocks · hair · wave · square |
| `BarRow` | `{ label, value, max, display, hint, t, warn, crit }` | Label + value + Bar |
| `Ring` | `{ value, max, thickness, t, children, className }` | Thickness × `skin.ring`; butt caps for hud/tui |
| `Spark` | `{ values, min, max, className, fill, color, width, graph }` | area · line · step · bars · dots · braille; glows for synth/nixie |
| `Dot` | `{ ok }` | Live dot, green with glow |
| `Chip` | `{ children }` | Small rounded label, nowrap |
| `Pill` | `{ state: ok\|warn\|crit\|off, children }` | Status pill; hollow dot when off |
| `Segmented` | `{ value, options: [[v, label]], onChange }` | Tabs / mode switch |
| `Stat` | `{ label, value }` | Small label over value |
| `Empty` | `{ icon, label }` | No-data state |
| `Img` | `{ src, icon, className }` | Image with icon fallback (localhost and CDN failures) |
| `Logo` | `{ src, name, size }` | Logo image, or the typeset title as a fallback |
| `KenBurns` | `{ src, on, className }` | Slow pan/zoom background (WAAPI) |
| `weatherIcon` | `(text) → icon` | Yr and OpenWeatherMap conditions to Material Symbols names |
| `stepBands` | `(st, { l, r, lv, sens }, t, B)` | Visualiser band engine (no FFT) |
| `MiniViz` | `{ l, r, level, mode: bars\|mirror\|wave\|dots\|line, ramp, playing, bands, sens }` | Inline canvas visualiser that can replace a progress bar |

## Views (`core/views.jsx`)
- **`CompactView`** renders the `compact` descriptor in tiles, strips and columns. It supports `kind: spark | bar | ring | text | value`, plus `img` (cover/hero) and `viz(heightClass)` (a visualiser instead of the bar).
- **`StudioView`** renders `variant="studio"`. See VARIANTS.md.
- **`SkinHeader`** draws one header per skin: default · tui · macos · ios · android · fluent · hud · ink · synth · brutal · cyber · nixie · instrument · retro.

## Theme helpers (`core/theme.js`)
- `mix(p, to)` is accent colour-mix; `hue(deg)` is an accent-derived hue.
- `tone()`, `TONES`, `STATE`, `heat()`, `RAMPS`, `rampColor()`, `accentOf(el)` (resolves `--accent` for canvas).
- `SKINS`, `SURFACES`, `SkinCtx` / `useSkin`, `numFont(sk)`.
