import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STATUS, STATUS_LIGHT } from "../../../src/looks/status.ts";
import { STATE } from "../../../src/widgets/core/theme.ts";

// STATUS (src/looks/status.ts) is the one source of the status colours and STATE is built from it. The widgets that
// used to keep a hex copy (OsdStrip, KpiTiles, CoreHeatmap, the theme-tone mixes, the instrument palette) read it now;
// the copies below are generated (mixer-views.css, the gauge THEME) or in another format (the profile palette), and
// each row checks one still equals STATE.
const copies: [file: string, role: "ok" | "warn" | "crit", pattern: RegExp][] = [
  ["src/widgets/core/mixer-views.css", "warn", /--meter-warn: var\(--w-warn, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--meter-clip: var\(--w-crit, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--destructive: from var\(--w-crit, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--channel-mute: var\(--wl-mute, var\(--w-crit, (#[0-9a-f]{6})\)\)/i],
  ["src/looks/generated/gauge-theme.ts", "warn", /warn: \{[^}]*hex: "(#[0-9A-F]{6})"/i],
  ["src/looks/generated/gauge-theme.ts", "crit", /crit: \{[^}]*hex: "(#[0-9A-F]{6})"/i],
  // The profile palette is #AARRGGBB (opaque), so the alpha byte comes off.
  ["src/lib/infopanel/elements/palette.ts", "warn", /warn: "#FF([0-9A-F]{6})"/i],
  ["src/lib/infopanel/elements/palette.ts", "crit", /crit: "#FF([0-9A-F]{6})"/i],
];

const read = (file: string): string => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const path = join(dir, e.name);
    return e.isDirectory() ? files(path) : /\.(tsx?|css)$/.test(e.name) ? [path.replaceAll("\\", "/")] : [];
  });

describe("the hand copies of STATE", () => {
  it.each(copies)("%s's %s equals STATE", (file, role, pattern) => {
    const found = pattern.exec(read(file))?.[1];
    expect(found, `${file} no longer has the copy this test reads`).toBeDefined();
    expect(`#${found!.replace("#", "")}`.toLowerCase()).toBe(STATE[role].toLowerCase());
  });

  it("builds STATE from STATUS", () => {
    expect({ ok: STATE.ok, warn: STATE.warn, crit: STATE.crit, none: STATE.none }).toEqual({ ok: STATUS.ok, warn: STATUS.warn, crit: STATUS.crit, none: STATUS.none });
  });

  it("is typed as a literal nowhere else in src", () => {
    // A new hex copy of a status colour fails here: import STATE (widgets) or STATUS (everything else) instead.
    const status = new RegExp(`#(${[STATUS.ok, STATUS.warn, STATUS.crit, STATUS_LIGHT.warn, STATUS_LIGHT.crit].map((c) => c.slice(1)).join("|")})\\b`, "i");
    const allowed = ["src/looks/", "src/widgets/core/mixer-views.css"];
    const copies = files("src").filter((f) => !allowed.some((a) => f.startsWith(a)) && status.test(readFileSync(f, "utf8")));
    expect(copies).toEqual([]);
  });
});
