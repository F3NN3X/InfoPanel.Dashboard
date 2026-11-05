import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { neededOf } from "../../tools/looks/ui-usage.mjs";

const ALL = ["bg-app", "bg-panel", "text-1", "text-2", "ok"];

describe("neededOf", () => {
  it("keeps the tokens a page names", () => {
    expect(neededOf(["--ui-bg-app", "--ui-ok", "--ui-h-control"], ALL)).toEqual(["bg-app", "ok"]);
  });

  it("keeps every token under a prefix a script builds the rest of", () => {
    expect(neededOf(["--ui-text-"], ALL)).toEqual(["text-1", "text-2"]);
  });

  it("keeps none for a page that reads none", () => {
    expect(neededOf([], ALL)).toEqual([]);
  });
});

describe("the pages' token files", () => {
  const usage = JSON.parse(readFileSync(new URL("../../tools/looks/ui-usage.json", import.meta.url), "utf8")) as Record<string, string[]>;
  it.each(Object.keys(usage))("%s declares each token it reads and no other", (page) => {
    const css = readFileSync(new URL(`../../src/settings/ui/${page}.css`, import.meta.url), "utf8");
    const declared = [...css.matchAll(/^\s+--ui-([\w-]+):/gm)].map((m) => m[1]);
    expect(declared.sort()).toEqual([...usage[page]].sort());
  });
});
