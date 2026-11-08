# Coding Agents

Claude Code and Codex: sessions, plan use and tokens.

## What it shows

Each session working, waiting for you or done (with its model and cost), the plan's 5-hour and weekly use as bars or
rings, tokens per day as bars or a heatmap, and this week's split by model and project. Three views: Full, Summary (plan
limits, today and sessions) and Limits (the plan limit bars only). Small zones get a summary card and a dense view of their
own.

## Data it needs

No sensor keys: the server's agent data (`agents` in the integrations extras, `src/lib/agents.ts`), fed by the Claude
Code and Codex hooks (`ips-agent`), the Claude statusline, the Codex session files and the transcripts. Connect them once
with `node tools/agent-install.mjs`.

## Options

- **View**: Full, Summary or Limits; **Agents**: Claude and Codex, Claude Code, or Codex.
- Full only: **Plan use** with its **Limit style**, **Sessions**, **Tokens per day** with its **History** style, and
  **Breakdown**.
- **Show limits as**: Used or Left.

## Presets

None yet.
