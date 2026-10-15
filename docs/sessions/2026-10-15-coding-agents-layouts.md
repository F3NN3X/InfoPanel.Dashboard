---
title: Coding Agents layouts, short MCP tool names
status: shipped, live checks still open
created: 2026-10-15
updated: 2026-10-15
tags: [agents, widget, server]
---

One PR, #19 (`f1b8a59`, squash of three commits), merged with no CI on the repo. Before the merge:
`npm run build` exit 0, `tsc -b` exit 0, `vitest run` 197 files / 3,427 passed / 1 skipped, and
`__qaOverflow()` clean at 13 spans × 4 setting combinations × 4 skins at cells 110 and 150. The live
server on 127.0.0.1:3922 runs `f1b8a59`.

Started from the live-test checklist in [2026-10-15-island-motion-agents.md](2026-10-15-island-motion-agents.md).
Items 4 (widget) and 5 (no leaks in `/api/extras`) passed. Item 2 passed in part: working state, tool and island text.

## What shipped

**Short MCP tool names.** `server/agents.mjs` `toolOf` turns `mcp__<server>__<tool>` into the tool's
own name before the 60-character cut. The full name had filled the session row and cut the island to `mcp__plugi…`.

**Three widget settings, defaults keep the old look.** *Limit style* Bars / Rings, *Show limits as*
Used / Left, *History* Daily bars / Heatmap. The bars pick the roomiest of three forms that fits: a card
per agent with *Resets in*, a line with two bars, or the numbers. The heatmap is a Monday-to-Sunday grid, at
most six weeks. A wide box moves the heatmap into its own column, and lists the sessions beside the limits
(at least 460 px wide and 1.8 × the height). The layout code is in `src/widgets/CodingAgents/` (`limits.tsx`, `history.tsx`).

**35 days of token history** instead of 14 (`server/agent-usage.mjs` `HISTORY_DAYS`), so the heatmap has five weeks.

## What broke, and what it taught

- `server/agent-install.test.mjs` failed to load. With `core.autocrlf=true`, `tools/agent-install.mjs`
  checked out with a CRLF shebang, and Vitest cannot parse `#!…node\r`. Node itself runs the file
  fine. `tools/*.mjs` is now `eol=lf` in `.gitattributes`. A test that fails on a fresh checkout but
  passed before the merge is a line-ending problem first.
- A ring with its reset times beside it is as tall as those times (66 px), not just the ring. Small rings
  had clipped the sessions list at cell 110. `ringLayout` now counts that height.
- Killing node under `start-dashboard.bat` leaves the batch window at its `pause`, and a new
  `Start-Process` of the batch file did not come up. The server now runs from a minimized `cmd /k node server.mjs`
  window titled "InfoPanel Dashboard 3922".

## Decisions

- Cost (ccusage-style Today / Week / Month in $) is left out: it needs a per-model price table on the
  server, which belongs to #18.
- The tone of a limit always follows its use, even when it reads as *left*. 5 % left is red, not green.

## Still open

- Live checks: the *needs you* notice and badge, *Claude finished* and the island's open and close
  passed (checked by the user). Codex after `/hooks` approval is still to test.
- #17 and #18 as before. New: #21 (narrow cells show only the compact summary), #22 (rings beside the
  sessions hide the reset times at 4×2). #20 is fixed: `*.snap` is `eol=lf` in `.gitattributes`.

## Later the same day

The studio's left panel widens by dragging its right edge, from 256 px (the old fixed width, now the
least) to 440 px. Its width is remembered per viewer (localStorage `studio.drawerWidth`), and a
double-click returns to 256. As with the dock splitter, a drag moves a guide line and the width is
committed on release.
- The old `start-dashboard.bat` window (PID 11736) is empty and can be closed.
