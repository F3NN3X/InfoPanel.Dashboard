// Quarantine (docs/TESTING.md, "Quarantine"): tests/quarantine.json names test files held out of the gating runs while a
// flaky one is fixed. Vitest (vite.config.ts) and Playwright (playwright.config.ts) leave them out; with QUARANTINE=only
// they are the only ones that run. `node tools/ci/quarantine.mjs run` runs just those, advisory: it always exits 0.
// Every entry needs a tracking issue, an owner and a deadline, so the list cannot become a graveyard (tests/tools/ci-quarantine.test.mjs).
// Node built-ins only.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const QUARANTINE_FILE = "tests/quarantine.json";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** The entries, `{ "<test file>": { issue, owner, until } }`; empty when the file is missing. */
export function readQuarantine(root = ROOT) {
  const file = path.join(root, QUARANTINE_FILE);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : {};
}

/** The quarantined test files, repo-relative with forward slashes. */
export const quarantinedFiles = (root = ROOT) => Object.keys(readQuarantine(root));

/** What is wrong with the entries: no issue, no owner, a bad or past `until` (YYYY-MM-DD, today still counts), a file that is gone. */
export function problems(entries, { today, exists }) {
  return Object.entries(entries).flatMap(([file, entry]) => {
    const found = [];
    if (!exists(file)) found.push("the file does not exist (a fixed or deleted test leaves the list)");
    if (!Number.isInteger(entry?.issue) || entry.issue <= 0) found.push("needs the tracking issue number as `issue`");
    if (typeof entry?.owner !== "string" || !entry.owner.trim()) found.push("needs an `owner`");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry?.until ?? "") || Number.isNaN(Date.parse(entry.until))) found.push("needs `until` as YYYY-MM-DD");
    else if (entry.until < today) found.push(`is past its deadline (${entry.until}): fix the test and remove the entry, or move the date with a reason`);
    return found.map((text) => `${file}: ${text}`);
  });
}

/** Playwright's project options for `testDir`: the quarantined specs under it ignored, or with `only` the only ones matched. */
export function playwrightScope(files, testDir, only) {
  const here = files.filter((file) => file.startsWith(`${testDir}/`) && file.endsWith(".spec.ts")).map((file) => file.slice(testDir.length + 1));
  if (only) return { testMatch: here };
  return here.length ? { testIgnore: here } : {};
}

/** Run the quarantined tests and say which still fail. Advisory: the exit status is always 0. */
export function run(root = ROOT) {
  const files = quarantinedFiles(root);
  if (files.length === 0) {
    console.log("quarantine: nothing is quarantined.");
    return;
  }
  const env = { ...process.env, QUARANTINE: "only" };
  const specs = files.filter((file) => file.endsWith(".spec.ts"));
  const commands = [];
  if (files.length > specs.length) commands.push("npx vitest run --passWithNoTests");
  if (specs.length) commands.push("npx playwright test --project=e2e --project=one-editor --pass-with-no-tests");
  const failed = commands.filter((command) => spawnSync(command, { cwd: root, env, shell: true, stdio: "inherit" }).status !== 0);
  console.log(
    failed.length === 0
      ? `quarantine: ${files.length} file(s) pass now: fix is in, remove them from ${QUARANTINE_FILE}.`
      : `quarantine: still failing (${failed.join("; ")}). Advisory, not a gate.`,
  );
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) {
  if (process.argv[2] !== "run") {
    console.error("usage: node tools/ci/quarantine.mjs run");
    process.exit(2);
  }
  run();
}
