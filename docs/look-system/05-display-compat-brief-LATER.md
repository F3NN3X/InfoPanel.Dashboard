# Brief: InfoPanel.Studio Display Compatibility (widget sizing across screens)

**Repo:** `E:\GitHub\MyRepos\InfoPanel.Studio` (React 19, Tailwind v4, Vite, Tauri)
**Type:** Investigation only. You produce one findings and plan document. You change no product code.
**When:** Run this **after** the Look System brief (`docs/look-system/01-investigation-brief.md`) is implemented, at least through its P8 (slot plumbing). This brief relies on its slot model, `data-part` hooks and overflow-probe changes.
**Status:** Direction decided 2026-11-03 (Section 4). Scope is **not** fixed: Part A decides how much of the model is needed (Section 3). Decisions are defaults and may change: use the same protocol as `docs/look-system/04-decision-log.md` (log the change with evidence, raise it at the next gate, never change silently), and record DC changes in a "Display compatibility" section of that log.

---

## 0. Ground rules

1. Read first: `AGENTS.md`, `docs/TESTING.md`, `src/widgets/core/Widget.tsx`, `src/widgets/core/layout.ts`, `src/widgets/core/primitives.tsx`, `src/widgets/core/summary-hero.tsx`, `src/widgets/module.tsx`, `src/lib/layout.ts`, and the Look System brief's Appendix C (widget pipeline) and Appendix D (theme packs). Repo rules win over this brief; note any conflict.
2. **No changes to the main working tree.** Use a throwaway worktree (`git worktree add ../ips-display-scratch HEAD`) for instrumentation and prototypes. Summarise the scratch diff in the doc, then remove the worktree.
3. Every claim needs a `path:line` reference at current HEAD, tagged `CONFIRMED`, `CORRECTED` or `UNCONFIRMED`.
4. Every measurement states method, environment, runs, median and spread.
5. Do not change saved-data formats, migrations, guard caps or `tools/perf/budgets.json`. Only propose.
6. **Defaults hazard.** Saved layouts store spans and positions per screen. Nothing in this work may move or resize a widget in an existing saved layout. Any new derivation (grid size, cell size, classes) applies to new screens, or to an existing screen only when the user opts in. Name the test that pins this.
7. **Right-size it.** The user's goal is good control over widget size on any screen. If the existing grid already gives that, the answer is a small set of fixes and tests, not a new system. Every proposal states its cost in files, concepts and bundle bytes.

### Approval gates

- **Gate 1:** after Parts A, B and C, post a short summary. Include what the existing grid already does, the worst failures from the matrix run, and the **recommended scope tier** (Section 3) with reasons. **Stop and wait for "go".**
- **Gate 2:** after the document is written, post the phase list and any open decisions. **Do not implement.** Ask which phase to start.

---

## 1. Goal

**User goal.** People run InfoPanel on very different screens: tiny 480×320 USB panels, 1920×480 and 1920×550 bars, the 2560×720 Xeneon Edge, portrait 1080×1920 monitors, round 480×480 panels, laptops at 2× scale and 4K screens. On every one of them:

1. A widget never clips, overflows or drops text below the 11 px floor.
2. The user can **control widget size directly and predictably**: pick a size, see what fits, see what gets dropped, and preview the result on other screens.
3. A page built for one screen can be brought to another screen with little work.

**Engineering goal.** Widgets keep sizing themselves from their box (`useBox`, `tierOf`, `shapeOf`, `roomy`). The work is in the *range* of boxes a screen produces, the spans the editor offers, and the shapes (strips and columns) that bars and portrait screens need. No extra per-render cost.

---

## 2. Background: why resolution is the wrong axis

Widget fit depends on three things:

- **Effective size**: physical pixels divided by scale. A 3840×2160 screen at 2× has the same effective size as 1920×1080 at 1×.
- **Aspect ratio**: 1920×550 and 1080×1920 have nearly the same pixel count but need opposite layouts.
- **Viewing distance**, which the user expresses through scale.

So everything in this brief works in **effective CSS pixels**, with size and shape classes derived from them.

---

## 3. Scope tiers (Part A decides)

Recommend the **smallest tier that meets all acceptance criteria** (Section 3.1). Moving up a tier needs evidence from Parts A–C.

| Tier | What it adds | When it is enough |
|---|---|---|
| **S: tune the existing grid** | Reference matrix tests (Appendix A) in CI; per-screen scale override; a minimum box per widget kind enforced by the editor; fixes for the specific failures Part B finds | The existing grid already produces sensible cell sizes on all profiles, and only a few widgets fail |
| **M: size contract and shapes** | S, plus display profile with size and shape classes; cell-size clamp for new screens; widget size contract (min span, preferred spans, shapes); `strip` and `column` shapes for an allowlist; size presets in the editor; pack decorations hide below a size class | Bars, portrait or tiny screens fail broadly, or users can't predict what a size will show |
| **L: full model** | M, plus page templates per class, the "adapt layout from another screen" helper, round-display safe areas and radial templates, multi-screen preview in the editor | Users regularly move pages between screens, or round panels are a real target |

### 3.1 Acceptance criteria (every tier must meet these)

- On every Appendix A profile, every registered widget kind at every span the editor offers renders with **no clipping, no overflow, no text below 11 px** (StreamDeck key titles excepted), checked by the overflow probe.
- The editor never offers a span a widget can't fill.
- When content doesn't fit, the widget drops items by priority and shows that it did (for example "+2"), never a half-cut row.
- Existing saved layouts are pixel-identical after the change (defaults hazard).
- The user can change a widget's size in at most two actions and see the result immediately.
- Bundle and render budgets hold; 4K blur and glow costs are measured and capped.

---

## 4. Decided direction (2026-11-03)

These are decided. The doc gives evidence, design, cost and risk for each, and **flags at Gate 1** any item the code shows is wrong or already covered. Items marked *open* need a recommendation.

- **DC1, decided.** A separate brief and plan from the Look System work, cross-referenced.
- **DC2, decided.** The reference matrix in Appendix A, plus every panel model InfoPanel supports (Part A item 8).
- **DC3, decided.** Scale is automatic from the device pixel ratio, or from physical size when known, with a **per-screen user override**.
- **DC4, decided.** Size and shape classes as in Appendix B.
- **DC5, decided.** Grid cell target of **120 CSS px, clamped to 96–180 px**, for new screens. Existing screens keep their grid unless the user opts in.
- **DC6, decided.** A **widget size contract**: each kind declares a minimum span, preferred spans and supported shapes. The editor blocks spans a widget can't fill.
- **DC7, decided.** `strip` (bars) and `column` (portrait) shapes for an **allowlist first**: clock, stats, rings, sparklines, mixer, now playing. Other kinds later.
- **DC8, decided.** Page templates per class plus an **"adapt layout from another screen"** helper. **No automatic reflow** of saved layouts.
- **DC9, decided.** Round displays are supported through a safe-area mask and a radial template.
- **DC10, decided.** Theme-pack decorations (page layers, ornaments, overlays) declare a minimum size class and hide below it.
- **DC11, decided.** Mockups of one page across six profiles exist (Appendix D) as a visual target.
- **DC12, decided.** If Part A shows the existing grid already covers an item, **drop or shrink that item**. The scope tier is chosen at Gate 1.
- **DC13, open.** The user controls for widget size (Section 5): which of size presets, drag-resize, span picker, content-priority editing and multi-screen preview to build, and in which tier.
- **DC14, open.** How the size contract is stored: in the widget module, the registry schema, or a separate manifest. How it is tested.
- **DC15, open.** How profiles, classes and scale are stored in `MonitorProfile` (config version bump or not), and how they interact with the Look System cascade (screen layer).

---

## 5. User control of widget size (the core of this brief)

The point of this work is that the user controls size and can predict the result. The doc audits today's controls (Part G) and proposes the target. Candidate controls, to be ranked by value and cost:

1. **Size presets per widget.** S, M, L and XL map to the widget's preferred spans for the current screen class. One click, always a size that works. On a bar, the presets map to strip spans; on portrait, to column spans.
2. **Direct resize.** Drag handles that snap to cells, plus keyboard resize (arrow keys change span by one cell). Spans the widget can't fill are shown as blocked while dragging, with the reason ("needs at least 2×2").
3. **Fit feedback.** While resizing, a badge shows what the widget will show at that size: "shows 5 of 5 channels", or "drops 2 of 5". The live preview updates in place.
4. **Content priority.** For list-like widgets (mixer channels, drives, cores, processes, forecast days), the user can reorder which items are kept first when space runs short. This uses the existing `stackShown(byPriority)` path.
5. **Density.** The Look System's Density knob (compact, normal, roomy) changes how much fits in a given span. It never changes the span.
6. **Shape choice.** Where a widget supports several shapes at a span (for example a mixer as vertical strips or horizontal rows), a shape switch, defaulting to the best one for the box.
7. **Preview on other screens.** In the editor, preview the current page on another profile or class (480×320, bar, portrait, round) without changing it, with fit warnings per widget.
8. **Lock size.** A widget can be pinned to an exact span so the "adapt layout" helper never changes it.

**Rules.**
- Size controls change spans and positions only. Type, padding and the 11 px floor stay app-owned.
- Every control is keyboard-reachable and has a 44 px target.
- Read-only widgets show state but don't offer resizing.

---

## 6. Investigation tasks

### Part A: Inventory the existing grid

1. How screens are described today: `MonitorProfile` fields for resolution, rotation, scale and zones (`src/lib/layout.ts`). Which of these the kiosk and studio actually use.
2. How the grid is defined: columns, rows, cell size, gaps, zones (island, status bar, page area). Is cell size derived from resolution, fixed, or user-set?
3. How spans and positions are stored per widget and per screen, and what the editor allows today (span limits, snapping, keyboard).
4. The box-sizing chain inside widgets: `useBox`, `tierOf` thresholds (xs, sm, md, lg), `shapeOf`, `summaryShape`, `roomy(w,h)`, `fixedType`, `ROOMY_SCALE`, `fitRows`, `rowsFor`, `rowPx`, `stackShown`. Write down the real thresholds in px.
5. How the overflow probe (`overflow.mjs`, `ofdiff.mjs`) and the Widget QA page work, and whether they can run per viewport.
6. How scale and DPR are read in Tauri (per monitor, mixed-DPI setups, OS zoom), and whether the kiosk can run on a secondary screen at a different scale.
7. How the InfoPanel export handles pixel size and scale.
8. Which panel models InfoPanel supports or users commonly run (search the repo, docs and device presets), with resolution, shape and rotation. Add them to Appendix A.
9. **Conclusion for Gate 1:** for each item in Section 4 and each control in Section 5, say whether the existing system already does it, partly does it, or doesn't.

### Part B: Baseline matrix run

1. In the scratch worktree, run a fixture page on every Appendix A profile with Playwright (viewport set to the effective size, and scale where relevant). Use the ~20-widget fixture from the Look System brief's Part C, plus a mixer, now playing, and FPS, frame-time and weather widgets where those kinds exist.
2. For every registered widget kind, at every span the editor allows on that profile, run the overflow probe. Record: clipping, overflow, text below 11 px, half-cut rows, empty boxes, and content dropped without an indicator.
3. Screenshot grid per profile, at least for the worst ten failures.
4. Output a matrix: rows are widget kinds, columns are profiles, cells are pass, fail (with the reason) or not offered.

### Part C: Widget size inventory

For every registered widget kind:

1. Its smallest usable box in CSS px (measured: the smallest box with no failure from Part B's checks), and its smallest span on a 120 px grid.
2. How it behaves at strip aspect (≥ 3:1) and column aspect (≤ 1:3).
3. Whether it has a content priority list, and whether dropped items are indicated.
4. A draft size contract entry (Appendix C format): minimum span, preferred spans per size class, supported shapes.
5. For the DC7 allowlist, what a `strip` and `column` version needs, using the Appendix D mockups as the target.

### Part D: Scale and classes

1. Prototype the profile → effective size → size class and shape class derivation (Appendix B) as a pure function with unit tests over Appendix A.
2. Prototype the cell-size derivation (DC5) and compare it with today's grid on each profile. Show the difference for new screens; confirm existing screens are untouched.
3. Propose where profile, scale override and classes are stored (DC15) and how they enter the cascade.

### Part E: Layout across screens

1. How the current screen templates work (`lib/screen-templates/`), and how templates per class would be stored next to the theme-pack page templates (Look System D20).
2. A design for the "adapt layout from another screen" helper: inputs (source layout, target profile, widget priorities, size contracts, locked widgets), output (a proposed layout the user reviews), and what it does when things don't fit (drop by page priority, never shrink below minimum).
3. Prototype it in the scratch tree for one case: the Field Kit gaming page from 2560×720 to 1080×1920 and to 480×320. Compare with the Appendix D mockups.

### Part F: Round displays and safe areas

1. How insets (bezels, notches, rotated panels) could be stored per profile and applied to the page area.
2. A round mask: content inside the inscribed square, or a radial template. Which widgets work radially.
3. How the overflow probe checks content against a round mask.

### Part G: User controls audit

1. Today's flow, with click counts: make a widget bigger, smaller, a strip on a bar, and fit more items into the same span.
2. Screenshots of the current resize UI and any limits it shows.
3. For each Section 5 control: value, cost, tier, and whether it reuses something that exists. Recommend a set for DC13.

### Part H: Performance at the extremes

1. At 3840×2160 (scale 2): blur, glow and overlay cost per frame with each built-in theme pack, using the Look System Part C methods. Effects cost grows with pixel area.
2. At 480×320: render cost per data tick and memory on the slowest supported host.
3. Propose budget keys per profile class in `budgets.json` (proposal only).

---

## 7. Phased plan (skeleton; reorder or cut by tier)

Each phase states scope and files, pixel change, risk, effort, bundle delta, budgets, tests, rollback, and the widget checks from the Look System brief (verify, check-fresh, per-kind render tests, parity, overflow probe, screenshots, CHANGELOG and widget specs).

| Phase | Tier | Content | Pixels |
|---|---|---|---|
| DP0 | S | Reference matrix in CI: Playwright viewports per Appendix A profile, the overflow probe per profile × kind × offered span, baseline screenshots | No |
| DP1 | S | Per-screen scale override; display profile fields (resolution, rotation, scale, insets, shape) with defaults that reproduce today exactly | No |
| DP2 | S | Minimum box per widget kind, enforced by the editor; fixes for Part B failures | Only failing widgets |
| DP3 | M | Size and shape classes; cell-size clamp for new screens; size contract metadata for every kind | No for existing screens |
| DP4 | M | Editor size controls chosen in DC13 (presets, snapping resize with blocked spans and fit feedback, content priority, shape choice) | Studio UI only |
| DP5 | M | `strip` and `column` shapes for the allowlist (DC7) | New shapes only |
| DP6 | M | Theme-pack decorations hide below their minimum size class (DC10) | Small screens with packs |
| DP7 | L | Page templates per class; "adapt layout from another screen" helper; multi-screen preview | No for existing layouts |
| DP8 | L | Round displays: safe-area mask, radial template, probe support | Round screens only |
| DP9 | L | Remaining widget kinds get `strip` and `column` shapes | New shapes only |

---

## 8. Deliverable

One file, `docs/investigations/display-compat.md`:

1. Summary: what the existing grid already does, the worst failures, the recommended tier, and decisions needing my call.
2. Grid inventory (Part A), with the real thresholds in px.
3. Matrix results (Part B) and screenshots.
4. Widget size inventory and draft size contracts (Part C).
5. Scale and class derivation, storage proposal (Part D).
6. Layout across screens and the adapt-helper prototype (Part E).
7. Round displays and safe areas (Part F).
8. User controls: current versus proposed, with click counts (Part G).
9. Performance at the extremes and budget proposals (Part H).
10. Decisions DC1–DC15.
11. Phased plan, cut to the recommended tier, with the higher tiers listed as later options.
12. Open questions and anything `UNCONFIRMED`.

Then stop at Gate 2.

---

## Appendix A: Reference matrix

Add every panel model InfoPanel supports (Part A item 8). Effective size is physical pixels divided by scale.

| Profile | Scale | Effective | Size · shape | Why it's here |
|---|---|---|---|---|
| 480×320 | 1 | 480×320 | xs · standard | Smallest common USB panel (3.5") |
| 320×480 | 1 | 320×480 | xs · portrait | The same panel rotated |
| 480×480 round | 1 | 480×480 | xs · round | Circular panels; safe-area mask |
| 800×480 | 1 | 800×480 | sm · wide | 5" panels |
| 1024×600 | 1 | 1024×600 | sm · wide | 7" panels |
| 1280×800 | 1 | 1280×800 | md · wide | 10" tablets and panels |
| 1920×480 | 1 | 1920×480 | sm · bar | 4:1 bars |
| 1920×550 | 1 | 1920×550 | sm · bar | 3.5:1 bars |
| 2560×720 | 1 | 2560×720 | sm · bar | Xeneon Edge class |
| 1080×1920 | 1 | 1080×1920 | lg · portrait | Portrait monitors |
| 1920×1080 | 1 | 1920×1080 | lg · wide | Baseline |
| 2560×1600 | 2 | 1280×800 | md · wide | High-DPI laptops and tablets |
| 3840×2160 | 2 | 1920×1080 | lg · wide | 4K: scale and effects cost |

**Generic sizes for reference** (from the source list the user supplied; not all need testing):
- About 3.5": 320×240, 480×320, 480×272, 640×360, 800×480.
- About 5": 800×480, 854×480, 960×540, 1280×720, 1440×720, 1920×1080.
- About 7": 800×600, 1024×600, 1280×800, 1920×1080, 1920×1200, 2048×1536.
- About 10": 1024×768, 1280×800, 1920×1200, 2160×1350, 2560×1600.
- About 14": 1366×768, 1920×1080, 1920×1200, 2560×1440, 2560×1600, 2880×1800.
- About 18": 1920×1200, 2560×1600, 3840×2160, 3840×2400.

Most of these collapse into the matrix above once scale is applied. Add a profile only if its size and shape class combination isn't already covered.

## Appendix B: Classes

**Size class**, from the effective short side:

| Class | Short side (CSS px) |
|---|---|
| `xs` | < 360 |
| `sm` | 360–599 |
| `md` | 600–899 |
| `lg` | ≥ 900 |

**Shape class**, from the effective aspect ratio (long side ÷ short side, with orientation):

| Class | Rule |
|---|---|
| `bar` | landscape, ratio ≥ 3 |
| `wide` | landscape, ratio 1.6–3 |
| `standard` | landscape, ratio 1.2–1.6 |
| `square` | ratio < 1.2, rectangular |
| `portrait` | portrait, ratio 1.2–3 |
| `tall` | portrait, ratio ≥ 3 |
| `round` | declared round in the profile, any size |

**Grid for new screens:** cell target 120 CSS px, clamped to 96–180; columns and rows come from the page area after insets, status bar and gaps. Examples: 480×320 → about 4×2; 1920×550 → about 16×4; 1080×1920 → about 9×16.

## Appendix C: Widget size contract (draft format)

```json
{
  "kind": "mixer",
  "minSpan": { "w": 2, "h": 2 },
  "preferred": {
    "xs": [{ "w": 4, "h": 2 }],
    "sm": [{ "w": 4, "h": 2 }, { "w": 6, "h": 2 }],
    "md": [{ "w": 4, "h": 3 }, { "w": 6, "h": 3 }],
    "lg": [{ "w": 6, "h": 4 }]
  },
  "shapes": ["box", "strip", "column"],
  "presets": { "S": { "w": 2, "h": 2 }, "M": { "w": 4, "h": 2 }, "L": { "w": 6, "h": 3 }, "XL": { "w": 8, "h": 4 } },
  "priority": "channels",
  "dropIndicator": true
}
```

Presets resolve per shape class (a bar maps L to a strip span such as 6×2). Part C fills one entry per kind; DC14 decides where entries live.

## Appendix D: Mockups

Static copies: `docs/look-system/mockups/Disp*.html` (live canvas: https://claude.ai/artifact/T1imW2kxfdMud58HgXoBS8). The last row shows the Field Kit gaming page on six profiles: 480×320, 800×480, 1920×550, 2560×720, 1080×1920 and round 480×480. Each board is drawn at its effective size, with the grid from Appendix B. Widgets are dropped by page priority (FPS, frame time, GPU temperature, ping, mixer, loads, clock), and theme-pack decorations hide below `sm`. Use them as the visual target for Parts C and E, not as a spec.

## Appendix E: Links to the Look System brief

- Widget pipeline and rules: its Appendix C (box sizing, `roomy`, `fixedType`, summary path, row fitting, overflow probe).
- Theme packs: its Appendix D. Decorations declare a minimum size class (DC10 here). Status bar position (its D21) and page templates (its D20) interact with Part E here.
- Checks every phase runs: its Section 6 widget checks.
