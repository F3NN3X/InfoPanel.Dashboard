#!/usr/bin/env node
// CI: runs the commands the plan chose for the e2e job (`e2e_cmds`, a JSON array in $COMMANDS), each one even when an
// earlier one failed, and exits 1 if any did. Without $COMMANDS (the release): the whole e2e and one-editor suites.
// Node built-ins only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

export const DEFAULT_COMMANDS = ["npm run test:e2e", "npm run test:one-editor"];

/** The commands in `text` (a JSON array of strings), or the defaults when it is empty. */
export function parseCommands(text) {
  if (!text?.trim()) return DEFAULT_COMMANDS;
  const commands = JSON.parse(text);
  if (!Array.isArray(commands) || commands.some((command) => typeof command !== "string")) throw new Error("COMMANDS must be a JSON array of strings");
  return commands;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  const failed = [];
  for (const command of parseCommands(process.env.COMMANDS)) {
    console.log(`\n== ${command.length > 160 ? `${command.slice(0, 159)}…` : command}`);
    if (spawnSync(command, { shell: true, stdio: "inherit" }).status !== 0) failed.push(command);
  }
  if (failed.length) console.error(`\n${failed.length} command(s) failed:\n${failed.map((command) => `  ${command.slice(0, 160)}`).join("\n")}`);
  process.exit(failed.length ? 1 : 0);
}
