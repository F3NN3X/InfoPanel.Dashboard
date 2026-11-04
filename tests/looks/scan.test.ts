import { describe, expect, it } from "vitest";
import baseline from "./scan-baseline.json";
import { RULES, counts } from "../../tools/looks/scan.mjs";

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

describe("the colour rules", () => {
  const hit = (rule: string, text: string) => new RegExp(RULES.find((r) => r.name.startsWith(rule))!.pattern.source).test(text);
  it("sees 3, 4, 6 and 8 digit hex and not a longer or shorter run", () => {
    for (const t of ["#fff", "#ffff", "#ffffff", "#ffffff80"]) expect(hit("hex", `c: "${t}"`), t).toBe(true);
    for (const t of ["#ff", "#fffff", "#fffffff"]) expect(hit("hex", `c: "${t}"`), t).toBe(false);
  });
  it("sees rgb(), rgba(), oklch() and a written-out hsl(), not a theme token or a name that ends in one", () => {
    for (const t of ["rgb(0 0 0)", "rgba(0,0,0,.5)", "oklch(0.7 0.1 20)", "hsl(38 92% 50%)"]) expect(hit("rgb/hsl", t), t).toBe(true);
    for (const t of ["hsl(var(--primary))", "hsl( var(--x) / .5)", "fooHsl(1)", "to-rgb(1)"]) expect(hit("rgb/hsl", t), t).toBe(false);
  });
});
