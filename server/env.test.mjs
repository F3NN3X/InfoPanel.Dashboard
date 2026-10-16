import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readVersion, resolveDataDir, resolveDist } from "./env.mjs";

describe("env overrides", () => {
  it("keeps the default unless the variable is set", () => {
    expect(resolveDist({}, "/app/dist")).toBe("/app/dist");
    expect(resolveDist({ DASHBOARD_DIST: "" }, "/app/dist")).toBe("/app/dist");
    expect(resolveDataDir({}, "/data")).toBe("/data");
  });
  it("resolves a set variable to an absolute path", () => {
    expect(resolveDist({ DASHBOARD_DIST: "res/dist" }, "/app/dist")).toBe(path.resolve("res/dist"));
    expect(resolveDataDir({ DASHBOARD_DATA_DIR: "tmp" }, "/data")).toBe(path.resolve("tmp"));
  });
});

describe("readVersion", () => {
  it("reads package.json's version and falls back to 0.0.0", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ipd-ver-"));
    try {
      const file = path.join(dir, "package.json");
      expect(readVersion(file)).toBe("0.0.0");
      fs.writeFileSync(file, "{ nope");
      expect(readVersion(file)).toBe("0.0.0");
      fs.writeFileSync(file, JSON.stringify({ name: "x" }));
      expect(readVersion(file)).toBe("0.0.0");
      fs.writeFileSync(file, JSON.stringify({ version: "1.2.3" }));
      expect(readVersion(file)).toBe("1.2.3");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
