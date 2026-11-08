import { describe, expect, it } from "vitest";
import { assetFor } from "../../tools/ci/actionlint.mjs";
import { planOutputs } from "../../tools/ci/plan-outputs.mjs";
import { decideRelease, retried } from "../../tools/ci/release-gate.mjs";
import { DEFAULT_COMMANDS, parseCommands } from "../../tools/ci/run-commands.mjs";

const plan = (mode, ...ids) => ({ mode, steps: ids.map((id) => (id.startsWith("-") ? { id: id.slice(1), cmd: null } : { id, cmd: `run ${id}` })) });

describe("plan outputs", () => {
  it("is docs-only when no planned check has a command (a skipped lint is not one)", () => {
    expect(planOutputs(plan("default", "-lint"))).toMatchObject({ docs_only: true, lint: false, unit: false, full: false });
  });

  it("switches on the jobs a widget change needs, and runs the browser checks the plan lists, as planned", () => {
    const widget = plan("default", "lint", "typecheck", "unit", "build", "ui-usage", "server-bin", "e2e", "overflow");
    const out = planOutputs(widget);
    expect(out).toMatchObject({ lint: true, typecheck: true, unit: true, build: true, ui_usage: true, pack_budgets: false, e2e: true, server: false, rust: false, windows: false, docs_only: false });
    expect(JSON.parse(out.e2e_cmds)).toEqual(["run e2e", "run overflow"]);
  });

  it("leaves the browser alone when the plan lists no browser check, unless the ci:e2e label forces the whole checks", () => {
    const logic = plan("default", "lint", "typecheck", "unit");
    expect(planOutputs(logic)).toMatchObject({ e2e: false, e2e_cmds: "[]" });
    const commands = { e2e: "npm run test:e2e", "one-editor": "npm run test:one-editor", overflow: "node overflow" };
    const forced = planOutputs(logic, { e2e: true, commands });
    expect(forced).toMatchObject({ e2e: true, build: true });
    expect(JSON.parse(forced.e2e_cmds)).toEqual(Object.values(commands));
  });

  it("builds the pages for a forced browser run even when the change needs no build", () => {
    expect(planOutputs(plan("default", "-lint"), { e2e: true })).toMatchObject({ e2e: true, build: true, docs_only: false });
  });

  it("runs only the cache-saving jobs on a push to main (--warm)", () => {
    const warm = planOutputs(plan("full", "lint", "unit", "e2e"), { warm: true });
    expect(Object.entries(warm).filter(([, value]) => value).map(([name]) => name).sort()).toEqual(["rust", "server", "windows"]);
  });

  it("sends server work to the server job and to windows, and the app crate to the rust job", () => {
    expect(planOutputs(plan("default", "server-suite", "cargo-server"))).toMatchObject({ server: true, windows: true, rust: false });
    expect(planOutputs(plan("default", "typecheck", "cargo-app"))).toMatchObject({ rust: true, windows: true, server: false });
  });

  it("is everything on --all (the ci:full label), and `full` follows an escalated plan", () => {
    const all = planOutputs(plan("default", "-lint"), { all: true });
    expect(Object.entries(all).filter(([name, value]) => name !== "docs_only" && !value)).toEqual([]);
    expect(all.docs_only).toBe(false);
    expect(planOutputs(plan("full", "lint", "unit")).full).toBe(true);
  });
});

describe("release gate", () => {
  const sha = "abcdef0123456789";
  const ok = [{ name: "ci-ok", conclusion: "success" }];
  const base = { sha, check: "ci-ok", commitChecks: [], pulls: [], nightlyShas: [] };

  it("passes on a successful ci-ok on the commit", () => {
    expect(decideRelease({ ...base, commitChecks: ok }).ok).toBe(true);
  });

  it("passes for a squash-merged PR whose head was green and whose merge commit is this one", () => {
    const pulls = [{ number: 7, merge_commit_sha: sha, headChecks: ok }];
    expect(decideRelease({ ...base, pulls }).ok).toBe(true);
    expect(decideRelease({ ...base, pulls: [{ ...pulls[0], merge_commit_sha: "other" }] }).ok).toBe(false);
  });

  it("passes on the last green nightly's commit, and fails on a red or missing ci-ok", () => {
    expect(decideRelease({ ...base, nightlyShas: [sha] }).ok).toBe(true);
    expect(decideRelease({ ...base, commitChecks: [{ name: "ci-ok", conclusion: "failure" }] }).ok).toBe(false);
    expect(decideRelease(base).reason).toContain("no successful ci-ok");
  });
});

describe("run-commands", () => {
  it("runs the plan's JSON array, the whole e2e and one-editor suites without one, and refuses anything else", () => {
    expect(parseCommands('["a b","c"]')).toEqual(["a b", "c"]);
    expect(parseCommands("[]")).toEqual([]);
    expect(parseCommands("  ")).toEqual(DEFAULT_COMMANDS);
    expect(() => parseCommands('{"a":1}')).toThrow("JSON array");
  });
});

describe("release gate retries", () => {
  const flaky = (failures) => {
    let calls = 0;
    return { fn: () => { if (++calls <= failures) throw new Error("HTTP 502"); return "ok"; }, calls: () => calls };
  };

  it("passes after two transient errors, sleeping the backoff between tries", () => {
    const slept = [];
    const call = flaky(2);
    expect(retried(call.fn, [2000, 5000], (ms) => slept.push(ms))).toBe("ok");
    expect(slept).toEqual([2000, 5000]);
  });

  it("throws the last error once the tries are used up (the gate then exits 1)", () => {
    const call = flaky(9);
    expect(() => retried(call.fn, [1, 1], () => {})).toThrow("HTTP 502");
    expect(call.calls()).toBe(3);
  });
});

describe("actionlint pin", () => {
  it("pins linux and windows x64 with a SHA-256 each", () => {
    for (const platform of ["linux", "win32"]) expect(assetFor(platform, "x64").sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(assetFor("darwin", "arm64")).toBeNull();
  });
});
