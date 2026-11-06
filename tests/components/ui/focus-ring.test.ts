// Tailwind v4's `outline-none` sets the outline style to none, so a `focus-visible:outline-2` beside it draws nothing: a
// keyboard user sees no focus. The pair is what FIELD_BOX and the toast buttons had; this keeps it from coming back.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SRC = fileURLToPath(new URL("../../../src", import.meta.url));

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    if (e.isDirectory()) return sources(path);
    return /\.tsx?$/.test(e.name) ? [path] : [];
  });
}

const LITERAL = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g;
const NONE = /(?:^|[\s"'`])outline-none(?=[\s"'`])/;

/** Every string or template literal of a source file that holds both classes. */
const offenders = (text: string) => (text.match(LITERAL) ?? []).filter((s) => NONE.test(s) && s.includes("focus-visible:outline-2"));

describe("focus rings", () => {
  it("no class string pairs outline-none with focus-visible:outline-2", () => {
    const found = sources(SRC).flatMap((file) => offenders(readFileSync(file, "utf8")).map((s) => `${file}: ${s.slice(0, 80)}`));
    expect(found).toEqual([]);
  });

  it("sees the pair in a string", () => {
    expect(offenders('const a = "rounded outline-none focus-visible:outline-2 x";')).toHaveLength(1);
    expect(offenders('const a = "rounded focus-visible:outline-2 x";')).toHaveLength(0);
  });
});
