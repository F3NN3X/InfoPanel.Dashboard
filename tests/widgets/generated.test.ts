import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generate } from "../../tools/widgets/generate.mjs";

// The files tools/widgets/generate.mjs writes from the widget folders: a folder added, removed or changed (its meta.ts or
// README.md) without `npm run widgets:gen` fails here, and so does a hand edit of a generated file or block.
const generated = await generate();

describe("the generated widget files", () => {
  it.each([...generated.keys()])("%s is in sync with the widget folders", (file) => {
    const current = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");
    expect(current).toBe(generated.get(file));
  });
});
