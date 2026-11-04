import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generate } from "../../tools/looks/generate.mjs";

// The files tools/looks/generate.mjs writes: a change to the source (src/looks/, DEFAULT_THEME) without `npm run looks:gen`
// fails here, and so does a hand edit of a generated block.
const generated = await generate();

describe("the generated files", () => {
  it.each([...generated.keys()])("%s is in sync with its source", (file) => {
    const current = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(current).toBe(generated.get(file));
  });
});

describe("the hand-written CSS beside a generated block", () => {
  // A name a block writes must not be declared again by hand in the same file: the later one would win unseen.
  const BLOCK = /\/\* @generated:begin ([\w-]+)[\s\S]*?@generated:end \1 \*\//g;
  const DECLARED = /(--[\w-]+)\s*:/g;
  it.each([...generated.keys()].filter((f) => f.endsWith(".css")))("%s declares no generated name by hand", (file) => {
    const text = generated.get(file)!;
    const written = new Set([...text.matchAll(BLOCK)].flatMap((b) => [...b[0].matchAll(DECLARED)].map((m) => m[1])));
    const byHand = [...text.replace(BLOCK, "").matchAll(DECLARED)].map((m) => m[1]).filter((name) => written.has(name));
    expect(byHand).toEqual([]);
  });
});
