#!/usr/bin/env node
// CI: turns `node tools/verify.mjs --plan --json` into the `plan` job's outputs, one per job that may be skipped.
//   node tools/verify.mjs --plan --json --base origin/main | node tools/ci/plan-outputs.mjs [--all | --e2e | --warm]
// `--all` (the ci:full label) sets every output to true. The browser checks (e2e, one-editor, overflow) run when the plan
// lists one for the change, scoped to the specs `verify` maps to the changed files (`e2e_cmds`); `--e2e` (the ci:e2e label)
// or `--all` runs them whole, whatever changed. `--warm` (a push to main) runs only the jobs that save the Rust and npm
// caches PRs restore. Writes name=value lines to $GITHUB_OUTPUT, or to stdout when it isn't set. Node built-ins only.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadMap } from "../verify/map.mjs";

/** Every output name, with the planned checks (by id) that switch it on. `e2e` follows the browser checks (see `planOutputs`). */
export const OUTPUTS = {
  lint: ["lint"],
  typecheck: ["typecheck"],
  unit: ["unit"],
  build: ["build", "budgets", "settings-build"],
  budgets: ["budgets"],
  settings: ["settings-build"],
  server: ["server-suite", "cargo-server"],
  e2e: [],
  ui_usage: ["ui-usage"],
  pack_budgets: ["pack-budgets"],
  lab: ["lab"],
  rust: ["cargo-app"],
  windows: ["cargo-app", "cargo-server"],
  actionlint: ["actionlint"],
};

/** The checks the `e2e` job runs, in order; the build and the debug server under them come from the job itself. */
export const BROWSER_CHECKS = ["e2e", "one-editor", "overflow"];

/** The jobs a push to main runs: the ones whose Rust caches (and npm cache) PRs restore. */
export const WARM = new Set(["server", "rust", "windows"]);

/**
 * The outputs of a plan: a check counts when it has a command (a skipped lint does not). `e2e` is on when the plan lists
 * a browser check, or with `e2e` or `all`, and pulls in the build it runs against. `e2e_cmds` (a JSON array) is what the
 * job runs: the planned commands, or with `e2e` or `all` the whole checks' (`commands`: id to full command, from the map).
 * `full` and `docs_only` are derived.
 */
export function planOutputs(plan, { all = false, e2e = false, warm = false, commands = {} } = {}) {
  if (warm) return { ...Object.fromEntries(Object.keys(OUTPUTS).map((name) => [name, WARM.has(name)])), full: false, docs_only: false };
  const steps = plan.steps.filter((step) => step.cmd);
  const planned = new Set(steps.map((step) => step.id));
  const outputs = Object.fromEntries(Object.entries(OUTPUTS).map(([name, ids]) => [name, all || ids.some((id) => planned.has(id))]));
  const forced = all || e2e;
  const browser = forced ? BROWSER_CHECKS.map((id) => commands[id]).filter(Boolean) : steps.filter((step) => BROWSER_CHECKS.includes(step.id) && step.status !== "not-run").map((step) => step.cmd);
  const withE2e = forced || browser.length > 0;
  return { ...outputs, e2e: withE2e, e2e_cmds: JSON.stringify(browser), build: outputs.build || withE2e, full: all || plan.mode === "full", docs_only: !all && !withE2e && planned.size === 0 };
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(new URL(import.meta.url))) {
  const flag = (name) => process.argv.includes(name);
  const { checks } = loadMap(fileURLToPath(new URL("../..", import.meta.url)));
  const commands = Object.fromEntries(BROWSER_CHECKS.map((id) => [id, checks[id].fullCmd ?? checks[id].cmd]));
  const outputs = planOutputs(JSON.parse(fs.readFileSync(0, "utf8")), { all: flag("--all"), e2e: flag("--e2e"), warm: flag("--warm"), commands });
  const lines = Object.entries(outputs).map(([name, value]) => `${name}=${value}`).join("\n");
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines}\n`);
  console.log(lines);
}
