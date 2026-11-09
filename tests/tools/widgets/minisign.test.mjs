// The widget package signer (tools/widgets/minisign.mjs, sign.mjs): the canonical bytes match the vector the server's
// widget_sign.rs checks too, signatures verify and break on any change, and secret key files read as minisign writes them.
// Keys here are throwaway, made at test time.
import crypto from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { canonicalBytes, generateKeyPair, readSecretKey, scryptParams, signBytes, signManifest, verifyBytes } from "../../../tools/widgets/minisign.mjs";
import { signFolder } from "../../../tools/widgets/sign.mjs";

const vector = JSON.parse(readFileSync(new URL("../../fixtures/widgets/canonical-vector.json", import.meta.url), "utf8"));
const dirs = [];
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe("canonical bytes", () => {
  it("match the shared test vector", () => {
    const bytes = canonicalBytes(vector.manifest);
    expect(bytes.toString("utf8")).toBe(vector.canonical);
    expect(crypto.createHash("sha256").update(bytes).digest("hex")).toBe(vector.sha256);
  });

  it("drop the signature, sort keys and refuse what has no canonical form", () => {
    expect(canonicalBytes({ b: 1, a: ["x", { d: true, c: null }], signature: { minisign: "s" } }).toString()).toBe(
      'infopanel-studio widget package 1\n{"a":["x",{"c":null,"d":true}],"b":1}'
    );
    for (const bad of [{ a: 1.5 }, { a: -1 }, { é: 1 }, [1], null]) expect(() => canonicalBytes(bad)).toThrow();
  });
});

describe("signing", () => {
  it("makes a minisign signature that verifies, and fails on a changed byte or another key", () => {
    const pair = generateKeyPair();
    const key = readSecretKey(pair.secretText);
    const message = Buffer.from("hello");
    const sig = signBytes(message, key, "ext:a.b 1.0.0");
    expect(sig.split("\n")[2]).toBe("trusted comment: ext:a.b 1.0.0");
    expect(verifyBytes(message, sig, pair.publicText)).toBe(true);
    expect(verifyBytes(Buffer.from("hellO"), sig, pair.publicText)).toBe(false);
    expect(verifyBytes(message, sig, generateKeyPair().publicText)).toBe(false);
    expect(() => signBytes(message, key, "two\nlines")).toThrow();
  });

  it("signs a manifest's canonical bytes, so any field it lists changes the check", () => {
    const pair = generateKeyPair();
    const signed = signManifest({ format: 1, kind: "code", id: "ext:a.b", version: "1.0.0", files: [] }, readSecretKey(pair.secretText));
    expect(verifyBytes(canonicalBytes(signed), signed.signature.minisign, pair.publicText)).toBe(true);
    expect(verifyBytes(canonicalBytes({ ...signed, version: "1.0.1" }), signed.signature.minisign, pair.publicText)).toBe(false);
  });

  it("signs a folder: the manifest lists every file with its size and hash", () => {
    const dir = mkdtempSync(join(tmpdir(), "sign-"));
    dirs.push(dir);
    writeFileSync(join(dir, "widget.js"), "export default {};\n");
    writeFileSync(join(dir, "manifest.json"), JSON.stringify({ format: 1, kind: "code", id: "ext:a.b", version: "1.0.0", files: [] }));
    const pair = generateKeyPair();
    signFolder(dir, readSecretKey(pair.secretText));
    const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
    expect(manifest.files).toEqual([{ path: "widget.js", bytes: 19, sha256: crypto.createHash("sha256").update("export default {};\n").digest("hex") }]);
    expect(verifyBytes(canonicalBytes(manifest), manifest.signature.minisign, pair.publicText)).toBe(true);
  });
});

describe("secret key files", () => {
  it("picks libsodium's scrypt parameters for minisign's and rsign's defaults", () => {
    expect(scryptParams(33554432, 1073741824)).toEqual({ N: 2 ** 20, r: 8, p: 1 });
    expect(scryptParams(1048576, 33554432)).toEqual({ N: 2 ** 15, r: 8, p: 1 });
  });

  it("reads an encrypted key with its password and refuses a wrong one", () => {
    const plain = Buffer.from(generateKeyPair().secretText.split("\n")[1], "base64");
    const [ops, mem] = [32768, 1048576 * 32];
    const { N, r, p } = scryptParams(ops, mem);
    const salt = crypto.randomBytes(32);
    const stream = crypto.scryptSync("pw", salt, 104, { N, r, p, maxmem: 256 * N * r * p });
    const head = Buffer.concat([Buffer.from("EdScB2"), salt, Buffer.alloc(16)]);
    head.writeBigUInt64LE(BigInt(ops), 38);
    head.writeBigUInt64LE(BigInt(mem), 46);
    const file = `untrusted comment: x\n${Buffer.concat([head, Buffer.from(plain.subarray(54).map((x, i) => x ^ stream[i]))]).toString("base64")}\n`;
    expect(readSecretKey(file, "pw").keyId).toEqual(plain.subarray(54, 62));
    expect(() => readSecretKey(file, "wrong")).toThrow(/wrong password/);
    expect(() => readSecretKey(file)).toThrow(/encrypted/);
  });

  it("refuses what is not a minisign Ed25519 secret key", () => {
    for (const bad of ["", "untrusted comment: x\nAAAA", `untrusted comment: x\n${Buffer.alloc(158).toString("base64")}`]) expect(() => readSecretKey(bad)).toThrow();
  });
});
