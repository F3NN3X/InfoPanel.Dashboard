// The studio chrome's contrast, read from the CSS the app ships: a control boundary that carries meaning keeps 3:1 and the
// three text steps keep 4.5:1 on the surfaces they sit on. The pinned fixture (ui-tokens-p4.json) cannot catch a token that
// moves, because it is regenerated with the tokens.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastOf } from "@/looks/status";

const ui: Record<string, string> = {};
for (const file of ["../../src/index.css", "../../src/settings/tokens.css", "../../src/settings/ui/studio.css"]) {
  for (const m of readFileSync(new URL(file, import.meta.url), "utf8").matchAll(/^\s*--ui-([\w-]+):\s*([^;]+);/gm)) ui[m[1]] = m[2].trim();
}
const SURFACES = ["bg-app", "bg-panel", "bg-tile", "bg-raised"] as const;
const ratio = (fg: string, bg: string) => contrastOf(ui[fg], ui[bg]) ?? 0;

describe("the chrome tokens' contrast", () => {
  it.each(SURFACES)("the control border is 3:1 on %s", (bg) => {
    expect(ratio("border-control", bg)).toBeGreaterThanOrEqual(3);
  });

  it.each(["text-1", "text-2", "text-hint"])("%s is 4.5:1 on every surface", (fg) => {
    for (const bg of SURFACES) expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("secondary text, which a highlighted row's hints use, is 4.5:1 on the active step", () => {
    expect(ratio("text-2", "bg-active")).toBeGreaterThanOrEqual(4.5);
  });
});
