# Look System and theme packs: handoff package

Everything Claude Code needs to unify themes, skins and surfaces in InfoPanel.Studio into **Looks**, then add art-directed **theme packs**. Prepared 3 November 2026.

## What's inside

| File | What it is | When it's used |
|---|---|---|
| `README.md` | This file | First |
| `00-PROMPTS.md` | Copy-paste prompts for every step | Every step |
| `01-investigation-brief.md` | Stage 1: verify the design against the code, measure, and write a phased plan. No product code changes | Stage 1 |
| `02-implementation-runbook.md` | Stage 2: implement the approved plan phase by phase (P0–P12), with checks and gates | Stage 2 |
| `03-theme-packs-spec.md` | Theme pack design: levels, pack format, slot catalogue, guardrails, sample packs | Stages 1 and 2 |
| `04-decision-log.md` | Fixed guardrails, decisions D1–D27, and the change protocol | Throughout |
| `05-display-compat-brief-LATER.md` | Widget sizing across screen sizes. **Don't start until stage 2 is done** (at least P9) | Later |
| `mockups/` | 23 static HTML mockups (open `mockups/index.html`) | Visual target |
| `progress.md` | Phase tracker, filled in during stage 2 | Stage 2 |
| `../../.claude/commands/look-*.md` | Optional Claude Code slash commands for the same prompts. Local only, never committed | Optional |

## Install

1. Unzip at the **repo root** of `E:\GitHub\MyRepos\InfoPanel.Studio`. You get `docs/look-system/` and `.claude/commands/look-*.md`.
2. Commit `docs/look-system/` on a branch (for example `look/package`), so every stage reads the same files. **Don't commit `.claude/`**: the repo keeps agent files local (`.git/info/exclude`, see `AGENTS.md`). The slash commands are a convenience only; `00-PROMPTS.md` holds the same text, so nothing tracked depends on them.
3. Optional: open `docs/look-system/mockups/index.html` in a browser. The mockups load Google Fonts, so they need internet to look right.

## Workflow

```
Step 0  Preflight          → package files and key repo paths checked, nothing changed
Stage 1 Investigation      → docs/investigations/look-system.md
          Gate 1           → verification counts, perf numbers, surprises      (you say "go")
          Gate 2           → full plan, decisions needing you, decision changes (you say "go")
Stage 2 Implementation     → P0 … P12, one branch and one report per phase
          Gate per phase   → report, diffs, budgets                             (you say "go")
Later   Display compat     → 05-display-compat-brief-LATER.md
```

Use the prompts in `00-PROMPTS.md`, or the slash commands: `/look-preflight`, `/look-investigate`, `/look-phase P3a`, `/look-status`, `/look-decision`.

## Decisions can change

You told me decisions may change if that's what it takes to make this work. The package handles that through `04-decision-log.md`:

- **Decisions (D1–D27)** are defaults. Claude Code may propose a change with evidence; it writes it in the log and raises it at the next gate. Nothing changes silently, and nothing changed is built before you say "go".
- **Fixed guardrails (G1–G8)** need your explicit approval to change: saved data and untouched widgets stay as they are, the 11 px floor, no JavaScript or remote URLs in packs, the IP rule, accessibility, budgets, and the repo's own rules.

## What the stages do

**Stage 1 (investigation)** checks every claim from the original sweep against the code, measures performance, maps every token, tests whether the contracts cover all 14 skins and every surface, prototypes the Field Kit pack in a throwaway worktree, and writes a phased plan with costs and risks. It changes no product code.

**Stage 2 (implementation)** runs the plan's phases in order. Pixel-identical phases come first (P0–P2, P3a, P4), then the visible ones. Every phase runs the repo checks (verify, verify:full, check-fresh, per-kind render tests, parity, the overflow probe, screenshots, budgets) and stops for your "go".

## Things to watch

- **Footprint work.** A footprint-reduction effort may be running on the same repo. The runbook tells Claude Code not to raise budgets without asking and to prefer lazy loading.
- **Long phases.** P5 (config v17 migration) and P8–P9 (slots and pack loader) are the big ones. Expect them to need more than one session; `progress.md` keeps the state.
- **Mockup widgets.** FPS, frame time, weather and other widget kinds shown in the mockups may not exist yet. They're out of scope; stage 1 lists them as candidates.
- **IP.** The packs are inspired by games and eras. They never ship game names, logos, art or licensed fonts.
