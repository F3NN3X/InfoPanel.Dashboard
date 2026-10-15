import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// No test imports server.mjs (it starts listening), so a syntax error there would pass the suite.
describe("server files parse", () => {
  const files = ["server.mjs", ...fs.readdirSync(path.join(root, "server")).filter((f) => f.endsWith(".mjs")).map((f) => path.join("server", f))];
  it.each(files)("%s", (file) => {
    const run = spawnSync(process.execPath, ["--check", path.join(root, file)], { encoding: "utf8" });
    expect(run.stderr).toBe("");
    expect(run.status).toBe(0);
  });
});
