import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INSTR, STATE } from "../../../src/widgets/core/theme.ts";

// STATE is the one source of the status colours, but several files keep a hand copy of its hex (look-system.md A.6).
// Each row reads one copy from its file and checks it still equals STATE, so editing STATE alone fails here
// until the copies follow (or P1/P3a replace them with the symbol).
const copies: [file: string, role: "ok" | "warn" | "crit", pattern: RegExp][] = [
  ["src/widgets/core/mixer-views.css", "warn", /--meter-warn: var\(--w-warn, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--meter-clip: var\(--w-crit, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--destructive: from var\(--w-crit, (#[0-9a-f]{6})\)/i],
  ["src/widgets/core/mixer-views.css", "crit", /--channel-mute: var\(--wl-mute, var\(--w-crit, (#[0-9a-f]{6})\)\)/i],
  ["src/lib/infopanel/gauges/vector.ts", "warn", /warn: \{[^}]*hex: "(#[0-9A-F]{6})"/i],
  ["src/lib/infopanel/gauges/vector.ts", "crit", /crit: \{[^}]*hex: "(#[0-9A-F]{6})"/i],
  ["src/widgets/OsdStrip.tsx", "warn", /DROP_WARN = "(#[0-9A-F]{6})"/i],
  ["src/widgets/OsdStrip.tsx", "crit", /DROP_CRIT = "(#[0-9A-F]{6})"/i],
  ["src/widgets/KpiTiles.tsx", "warn", /delta > 0 \? "(#[0-9A-F]{6})"/i],
  ["src/widgets/KpiTiles.tsx", "ok", /: "(#[0-9A-F]{6})" \}\}>/i],
  ["src/widgets/CoreHeatmap.tsx", "crit", /2px solid (#[0-9A-F]{6})/i],
  // The profile palette is #AARRGGBB (opaque), so the alpha byte comes off.
  ["src/lib/infopanel/elements/palette.ts", "warn", /warn: "#FF([0-9A-F]{6})"/i],
  ["src/lib/infopanel/elements/palette.ts", "crit", /crit: "#FF([0-9A-F]{6})"/i],
];

const read = (file: string): string => readFileSync(new URL(`../../../${file}`, import.meta.url), "utf8");

describe("the hand copies of STATE", () => {
  it.each(copies)("%s's %s equals STATE", (file, role, pattern) => {
    const found = pattern.exec(read(file))?.[1];
    expect(found, `${file} no longer has the copy this test reads`).toBeDefined();
    expect(`#${found!.replace("#", "")}`.toLowerCase()).toBe(STATE[role].toLowerCase());
  });

  it("includes the instrument palette's ok, warn and crit", () => {
    expect({ ok: INSTR.ok, warn: INSTR.warn, crit: INSTR.crit }).toEqual({ ok: STATE.ok, warn: STATE.warn, crit: STATE.crit });
  });
});

// Copies that differ from STATE today: none found (every copy above matches). Add any that drift here, with where, not as a skip.
