---
title: Island motion, look options and coding agent status
status: shipped, live testing next
created: 2026-10-15
updated: 2026-10-15
tags: [island, agents, widget]
---

Three PRs merged: #14 (island sources, Timer, island panel), #15 (a broken `server.mjs` fix, plus a
syntax guard test) and #16 (`817c8c6`, this record's main subject). Before #16 merged: `tsc -b` exit 0,
`vitest run` 196 files / 3,412 passed / 1 skipped (the skip predates the branch), and `vite build` exit 0.
The live server on 127.0.0.1:3922 runs `817c8c6`, and the user has run `tools/agent-install.mjs --apply`.

Plan: [redesign/island/PLAN.md](../redesign/island/PLAN.md), phases I10 to I14, all done.

## What shipped

**Motion.** Open, close and morph use springs from L4 NotchBar, written as CSS `linear()` curves
(`src/lib/island/spring.ts`). Content cross-fades on its own layer (`.island-enter` / `.island-exit`)
instead of scaling. Motion can be Lively, Smooth or Off; `?slow=N` slows it for inspection.

**Look.** Pill or notch, scale, colours (black, theme or custom), opacity, border, shadow, font, weight,
seconds and 12/24 h (`src/components/island/island-look.ts`). Every default keeps the old look.

**Extras.** Up to three idle values with orange and red levels (the old `sensorKey` migrates to the
first), idle rotation, a hairline idle, and grouped notices with a ×N count.

**Agents.** Hooks and the statusline call `tools/agent-status.mjs`, which posts to `/api/agents/*`.
`server/agents.mjs` reduces the events to sessions. `server/agent-usage.mjs` reads token history from the
transcripts. The island shows them when its *Coding agents* notice is on; the new widget is *Coding Agents*.

## What broke, and what it taught

- #14 shipped a `server.mjs` with real newlines inside a JS string, written by a Python edit, so the
  kiosk went down. `server/syntax.test.mjs` now catches it. When an edit script inserts JS, keep `\n`
  escaped.
- The default smooth graph eases in like a live stream, so 14 daily totals drew as a flat line. Counts
  per day use `graph="bars"`.
- The studio auto-saves to the live config. Browser QA has to go through the Playwright routes in
  `.playwright-mcp/qa-setup.js`, which block config writes.

## Decisions

- I never edit `~/.claude/settings.json` or `~/.codex/hooks.json` myself. The installer previews by
  default, writes a backup on `--apply`, and undoes everything with `--remove --apply`.
- Agent posts are accepted only from loopback, with a JSON body and `X-Agent-Event: 1`, so a web page
  cannot forge them. Only metadata is published: no prompts, paths or session ids.

## Still open

- Live test with real sessions (the checklist below).
- #17: whether the agent activity should show beside the waiting badge.
- #18: the widget could show cost and model, which the server already has.

### Live test checklist

1. Studio › profile › Dynamic Island: try Shape, Look, Clock and Motion, and switch on Dashboard notices ›
   **Coding agents**. Watch the kiosk: the open and close should look smooth, and the notch corners
   should be visible.
2. Claude Code: start a long task, and the island should read *Claude · project* with a pulse. Trigger a
   permission prompt: a *needs you* notice should open, then leave a badge. A turn of 20 s or more ending
   should raise *Claude finished*.
3. Codex: the same, after `/hooks` approval. Check the Interrupt event and plan 5h from its rollout files.
4. Add the **Coding Agents** widget: plan bars with reset times, sessions, tokens today and the 14 daily
   bars.
5. Check `curl -s http://127.0.0.1:3922/api/extras` for leaks: it should show folder names only.
