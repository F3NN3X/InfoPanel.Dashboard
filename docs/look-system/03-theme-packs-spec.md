# InfoPanel Studio — Theme Packs (advanced themes)

Exported 3 November 2026 from the Theme Packs doc. Decisions here may change through the protocol in `04-decision-log.md`.

## Status

Decided on 3 November 2026. Every open question is answered (see Decisions below), and the result is in `01-investigation-brief.md` as Appendix D, Part H, decisions D14–D27, the extra T3 tokens in Section 3.2, and phases P8–P12. Implementation follows `02-implementation-runbook.md`.

The proposal in one line: **a theme pack is a Look plus assets plus a fixed set of decoration slots.** The app keeps control of layout, sizing, readability and export. The pack controls how things are painted.

## The problem

A Look in the brief changes colours, materials and data-viz tokens. That is enough for most themes, but not for a theme with its own art direction: an extraction-game UI, a retro 80s VHS cover, a neon-stripe desktop. Those need things tokens can't express:

- **Graphics:** stripe bands, arcs, a paper texture, film grain, a starfield, map art.
- **A page background** that is a composed scene, not one colour.
- **Card structure that differs:** bracket corners, label tabs, notched or distressed edges, a cream info panel inside a dark frame.
- **Data drawn differently:** segmented gauges, gradient numbers, LED bars, a chunky display font for the clock.
- **Effects:** glow, scanlines, grain, vignette.

The risk is the opposite: if a pack can do anything, it can break layout, readability, privacy blur, export and performance. The design has to give creative room without giving away those guarantees.

## What the inspiration shows

Most of the reference set needs no custom code. Only the art-directed themes need assets and slots, and none of them needs to change layout.

| Reference | What makes it distinct | Level needed |
| --- | --- | --- |
| Hyprtile: liquid glass, rose, emerald, camel and navy | Glass material over a tinted, blurred ambient background | 1 (Look) + page background |
| Hyprtile: classy black | Solid black, thin light numbers, hairline borders | 1 |
| Hyprtile: RGB glow, Tokyo night | Gradient card border with glow, segmented bars | 1 + gradient border, glow |
| Hyprtile: black and gold | Gold gradient on gauge arcs, warm glow | 1 + gradient fill on rings |
| Hyprtile: vice city | Gradient hero number, starfield background, pink glow borders | 1 + gradient number, page layer |
| Hyprtile: latte paper | Light mode, hexagon pattern background, accent outline | 1 (light mode) + pattern background |
| Neon stripe desktop (Rainmeter) | Big neon stripes on the page, red bracket headers, mono type, yellow numbers, green sparklines | 2 (page layer art, bracket frame) |
| Retro VHS and 80s covers | Cream paper, rainbow stripe bands, chunky display type, grain and worn edges, dot-matrix details | 2 (art, texture overlay, edge mask, display font) |
| Extraction-game UI (Arc Raiders reference) | Dark scene behind everything, cream info panels with a dark top tab, yellow primary button, condensed caps labels, rarity colour per tile, label pills on a map | 2 (frame and header variants, page background art) |

The Hyprtile caption makes the key point: ten distinct looks, each one settings only. Getting the first level right covers most users. The second level is for themes with real art direction.

## Three levels

Each level adds creative room and gives up a little control. Build them in order, and only open the next level when real packs prove the need.

| Level | What it is | Can change | Cannot change | Who makes it |
| --- | --- | --- | --- | --- |
| 1. Look | Tokens only (T1 colours, T2 materials, T3 data-viz), per the brief | Colours, materials, fonts, glow, data variants, gradient numbers, frames `plain`, `hairline` and `gradient-border`, page background colour, gradient or a built-in pattern | Art, other frames, icons, anything structural | Anyone, in the editor |
| 2. Theme pack | A Look plus assets plus slot choices | Everything in level 1, plus page art, overlays, all frames, edges, ornaments, header styles, icon set, status-bar style and default position, optional page templates | Layout, sizes, row fitting, what is visible, privacy blur | Built-in packs first |
| 3. Pack CSS | One stylesheet, scoped to the pack, targeting documented `data-part` hooks | Any paint property on a part: background, colour, border, shadow, filter, mask, font | Width, height, position, display, grid, anything that moves layout | Only if built-in packs show a need |

The rule that holds all three together: **the app owns where things go; the pack owns what they look like.** Packs contain no JavaScript at any level.

Decided order: plan the `data-part` hooks now, then build every sample in two waves (Field Kit, Tape '86 and Term first; then the rest). Pack CSS ships only if those packs show a need. The pack validator comes last.

## Pack format

A pack is a folder of data and assets, built on the Look file from the brief. Nothing in it runs.

```
looks/field-kit/
  look.json      tokens: T1 colours, T2 materials, T3 data-viz (per the brief)
  pack.json      slots, assets, fonts, icons, effects, knobs, variants, fallbacks, export, templates
  pack.css       optional, level 3 only: scoped, paint-only; a user pack's is held to the grammar of `src/looks/user-css.ts`, the render check at import and the server's signature (L94)
  assets/        page.avif, contours.svg, hazard.svg, grain.webp
  fonts/         display.woff2 (subset)
  icons/         icon set: SVG sprite, or a glyph map for text-based sets
  templates/     optional page templates (opt-in)
  thumb.avif     gallery thumbnail, rendered from the real app
  LOOK.md        the fixed-section design notes (as in the brief's Appendix A)
```

`pack.json` fields:

| Field | Purpose |
| --- | --- |
| `id`, `name`, `version`, `tags`, `description` | Gallery card and search |
| `modes` | `["dark"]` or `["dark", "light"]`, plus a written mode stance |
| `slots` | One entry per slot the pack fills (catalogue below); unset slots use the Look defaults |
| `assets` | Every file the pack uses, with type and size; anything not listed is refused |
| `fonts` | Display, body and mono families, each pointing at a subset woff2 |
| `icons` | Icon set style and source; missing names fall back to the Classic set |
| `effects` | Grain, scanlines, glow, animation; each with a cost class |
| `knobs` | Which user knobs stay open (accent, material, density, corners, mode) and their allowed ranges, with a reason for each lock |
| `variants` | Named variations, for example Night and Dusk, as small overrides |
| `fallbacks` | What each effect becomes in lite mode, with Limit blur on, and on a solid page background |
| `export` | Flat colours, optional pre-rendered background image, and the "not exported" list |
| `burnIn` | `static-safe`, `needs-shift` or `needs-dim` (see Guardrails) |
| `statusBar` | Style (island and Status bar widget) and the island's default edge; the user can change the edge |
| `templates` | Optional page templates the user can apply |
| `minSizeClass` | Per decoration: hide page layers, ornaments and overlays below this size class |

Knobs keep the pack usable: a VHS pack might let the user pick the accent from its own five stripe colours, but lock the material to cream paper. A pack never takes away density or corners unless it says why.

## Slot catalogue

A slot is a named place a pack can paint into. Each slot accepts either a variant from a fixed set, implemented once in the shell or primitives, or a listed asset. Ten slots, drawn bottom to top:

1. **Page background**: colour, gradient, image or SVG, with fit and position. Exported as the screen background.
2. **Page layers**: up to three decorative SVGs or images pinned to an edge or corner (stripes, arcs, contours, range rings). Behind the cards. May animate, transform and opacity only.
3. **Card material**: the T2 material from the brief (solid, gradient, glass, lcd, paper, transparent).
4. **Card frame**: `none`, `plain`, `hairline`, `bracket`, `corner-brackets`, `notched`, `chamfer`, `tab-label`, `double`, `stamped`, `gradient-border`, `box-legend`.
5. **Card edge**: a mask: `none`, `chamfer`, `distressed`.
6. **Card ornament**: one SVG at a corner, as a top band or a side strip; a rarity-style corner tint can follow status.
7. **Header**: `inline`, `underline`, `label-bar`, `tab`, `bracket-line`, `index` (01 —), `legend` (title set into the border).
8. **Data variants**: ring `arc` (full or 270°), `segmented` or `ticks`; bar and meter `solid`, `segmented`, `led` or `blocks`; meter zones `hard` or `blend`; peak hold `line`, `dot` or `block`; threshold line `dashed`, `solid` or `dotted`; spike marker `dot`, `tick` or `bar`; range bars; fader knob `pill`, `bar`, `square` or `notch`; number fill `solid` or `gradient`; number effect `none`, `glow` or `chromatic`; hero and display font.
9. **Content**: the widget body. Packs never touch it except through the tokens above.
10. **Page overlay**: grain, scanlines or vignette, each with an opacity. On top of everything, never blocks input.

Four page-level slots sit outside the stack:

- **Status bar**: style `pill`, `bar`, `plain` or `line` (the island takes it too), and the island's default edge (top or bottom). The user can change the edge. The Status bar widget has no position of its own; it stays with the page or template.
- **Connectors**: `none`, `line` or `elbow`, with an end-dot option. The app draws them between widgets; the pack only styles them.
- **Page templates**: optional layouts a pack can offer (radial cluster, hero band, dense panes). The user opts in; applying a pack never moves widgets.
- **Icon set**: `outline`, `filled`, `chunky`, `pixel` or `ascii` glyphs, one per pack, against a fixed icon name list of about 84 names (weather, transport, audio, status, devices), delivered as a JSON glyph map. Missing icons fall back to the Classic set per name.

The values behind thresholds, meter zones and budget lines (a frame-time budget, a dB breakpoint) come from widget settings and data. The pack only decides how they look.

Rules for every slot:

- Decorations are absolutely positioned, `pointer-events: none`, `aria-hidden`, and never change layout or row fitting.
- A card ornament is at most 10 px and stays inside the card's padding, or the card is marked `data-qa-bleed` on purpose. Decorations reach the card edge only through `--wp-pad`; packs use no `!important` fills.
- The island, status bar and alerts take the pack's material, frame and header, so chrome matches the widgets.
- Each frame, edge and header variant is built once in the shell and covered by the overflow probe at 1x1, 2x2, 4x2 and 4x4.

Level 3 hooks: the shell and primitives expose `data-part` on `card`, `header`, `label`, `num`, `unit`, `ring`, `bar`, `meter`, `spark`, `threshold`, `range`, `fader`, `icon`, `chip`, `button`, `status` and `alert`. Adding these is cheap now and expensive later, so the plan includes them even if level 3 never ships.

## Guardrails

Every guarantee the widget pipeline gives today must still hold with any pack applied.

| Area | Rule | How it is checked |
| --- | --- | --- |
| Performance | Every effect has a cost class (static, composited, filter, animated). Lite mode and Limit blur downgrade by the pack's `fallbacks`: animation stops, grain and scanlines go off, glow and blur are capped | Part C blur-and-glow walk run per pack; per-pack layer budget |
| Burn-in | Bright static art on an always-on OLED panel burns in. Packs declare `burnIn`; `needs-shift` gets a slow 1–2 px drift of page layers, `needs-dim` dims layers when idle | Pack lint: high-luminance static layers must not be `static-safe` |
| Readability | The brief's contrast test runs over every pack, variant and material: text, muted, ok, warn, crit, axis labels | Part G contrast test, extended to packs |
| Layout | Slots never change size, rows or visibility. Overflow, roomy and privacy behave as without a pack | Overflow probe and parity run with each built-in pack |
| Export | Background image and flat material colours export; frames, ornaments, overlays, masks and glow are listed as not exported | Export capability table per pack |
| Size | Packs load lazily, outside the main bundle. Budget per pack: measured + 25 %, ceiling 500 KB including subset fonts, only down afterwards; never counted against the kiosk entry | New `budgets.json` key per built-in pack |
| Security | No JavaScript. No remote URLs: the pack loader and the validator refuse non-relative URLs and `@import` (the CSP does not enforce this). Pack CSS is scoped to `[data-look=id]` in `@layer look` and linted to paint properties only | Pack validator at import and in `npm run verify` |
| IP | Packs may be inspired by a game or era: palette, type style, shapes. They never ship a game's logo, key art, characters, screenshots or licensed fonts | Review for built-in packs; a stated policy before user packs can be shared |
| Small screens | Every decoration declares a `minSizeClass` and hides below it | Display compatibility work (`05-display-compat-brief-LATER.md`) |

The IP rule matters most for the extraction-game pack. Its colours, condensed type, cream panels and stripe motifs are fine. The game's name, logo and art are not, and neither is a pack named after it if packs are ever shared publicly, for example on Themely.

## Worked examples

Seven example packs and two Looks, each filling the slots differently. Names are working titles; none uses a game or brand name. Icon sets: Field Kit filled (stencil), Tape '86 chunky, Neon Stripe, Overdrive and Swiss Mono outline, Term ASCII, Holo glowing outline.

| Pack | Level | Page background and layers | Material, frame, header | Data variants | Effects | Burn-in |
| --- | --- | --- | --- | --- | --- | --- |
| Field Kit (extraction-game inspired) | 2 | Dark scene; contour-line art; hazard strip on the left edge | Cream paper cards; `tab-label` header in dark ink; rarity corner; yellow accent | Condensed caps labels, segmented rings and bars | Vignette | needs-shift |
| Tape '86 (retro VHS) | 2 | Warm cream paper; rainbow stripe bands | Paper, `stamped` frame, `top-band` ornament, `label-bar` header | Chunky display numbers, solid bars in stripe colours | Grain | needs-dim |
| Neon Stripe | 2 | Near-black; four neon stripes | Transparent dark material, `bracket-line` header in red | Mono type, yellow numbers, tick rings, green filled sparklines | Glow on stripes | needs-shift |
| Overdrive (cyberpunk inspired) | 2 | Black with red grid, skewed yellow block, barcode | `chamfer` frame in yellow, angled `label-bar` header | Cyan numbers with `chromatic` effect, segmented rings and bars | Chromatic offset | needs-shift |
| Swiss Mono (modern minimalist) | 2 | Charcoal; one big accent circle off the corner | `none` frame, `index` header with hairlines | Huge light-weight numbers, 2 px bars | None | static-safe |
| Term (retro TUI) | 2 | Black | `box-legend` frame, titles in the border | Pixel display numbers, `blocks` bars, per-core rows, process list | Scanlines, vignette, phosphor glow | needs-dim |
| Holo (futuristic HUD) | 2 | Deep blue glow, faint range rings | `corner-brackets` frame | Concentric glowing rings, thin bars, `elbow` connectors | Glow | needs-shift |
| Night Glow | 1 | Deep navy gradient | Glass, `gradient-border` in cyan-to-purple | Segmented ring, gradient hero number | Glow capped at 12 px | static-safe |
| Paper | 1 | Light; faint hex pattern | Matte light, hairline frame | Purple accent, gradient hero number | None | needs-dim |

All of these will be built, plus the Classic, Classy Black, Liquid Glass and Black and Gold Looks. Field Kit, Tape '86 and Term go first because together they cover the most slots.

## Mockups

Static copies of every board are in `mockups/` (open `mockups/index.html`). The live canvas is at https://claude.ai/artifact/T1imW2kxfdMud58HgXoBS8. The first nine boards show the same six widgets (clock, CPU, GPU, network, memory, storage): five on the default grid, so only paint changes, and four on other page layouts, showing that layout belongs to the page. The next six use page types with new widget kinds (FPS, frame time, weather, mixer, now playing, agenda) to test the new data-viz tokens and the icon set. The last six show the Field Kit gaming page on six screen sizes, for the later display compatibility work.

| Artboard | Level | Page layout | What it demonstrates |
| --- | --- | --- | --- |
| Field Kit | 2 | Default grid | Contour art and hazard strip layers, cream material, `tab-label` header, segmented rings and bars, rarity corner, a pack-styled alert |
| Tape '86 | 2 | Default grid | Paper material, `stamped` frame, `top-band` ornament, stripe layers, grain overlay, chunky display numbers |
| Neon Stripe | 2 | Default grid | Glowing stripe layers behind a semi-transparent material, `bracket-line` header, tick rings, mono type |
| Overdrive | 2 | Tall hero plus columns | `chamfer` frame, angled header bar, `chromatic` number effect, red grid background |
| Swiss Mono | 2 | Hero band plus metric strip | `none` frame, `index` headers, hairline bars, one accent circle layer |
| Term | 2 | Dense panes | `box-legend` frame, `blocks` bars, per-core rows, process list, scanlines, bottom status bar |
| Holo | 2 | Radial cluster | `corner-brackets` frame, concentric glowing rings, `elbow` connectors drawn by the app |
| Night Glow | 1 | Default grid | Settings only: glass, gradient border with glow, gradient hero number, gradient ring and spark |
| Paper | 1 | Default grid | Settings only: light mode, built-in hex pattern, warn colour adjusted for light |
| Field Kit · Gaming | 2 | Gaming page | FPS with lows, frame time with budget line and spike markers, thermals, ping, 5-channel mixer with horizontal faders and mute states |
| Tape '86 · Desk | 2 | Desk page | Weather now and hourly, cassette now playing with transport, vertical-fader mixer with stereo meters, agenda, chunky icons |
| Term · Gaming | 2 | Gaming page | Block-character FPS sparkline, frame-time histogram, ASCII weather, text-meter mixer |
| Night Glow · Stream | 1 | Stream page | 6-channel mixer with stereo meters, peak hold, mute and solo, live indicator, stream stats |
| Swiss Mono · Home | 2 | Home page | Weather hero with overnight line, 5-day min–max range bars, agenda, now playing |
| Holo · Cockpit | 2 | Cockpit page | FPS core with 270° arcs, frame time, weather, audio and systems panels with connectors |
| Slot anatomy | — | — | One card pulled apart into its ten slots, with what the app owns versus the pack |
| Look gallery | — | — | The user flow: a tagged gallery, then a few knobs; the pack locks material and limits accent to its palette |

Mockups are a visual target, not a spec. They load Google Fonts for convenience; production packs bundle subset woff2 (D23).

## Decisions

All answered on 3 November 2026. Decision numbers refer to `04-decision-log.md`.

| Question | Decision |
| --- | --- |
| Who can make packs | Built-in only first; user packs from a folder later. The validator is built last, once looks, slots and built-in packs all work (D17, P12) |
| Pack CSS (level 3) | Plan `data-part` hooks now; ship no pack CSS until built-in packs show a need (D16) |
| Animated backgrounds | Allowed, transform and opacity only, off in lite mode (D18) |
| Sharing on Themely | Yes, the pack format is meant for Themely; sharing waits for the validator and the IP policy (D17) |
| Per-widget opt-out | Packs apply per screen; a widget can opt out of decorations only (D19) |
| Page templates | Packs may ship optional templates; the user opts in; packs never move widgets (D20) |
| Connector lines | Drawn by the app from a pack connector-style slot (D20) |
| New variants | All of them go into the catalogue (D22) |
| Status bar | Pack sets the style and the island's default edge; the user can change the edge; the widget's position stays with the page (D21) |
| Sample line-up | Build all samples: 7 packs and 6 Looks, in two waves (P10, P11) |
| Naming and IP | Original names only, no game titles, logos, art or licensed fonts (D23) |
| Fonts | Subset woff2 inside the pack, no runtime Google Fonts (D23) |
| Burn-in | Global pixel-shift and idle-dim setting; packs declare risk (D24) |
| Export of art-heavy packs | Optional pre-rendered background image allowed (D8) |
| Icons | An icon set slot, one set per pack, fixed name list, Classic fallback (D26) |
| New data-viz tokens | Threshold lines and spike markers, min–max ranges, faders and toggles, meter zones and peak hold, icon colours; values stay in widget settings (D27) |
| Widget kinds not built yet | FPS, frame time, weather and the other mockup-only kinds are out of scope; the investigation lists them as candidates (Part H item 10) |
