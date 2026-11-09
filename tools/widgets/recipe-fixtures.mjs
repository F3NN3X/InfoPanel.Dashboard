#!/usr/bin/env node
// Writes the manifest of each recipe fixture package (tests/fixtures/recipes/<name>/): every file but the manifest, in path order,
// with its size and SHA-256, as the studio's export does (src/widgets/recipe/package.ts). Run after editing a fixture's recipe.json or
// images; tests/widgets/recipe/fixtures.test.ts fails on a manifest that no longer matches its files.
//   node tools/widgets/recipe-fixtures.mjs
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const DIR = join(ROOT, "tests/fixtures/recipes");

/** A package's files but its manifest, by path from the package folder. */
function filesOf(root) {
  const images = existsSync(join(root, "images")) ? readdirSync(join(root, "images")).map((f) => `images/${f}`) : [];
  return ["recipe.json", ...images].sort().map((path) => ({ path, bytes: readFileSync(join(root, path)) }));
}

export function manifestOf(root) {
  const recipe = JSON.parse(readFileSync(join(root, "recipe.json"), "utf8"));
  const files = filesOf(root).map((f) => ({ path: f.path, bytes: f.bytes.length, sha256: createHash("sha256").update(f.bytes).digest("hex") }));
  return `${JSON.stringify({ format: 1, kind: "recipe", id: recipe.id, version: recipe.version, author: recipe.author, name: recipe.name, files }, null, 2)}\n`;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  for (const name of readdirSync(DIR, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)) {
    writeFileSync(join(DIR, name, "manifest.json"), manifestOf(join(DIR, name)));
    console.log(`${name}: manifest written`);
  }
}
