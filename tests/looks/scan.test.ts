import { describe, expect, it } from "vitest";
import baseline from "./scan-baseline.json";
import { counts } from "../../tools/looks/scan.mjs";

// The D9 scans (tools/looks/scan.mjs) as a ratchet: a file may carry no more hand-typed hex colours, blur or ui-* tokens
// than the baseline lists, and a file the baseline lacks carries none. Lower a count with the change that removes the
// literal (`node tools/looks/scan.mjs --save`); never raise one: use a token from the Look instead.
const now = counts();

describe.each(Object.entries(now))("%s", (rule, perFile) => {
  const allowed = (baseline as Record<string, Record<string, number>>)[rule] ?? {};

  it("stays within the baseline", () => {
    const over = Object.entries(perFile).filter(([f, n]) => n > (allowed[f] ?? 0)).map(([f, n]) => `${f}: ${n} > ${allowed[f] ?? 0}`);
    expect(over).toEqual([]);
  });

  it("has no baseline entry the tree has paid off", () => {
    const stale = Object.entries(allowed).filter(([f, n]) => (perFile[f] ?? 0) < n).map(([f, n]) => `${f}: ${perFile[f] ?? 0} < ${n}`);
    expect(stale, "lower tests/looks/scan-baseline.json with `node tools/looks/scan.mjs --save`").toEqual([]);
  });
});
