import { describe, expect, it } from "vitest";
import { historyCsv } from "@/components/studio/alerts-history-model";
import type { AlertHistoryEntry } from "@/lib/alerts";

const row = (over: Partial<AlertHistoryEntry>): AlertHistoryEntry => ({
  id: "a",
  ruleId: "r",
  name: "GPU temp",
  severity: "warning",
  text: "",
  startedAt: 0,
  endedAt: 1000,
  ...over,
});
/** The first data row's cell at `column`, as written. */
const cell = (over: Partial<AlertHistoryEntry>, column: number) => historyCsv([row(over)], []).split("\r\n")[1].split(",")[column];

describe("historyCsv", () => {
  it("defuses text a spreadsheet would run as a formula, and leaves plain readings alone", () => {
    for (const name of ["=SUM(A1)", "+1", "-1+1", "@cmd", "\tcmd", "\rcmd", " =1", "-1 &cmd|'calc'!A"]) expect(cell({ name }, 1).replace(/^"/, "")).toMatch(/^'/);
    expect(cell({ value: "-1+cmd" }, 4)).toBe("'-1+cmd");
    expect(cell({ value: -5, unit: "°C" }, 4)).toBe("-5 °C");
    // Only a number is exempt: text that reads like one still gets the prefix.
    expect(cell({ value: "-5.5 °C" }, 4)).toBe("'-5.5 °C");
  });

  it("quotes commas, quotes, semicolons, tabs and both line ends", () => {
    expect(cell({ name: "x;=1+1" }, 1)).toBe('"x;=1+1"');
    expect(cell({ name: "a\tb" }, 1)).toBe('"a\tb"');
    expect(cell({ name: 'a"b' }, 1)).toBe('"a""b"');
    expect(historyCsv([row({ name: "a,b" })], [])).toContain('"a,b"');
    expect(historyCsv([row({ name: "a\rb" })], [])).toContain('"a\rb"');
    expect(historyCsv([row({ name: "a\nb" })], [])).toContain('"a\nb"');
  });
});
