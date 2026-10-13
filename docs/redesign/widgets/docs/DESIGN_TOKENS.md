# Design tokens

## Colour
### Page / chrome (the overview page and Studio app)
| Token | Value | Use |
|---|---|---|
| bg/app | `#0c0c0e` | page, canvas |
| bg/chrome | `#0f0f12` | header panels |
| bg/panel | `#111114` | sidebars, chips |
| bg/raised | `#17171b` | buttons, selects |
| line | `#1f1f24` · `#24242a` · `#2a2a31` | dividers, borders, inputs |
| text | `#ededf0` / `#c9c9cf` / `#a1a1aa` / `#8a8a94` / `#6f6f79` | primary → faint |

### Widget text (Tailwind zinc)
`text-zinc-100` value · `text-zinc-200/300` body · `text-zinc-400` labels · `text-zinc-500` sub / hints. In Studio: labels `#8a8a94`, subs `#9696a0`, tracks `#2a2a31` / `#1c1c21`.

### Accent
- `--accent` is set on every widget root. The default is `#34d399`. Swatches on the overview page: `#34d399 #60a5fa #7D95FF #a78bfa #f472b6 #fbbf24 #f87171`.
- Mixes use `color-mix(in oklab, var(--accent) N%, X)` (the `mix(p, to)` helper).
- Series derived from the accent use `hue(deg)`, which is `oklch(from var(--accent) l c calc(h + deg))`:
  - SystemOverview sections: cpu 0°, gpu +55°, ram −45°, vram −80°, net +120° (under non-default skins).
  - GpuRings inner ring: +70°. PlaytimeShare: 0, 70, 140, 210 and 280°.
  - Under the default skin, SystemOverview uses fixed colours: cpu `#38bdf8`, gpu `#a78bfa`, ram `#fbbf24`, vram `#facc15`, net `#34d399`.

### State
| | `TONES` (tone → colour) | `STATE` (semantic, never re-hued) |
|---|---|---|
| ok | `var(--accent)` | `#3CC97F` |
| warn | `#fbbf24` | `#EDB232` |
| crit | `#f87171` | `#F2665E` |
| muted / none | `#71717a` | `rgba(255,255,255,0.07)` |

`tone(v, warn, crit)` returns `'ok' | 'warn' | 'crit'`. Drives use neutral `muted` below 80%. Status dots use green `#4ade80` with a 6px glow.

### Ramps (`RAMPS`, `rampColor(t, name, accentHex)`, `heat(v%, name)`)
| Ramp | Stops |
|---|---|
| accent | `#18181c` → accent |
| thermal | `#1e3a8a #0ea5e9 #22c55e #facc15 #f97316 #ef4444` |
| viridis | `#440154 #3b528b #21918c #5ec962 #fde725` |
| magma | `#000004 #3b0f70 #8c2981 #de4968 #fe9f6d #fcfdbf` |
| ice | `#0b1020 #1e3a5f #2f7fb5 #7dd3fc #f0f9ff` |
| synth | `#12062a #6b1ea8 #ff4fd8 #ff9e5e #ffe66d` |
| mono | `#18181b #52525b #a1a1aa #fafafa` |

Instrument palette (`INSTR`): card `#161A20`, muted `#20252D`, muted-fg `#8D96A4`, border `#29303A`, primary `#7D95FF`, chart-2 `#3FC4D0`, ok `#3CC97F`, warn `#EDB232`, crit `#F2665E`.

## Typography
| Role | Default skin | Notes |
|---|---|---|
| UI | Geist 400/500/600 | headers 11px uppercase, tracking 0.08em, zinc-400 |
| Mono | Geist Mono | keys, times, dB; Studio labels 9.5px, tracking 0.06em |
| Numerals | inherit (600, `tracking-tight`, `tabular-nums`) | scales `sm 18 · md 24 · lg 36 · xl 48 · 2xl 72` px (Metric) |
| Studio value | 26 / 34 / 44px by height | 600, −0.02em, line-height 1.05 |
| Per-skin fonts | see SKINS.md | JetBrains Mono, VT323, Instrument Serif, Roboto Flex, Orbitron, Space Grotesk, Chakra Petch, Nixie One, IBM Plex Sans/Mono, Archivo |

Always use `tabular-nums` for live values. Fit big numbers to width with a computed `fontSize`; don't let them wrap.

## Shape and spacing
- **Radius:** shell default 16px. Skins override it: tui 6 · macos 22 · fluent 8 · hud 2 · ink 14 · retro 6 · ios 24 · android 28 · synth 14 · brutal 0 · cyber 0 · nixie 12 · instrument 10. Inner tiles use 8–12px; bars are fully rounded.
- **Padding by tier:** xs `p-2.5` · sm `p-3` · md `p-4` · lg `p-5`. Compact views use `p-3` (`p-2.5` under 132px, strips under 130px tall `px-4 py-2.5`). Studio uses `px-3 py-2.5` (single row `px-3`).
- **Gaps:** 2px between segments, 3–4px heatmap cells, 8–12px between stats, 14–18px between columns.
- **Meter heights:** hair 1px · Studio 3px · bar 6px (`h-1.5`) · pill 6px minimum · segments/blocks follow the container.
- **Ring stroke:** 8–10 in a 100-unit viewBox, multiplied by the skin's `ring` factor (0.35–1.7).

## Motion
- Meters 300–700ms `ease-out`. Rings: `stroke-dashoffset .6–.7s`. VU needle: `transform .45s cubic-bezier(.34,1.7,.5,1)` (overshoot).
- Visualisers run at 60fps on canvas, with fast attack (0.45) and slow release (0.12) per band. Peak caps fall at 0.006 per frame.
- Ken Burns: scale 1.06 → 1.18 with a −2.5% / −1.5% translate, 22s alternate.
- Graph history EMA (`ease` = 0.45 by default).
