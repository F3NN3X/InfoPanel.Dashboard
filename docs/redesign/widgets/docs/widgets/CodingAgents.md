# Coding Agents  `CodingAgents`

Claude Code and Codex at a glance: each session working, waiting for you or done, the plan's 5-hour and weekly use, and tokens per day.

| | |
|---|---|
| File | `src/widgets/CodingAgents.tsx` |
| Category | System |
| Default / min span | 3×3 / 1×1 |
| Icon | `smart_toy` (Material Symbols Rounded) |
| Rendering | DOM |
| Compact views | yes (the 5-hour use, or the sessions running) |
| Studio variant | the sessions as rows |

## Props
Common shell props (every widget): `data`, `accent`, `surface`, `radius`, `skin`, `graph`, `meter`, `variant`, `size`, `title`, `showHeader`, `compactView`, `className`, `style` — see [../ARCHITECTURE.md](../ARCHITECTURE.md#shell-props).

Widget-specific:
```
agents, showPlan, showSessions, showUsage
```
- `agents`: `both` (default), `claude` or `codex`.
- `showPlan`: one row per agent with its 5-hour and weekly use as bars (amber past 80 %, red past 95 %) and when each resets.
- `showSessions`: one row per session: a dot (pulsing while it works, amber while it waits, red after an error), the project folder's name, what it does ("Bash · 3m", "needs you · Edit", "done in 4m") and, for Claude, the context used.
- `showUsage`: today's tokens and a graph of the last 14 days.

## Data
None from the Data API. The dashboard server (`server/agents.mjs`) hears the agents' hooks and Claude Code's statusline through `tools/agent-status.mjs` (connected once with `node tools/agent-install.mjs`), reads the token counts from the agents' own session files (`server/agent-usage.mjs`: `~/.claude/projects`, `~/.codex/sessions`), and sends the kiosks only metadata in the extras stream (`/events/extras`, `src/lib/agents.ts`): no prompt, reply, tool input or path.

## Layout by size
The plan rows first, then as many sessions as fit, then the tokens graph at the bottom; the graph and then the plan drop out first when the box is short. Below 220 px wide the reset times and the context column hide.

## Dynamic Island
Not through this widget: switch on **Coding agents** under the island's Dashboard notices. See [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `Bar` · `Spark` · `Empty`
