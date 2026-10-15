#!/usr/bin/env node
// Connects Claude Code and Codex to the dashboard (tools/agent-status.mjs, server/agents.mjs).
//
//   node tools/agent-install.mjs            shows what it would change, changes nothing
//   node tools/agent-install.mjs --apply    makes the changes (each file backed up first)
//   node tools/agent-install.mjs --remove   takes them out again (shows first; add --apply)
//
// Claude Code (~/.claude/settings.json): a hook per lifecycle event, added beside the hooks already
// there, and the statusline wrapped so it also posts the plan and context use: your own statusline
// command keeps running and printing as before.
// Codex (~/.codex/hooks.json): the same hooks. Codex asks you to review new hooks: run /hooks in Codex
// once after installing.
//
// Node built-ins only. The `install*` / `remove*` functions are pure.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Marks our entries: any command that runs the forwarder. */
const MARK = "agent-status.mjs";

export const CLAUDE_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PermissionRequest",
  "Notification",
  "Stop",
  "StopFailure",
  "SubagentStart",
  "SubagentStop",
];
export const CODEX_EVENTS = ["SessionStart", "SessionEnd", "UserPromptSubmit", "PreToolUse", "PostToolUse", "PermissionRequest", "Stop", "SubagentStart", "SubagentStop", "Interrupt"];

const ours = (hook) => typeof hook?.command === "string" && hook.command.includes(MARK);

/** `hooks` with one group running `command` added to each event, unless it is there already. */
function withHooks(hooks, events, command, extra) {
  const next = { ...(hooks ?? {}) };
  for (const event of events) {
    const groups = Array.isArray(next[event]) ? next[event] : [];
    if (groups.some((g) => Array.isArray(g?.hooks) && g.hooks.some(ours))) continue;
    next[event] = [...groups, { hooks: [{ type: "command", command, timeout: 5, ...extra }] }];
  }
  return next;
}

/** `hooks` without our entries (and without groups or events left empty by that). */
function withoutHooks(hooks) {
  if (!hooks) return hooks;
  const next = {};
  for (const [event, groups] of Object.entries(hooks)) {
    if (!Array.isArray(groups)) {
      next[event] = groups;
      continue;
    }
    const kept = groups
      .map((g) => (Array.isArray(g?.hooks) ? { ...g, hooks: g.hooks.filter((h) => !ours(h)) } : g))
      .filter((g) => !Array.isArray(g?.hooks) || g.hooks.length > 0);
    if (kept.length > 0) next[event] = kept;
  }
  return next;
}

const wrapArg = (command) => `--wrap=${Buffer.from(command, "utf8").toString("base64url")}`;

/** The command a wrapped statusline ran before (null when it wrapped none or is not ours). */
export function unwrapStatusline(command) {
  if (typeof command !== "string" || !command.includes(MARK)) return null;
  const m = /--wrap=([A-Za-z0-9_-]+)/.exec(command);
  return m ? Buffer.from(m[1], "base64url").toString("utf8") : "";
}

/** Claude Code settings with the hooks added and the statusline wrapped (`forward` runs the forwarder). */
export function installClaude(settings, forward) {
  const hooks = withHooks(settings.hooks, CLAUDE_EVENTS, `${forward} hook claude`, { async: true });
  const line = settings.statusLine;
  let statusLine = line;
  if (!line || typeof line.command !== "string") statusLine = { type: "command", command: `${forward} statusline` };
  else if (!line.command.includes(MARK)) statusLine = { ...line, command: `${forward} statusline ${wrapArg(line.command)}` };
  return { ...settings, hooks, statusLine };
}

/** Claude Code settings without our hooks, the statusline unwrapped (or removed if we added it). */
export function removeClaude(settings) {
  const next = { ...settings, hooks: withoutHooks(settings.hooks) };
  if (next.hooks && Object.keys(next.hooks).length === 0) delete next.hooks;
  const before = unwrapStatusline(settings.statusLine?.command);
  if (before === "") delete next.statusLine;
  else if (before) next.statusLine = { ...settings.statusLine, command: before };
  return next;
}

export const installCodex = (file, forward) => ({ ...file, hooks: withHooks(file.hooks, CODEX_EVENTS, `${forward} hook codex`, {}) });

export function removeCodex(file) {
  const next = { ...file, hooks: withoutHooks(file.hooks) };
  if (Object.keys(next.hooks ?? {}).length === 0) delete next.hooks;
  return next;
}

function readJson(file) {
  if (!fs.existsSync(file)) return { found: false, data: {} };
  return { found: true, data: JSON.parse(fs.readFileSync(file, "utf8")) };
}

/** What changed between two settings objects, one line per top-level hook event / key. */
function describe(before, after) {
  const lines = [];
  const events = new Set([...Object.keys(before.hooks ?? {}), ...Object.keys(after.hooks ?? {})]);
  for (const e of events) {
    const a = JSON.stringify(before.hooks?.[e] ?? null);
    const b = JSON.stringify(after.hooks?.[e] ?? null);
    if (a !== b) lines.push(`  hooks.${e}: ${b === "null" ? "dashboard hook removed" : a === "null" ? "dashboard hook added" : "dashboard hook " + (b.length > a.length ? "added" : "removed")}`);
  }
  if (JSON.stringify(before.statusLine ?? null) !== JSON.stringify(after.statusLine ?? null)) {
    lines.push(`  statusLine: ${after.statusLine?.command ?? "(none)"}`);
    if (before.statusLine?.command) lines.push(`    was: ${before.statusLine.command}`);
  }
  return lines;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const apply = args.has("--apply");
  const remove = args.has("--remove");
  const script = path.join(path.dirname(fileURLToPath(import.meta.url)), "agent-status.mjs").replace(/\\/g, "/");
  const forward = `node "${script}"`;
  const home = os.homedir();
  const targets = [
    { name: "Claude Code", file: path.join(home, ".claude", "settings.json"), change: remove ? removeClaude : (d) => installClaude(d, forward) },
    { name: "Codex", file: path.join(home, ".codex", "hooks.json"), change: remove ? removeCodex : (d) => installCodex(d, forward), needsFolder: path.join(home, ".codex") },
  ];
  for (const t of targets) {
    if (t.needsFolder && !fs.existsSync(t.needsFolder)) {
      console.log(`${t.name}: not installed (${t.needsFolder} missing), skipped.`);
      continue;
    }
    let read;
    try {
      read = readJson(t.file);
    } catch (err) {
      console.log(`${t.name}: ${t.file} is not valid JSON (${err.message}); left alone.`);
      continue;
    }
    const next = t.change(read.data);
    const lines = describe(read.data, next);
    if (lines.length === 0) {
      console.log(`${t.name}: nothing to change in ${t.file}.`);
      continue;
    }
    console.log(`${t.name}: ${t.file}`);
    for (const l of lines) console.log(l);
    if (!apply) continue;
    if (read.found) {
      const backup = `${t.file}.dashboard-${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;
      fs.copyFileSync(t.file, backup);
      console.log(`  backed up to ${backup}`);
    } else {
      fs.mkdirSync(path.dirname(t.file), { recursive: true });
    }
    fs.writeFileSync(t.file, `${JSON.stringify(next, null, 2)}\n`);
    console.log("  written.");
  }
  if (!apply) console.log(`\nNothing was changed. Run again with --apply${remove ? " --remove" : ""} to make these changes.`);
  else if (!remove) console.log("\nDone. In Codex, run /hooks once to review and trust the new hooks. Restart running Claude Code sessions to pick them up.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
