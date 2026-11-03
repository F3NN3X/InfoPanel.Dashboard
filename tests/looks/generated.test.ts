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
