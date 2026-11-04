# Prompts for Claude Code

Paste these in order. Each one is self-contained; the same text is in `.claude/commands/look-*.md` if you prefer slash commands. Replace anything in angle brackets.

---

## Step 0: preflight (no changes)

```
Read docs/look-system/README.md, then 01-investigation-brief.md sections 0 and 1, and 04-decision-log.md.
Preflight only. Change nothing.
1. Confirm every file listed in the README exists under docs/look-system/.
2. Confirm these repo paths exist at HEAD and list any that don't: AGENTS.md, docs/TESTING.md,
   src/widgets/core/Widget.tsx, src/widgets/core/layout.ts, src/widgets/core/primitives.tsx,
   src/widgets/core/theme.ts, src/widgets/core/look.ts, src/widgets/core/tokens.ts,
   src/lib/theme.ts, src/lib/theme-model.ts, src/lib/style-resolve.ts, src/index.css,
   src/settings/tokens.css, src/components/surfaces.ts, src/components/widget-style.ts,
   src/widgets/core/mixer-views.css, src/lib/infopanel/gauges/vector.ts, tools/perf/budgets.json,
   tests/components/color-literals.test.ts, tests/lib/__fixtures__/v8-parity.json.
3. Run `git rev-parse HEAD` and `git log --oneline b2b36b3d..HEAD | wc -l`.
4. Check that `npm run verify` passes on a clean tree.
5. Report: missing paths, commit distance from b2b36b3d, verify result, and anything in AGENTS.md
   that conflicts with the brief. Then stop.
```

## Stage 1: investigation

```
Run the investigation in docs/look-system/01-investigation-brief.md exactly as written.
Use 03-theme-packs-spec.md and 04-decision-log.md as inputs; mockups/ is the visual target.
Follow its ground rules: no product code changes, a throwaway worktree for instrumentation,
path:line evidence for every claim, measurements with method and spread.
If the code shows a decision is wrong or much more expensive than expected, write a change
proposal in 04-decision-log.md (change log table) and raise it at the gate. Don't change
decisions silently.
Stop at Gate 1 and wait for my "go".
```

### After Gate 1

```
go. Continue the investigation from Gate 1 to Gate 2. <Add any answers or changes here.>
```

### After Gate 2 (approve the plan)

```
go. The plan in docs/investigations/look-system.md is approved <with these changes: ...>.
Apply any approved decision changes to 04-decision-log.md (status "changed", today's date)
and update the brief or spec sections that depend on them. Then create
docs/look-system/progress.md from the template in 02-implementation-runbook.md section 4,
listing every phase from the plan. Don't start P0 yet; show me the progress table.
```

## Stage 2: one phase at a time

```
Implement phase <P0> following docs/look-system/02-implementation-runbook.md.
Read the plan entry for <P0> in docs/investigations/look-system.md, the decision log, and the
files it touches. Confirm the runbook's "expected changes" against HEAD first and list mismatches.
Work on branch look/<p0-slug>. Run every check in runbook section 2. Update progress.md,
CHANGELOG and widget specs as required.
Stop and ask if a guardrail or decision would need to change, a budget would rise, or a diff
appears that you can't explain. Finish with the phase report and wait for my "go".
```

To approve several pixel-identical phases in one run:

```
go. You may run <P0, P1 and P2> back to back, as long as each one has an empty parity diff and no
budget change. Stop immediately if either condition fails, and report each phase separately.
```

### Resume after an interrupted session

```
Resume the Look System work. Read docs/look-system/progress.md, the latest phase report, the
decision log and `git status`/`git log -10`. Tell me where we are and what's left in the current
phase, then continue it following 02-implementation-runbook.md.
```

## Decision changes

```
I want to change decision <D17>: <new direction>. Update 04-decision-log.md (change log row and
the decision text), find every place in docs/look-system/ and docs/investigations/look-system.md
that depends on it, list the affected phases, and propose the edits. Apply them when I say "go".
```

## Status check

```
Summarise the Look System status: progress.md table, open items in the current phase, pending
decision changes in 04-decision-log.md, and budget deltas so far. Don't change anything.
```

## Final review (after P12)

```
Final review of the Look System work. Check every acceptance point: D1–D27 as finally decided,
guardrails G1–G8, all built-in packs and Looks pass contrast, overflow, parity and budgets,
the validator rejects the bad test packs, saved configs from before v17 still load and look the
same. Write docs/investigations/look-system-review.md with results and anything left over.
Then tell me whether we're ready to start 05-display-compat-brief-LATER.md.
```
