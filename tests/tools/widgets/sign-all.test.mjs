// The batch signer (tools/widgets/sign-all.mjs): it finds every package, signs what is unsigned or changed, leaves what still
// verifies alone, refuses a code widget of a publisher the key does not sign for, and with --check reports without writing.
// Keys are throwaway, made at test time.
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { generateKeyPair, readSecretKey } from "../../../tools/widgets/minisign.mjs";
import { findPackages, signAll } from "../../../tools/widgets/sign-all.mjs";

const dirs = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

function workspace() {
  const root = mkdtempSync(join(tmpdir(), "sign-all-"));
  dirs.push(root);
  const pkg = (rel, manifest, files = { "widget.js": "export default () => null;\n" }) => {
    const dir = join(root, rel);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ format: 1, version: "1.0.0", files: [], ...manifest }));
    for (const [name, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, name)), { recursive: true });
      writeFileSync(join(dir, name), text);
    }
    return dir;
  };
  return { root, pkg };
}

const code = (publisher, name = "a") => ({ kind: "code", id: `ext:${publisher}.${name}`, publisher, entry: "widget.js" });
const states = (rows) => Object.fromEntries(rows.map((r) => [r.id, r.state]));

describe("sign-all", () => {
  it("finds packages, not their subfolders, dot folders or node_modules", () => {
    const { root, pkg } = workspace();
    const a = pkg("a", code("me"), { "widget.js": "x", "img/inner.txt": "" });
    pkg("a/img/nested", code("me", "nested"));
    pkg(".hidden/b", code("me", "b"));
    pkg("node_modules/c", code("me", "c"));
    const d = pkg("deep/er/d", { kind: "recipe", id: "recipe:d" }, { "recipe.json": "{}" });
    expect(findPackages(root)).toEqual([a, d]);
  });

  it("signs what is unsigned, leaves what still verifies, and signs again what changed or another key signed", () => {
    const { root, pkg } = workspace();
    const pair = generateKeyPair();
    const key = readSecretKey(pair.secretText);
    const a = pkg("a", code("me", "a"));
    pkg("b", code("me", "b"));
    expect(states(signAll({ roots: [root], key, publicText: pair.publicText }))).toEqual({ "ext:me.a": "signed", "ext:me.b": "signed" });
    expect(JSON.parse(readFileSync(join(a, "manifest.json"), "utf8")).files.map((f) => f.path)).toEqual(["widget.js"]);
    expect(states(signAll({ roots: [root], key, publicText: pair.publicText }))).toEqual({ "ext:me.a": "up-to-date", "ext:me.b": "up-to-date" });

    writeFileSync(join(a, "widget.js"), "changed");
    const rows = signAll({ roots: [root], key, publicText: pair.publicText });
    expect(rows.find((r) => r.id === "ext:me.a")).toMatchObject({ state: "signed", reason: "its files changed" });

    const other = generateKeyPair();
    const again = signAll({ roots: [root], key: readSecretKey(other.secretText), publicText: other.publicText });
    expect(again.every((r) => r.state === "signed" && /another key/.test(r.reason))).toBe(true);
    expect(states(signAll({ roots: [root], key, publicText: pair.publicText, force: true }))).toEqual({ "ext:me.a": "signed", "ext:me.b": "signed" });
  });

  it("refuses a code widget of a publisher the key does not sign for, or whose id and publisher disagree", () => {
    const { root, pkg } = workspace();
    const pair = generateKeyPair();
    const key = readSecretKey(pair.secretText);
    const theirs = pkg("theirs", code("acme"));
    pkg("mine", code("infopanel"));
    pkg("odd", { kind: "code", id: "ext:infopanel.odd", publisher: "acme", entry: "widget.js" });
    pkg("bare", { kind: "code", id: "not-ext", publisher: "x", entry: "widget.js" });
    pkg("recipe", { kind: "recipe", id: "recipe:r" }, { "recipe.json": "{}" });
    const rows = signAll({ roots: [root], key, publicText: pair.publicText, publishers: ["infopanel", "infopanel-studio"] });
    expect(states(rows)).toEqual({ "ext:acme.a": "refused", "ext:infopanel.a": "signed", "ext:infopanel.odd": "refused", "not-ext": "refused", "recipe:r": "signed" });
    expect(JSON.parse(readFileSync(join(theirs, "manifest.json"), "utf8")).signature, "a refused package is not written").toBeUndefined();
  });

  it("--check writes nothing, says what needs signing, and exits 1 until it is signed", () => {
    const { root, pkg } = workspace();
    const pair = generateKeyPair();
    const keyFile = join(root, "k.key");
    writeFileSync(keyFile, pair.secretText);
    writeFileSync(join(root, "k.pub"), pair.publicText);
    const a = pkg("pkgs/a", code("me"));
    const before = readFileSync(join(a, "manifest.json"), "utf8");
    const run = (...args) => spawnSync(process.execPath, ["tools/widgets/sign-all.mjs", join(root, "pkgs"), "--key", keyFile, ...args], { encoding: "utf8" });

    const check = run("--check");
    expect([check.status, /needs-signing\s+ext:me\.a .*\(not signed\)/.test(check.stdout)]).toEqual([1, true]);
    expect(readFileSync(join(a, "manifest.json"), "utf8")).toBe(before);
    expect(run().status).toBe(0);
    expect(run("--check").status).toBe(0);
    expect(run("--bogus").status).toBe(2);
    expect(spawnSync(process.execPath, ["tools/widgets/sign-all.mjs"], { encoding: "utf8" }).status).toBe(2);
  });

  it("refuses a public key file that is not the secret key's", () => {
    const { root, pkg } = workspace();
    const pair = generateKeyPair();
    writeFileSync(join(root, "k.key"), pair.secretText);
    writeFileSync(join(root, "k.pub"), generateKeyPair().publicText);
    pkg("pkgs/a", code("me"));
    const run = spawnSync(process.execPath, ["tools/widgets/sign-all.mjs", join(root, "pkgs"), "--key", join(root, "k.key")], { encoding: "utf8" });
    expect([run.status, /not this secret key's public key/.test(run.stderr)]).toEqual([2, true]);
  });
});
