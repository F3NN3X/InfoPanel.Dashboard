import { describe, expect, it } from "vitest";
import { diffRuns } from "../../../tools/qa/overflow-diff.mjs";

const frame = (span, over = {}) => ({ span, issues: [], card: [0, 0, 228, 228], body: [8, 8, 212, 212], n: 40, text: "CPU 42%", view: null, ...over });
const run = (over2 = {}, over4 = {}) => ({ "Cpu@2x2": frame("2x2", over2), "Cpu@4x4": frame("4x4", over4) });

describe("diffRuns", () => {
  it("passes an identical run", () => {
    const d = diffRuns(run(), run());
    expect(d.failing).toEqual([]);
    expect(d.changes).toEqual([]);
  });

  it("fails any change at a span that is not roomy, naming the fields", () => {
    const d = diffRuns(run(), run({ body: [8, 8, 200, 212], n: 41 }));
    expect(d.failing).toEqual(["Cpu@2x2 body, n"]);
  });

  it("gives each changed field's old and new value", () => {
    const d = diffRuns(run({ text: "a" }), run({ text: "b" }));
    expect(d.details).toEqual(['Cpu@2x2 text: "a" -> "b"']);
  });

  it("reports a change at a roomy span without failing", () => {
    const d = diffRuns(run(), run({}, { text: "CPU 43%" }));
    expect(d.changes).toEqual(["Cpu@4x4 text"]);
    expect(d.failing).toEqual([]);
  });

  it("fails a new issue even at a roomy span, and lists a gone one without failing", () => {
    const issue = "exceeds|div:nth-child(1)|3|0";
    const added = diffRuns(run(), run({}, { issues: [issue] }));
    expect(added.newIssues).toEqual([`Cpu@4x4 ${issue}`]);
    expect(added.failing).toEqual([`new issue: Cpu@4x4 ${issue}`]);
    const gone = diffRuns(run({ issues: [issue] }, {}), run());
    expect(gone.goneIssues).toEqual([`Cpu@2x2 ${issue}`]);
  });

  it("fails a frame that went missing and lists one that appeared", () => {
    const d = diffRuns(run(), { "Cpu@4x4": frame("4x4"), "New@2x2": frame("2x2") });
    expect(d.failing).toEqual(["Cpu@2x2 is gone"]);
    expect(d.added).toEqual(["New@2x2"]);
  });
});
