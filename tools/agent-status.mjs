#!/usr/bin/env node
// Forwards Claude Code and Codex status to the dashboard server (server/agents.mjs).
//
//   node tools/agent-status.mjs hook claude          a hook: posts its stdin JSON, prints nothing
//   node tools/agent-status.mjs hook codex
//   node tools/agent-status.mjs statusline [--wrap=<base64url of your statusline command>]
//                                                     posts the statusline JSON, then runs your own
//                                                     statusline with the same input and prints its line
//                                                     (base64 keeps its quotes intact through the shell)
//
// It never fails the agent: every error is swallowed, it exits 0, and the post gives up after a
// second. A hook prints nothing (some hook output is shown to the model). DASHBOARD_URL overrides
// http://127.0.0.1:3922. Installed by tools/agent-install.mjs.
//
// Node built-ins only.

import { spawn } from "node:child_process";

const BASE = (process.env.DASHBOARD_URL || "http://127.0.0.1:3922").replace(/\/+$/, "");
const TIMEOUT_MS = 1000;

/** All of stdin as a string ("" when none comes within the timeout). */
function readStdin() {
  return new Promise((resolve) => {
    if (process.stdin.isTTY) return resolve("");
    const chunks = [];
    const done = () => resolve(Buffer.concat(chunks).toString("utf8"));
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", done);
    process.stdin.on("error", done);
    setTimeout(done, 3000).unref();
  });
}

/** POST the payload; resolves either way. */
async function post(path, body) {
  try {
    await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Agent-Event": "1" },
      body,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    // The dashboard is not running: the agent carries on.
  }
}

/** Run the wrapped statusline with `input` on its stdin and pass its output through. */
function runWrapped(command, input) {
  return new Promise((resolve) => {
    const child = spawn(command, { shell: true, stdio: ["pipe", "inherit", "inherit"] });
    child.on("error", () => resolve());
    child.on("close", () => resolve());
    child.stdin.on("error", () => {});
    child.stdin.end(input);
  });
}

async function main() {
  const [mode, ...rest] = process.argv.slice(2);
  const input = await readStdin();
  if (mode === "hook") {
    const agent = rest[0] === "codex" ? "codex" : "claude";
    if (input.trim()) await post(`/api/agents/event?agent=${agent}`, input);
    return;
  }
  if (mode === "statusline") {
    const arg = rest.find((a) => a.startsWith("--wrap="));
    const wrapped = arg ? Buffer.from(arg.slice(7), "base64url").toString("utf8") : "";
    await Promise.all([input.trim() ? post("/api/agents/statusline", input) : null, wrapped ? runWrapped(wrapped, input) : null]);
  }
}

main().finally(() => process.exit(0));
