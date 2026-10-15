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
agents, showPlan, showSessions, showUsage, limitStyle, percent, history
```
- `agents`: `both` (default), `claude` or `codex`.
- `showPlan`: each agent's 5-hour and weekly use (amber past 80 %, red past 95 %) and when each resets.
- `showSessions`: one row per session: a dot (pulsing while it works, amber while it waits, red after an error), the project folder's name, what it does ("Bash · 3m", "needs you · Edit", "done in 4m") and, for Claude, the context used.
- `showUsage`: today's tokens, this week's, and a graph of the last five weeks.
- `limitStyle`: `bars` (default) or `rings` (a 5h and a 1w ring per agent, with the reset times beside them when there is room).
- `percent`: the limits as `used` (default) or `left`. The tone always follows the use.
- `history`: `bars` (default, one bar per day) or `heatmap` (a Monday-to-Sunday grid per week, today outlined).

## Data
None from the Data API. The dashboard server (`server/agents.mjs`) hears the agents' hooks and Claude Code's statusline through `tools/agent-status.mjs` (connected once with `node tools/agent-install.mjs`), reads the token counts from the agents' own session files (`server/agent-usage.mjs`: `~/.claude/projects`, `~/.codex/sessions`), and sends the kiosks only metadata in the extras stream (`/events/extras`, `src/lib/agents.ts`): no prompt, reply, tool input or path.

## Layout by size
The limits first, then as many sessions as fit, then the tokens graph at the bottom. Bars take the roomiest of three forms that fits: a card per agent (label, number, bar and *Resets in* per window), one line per agent with two short bars, or a line of numbers. Rings fall back to bars below 44 px, sit side by side when the box is wide, and stop at 60 % of the height while sessions are listed. The heatmap moves into its own column on the right in a wide box (400 px and 1.4 × the height), and turns into the daily bars when it does not fit in half the height. When the box is short the graph drops first, then the sessions, then the limits. Below 220 px wide the reset times and the context column hide.

## Dynamic Island
Not through this widget: switch on **Coding agents** under the island's Dashboard notices. See [the island plan](../../../island/PLAN.md#what-shows-and-when).

## Core building blocks used
`Widget` · `shell` · `Bar` · `Ring` · `Num` · `Spark` · `Empty`
